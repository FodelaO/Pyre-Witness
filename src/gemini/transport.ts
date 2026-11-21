/** Calls Gemini and validates each stage with a bounded retry budget. */
import { setTimeout as delay } from "node:timers/promises";
import { AsyncLocalStorage } from "node:async_hooks";
import { GoogleGenAI, type Interactions } from "@google/genai";
import { z } from "zod";
import type { TranscriptEntry } from "@/pipeline/types";
import { recordGeminiTranscript, transcriptInput } from "./transcript";
import { geminiUsage, reportGeminiUsage } from "./usage";

export class PipelineFailure extends Error {}

export function geminiClients() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new PipelineFailure("GEMINI_API_KEY is missing. Set it on the server to run device analysis.");
  return {
    // v1beta: the stable v1 surface rejects multimodal content parts passed directly as `input`
    // ("'text' is not supported for input[0].type in v1"); verified live on 2026-11-21.
    interactions: new GoogleGenAI({ apiKey, apiVersion: "v1beta", vertexai: false }).interactions,
    decisions: new GoogleGenAI({ apiKey, apiVersion: "v1beta", vertexai: false }).decisions,
  };
}

export type GeminiClients = ReturnType<typeof geminiClients>;
type InteractionRequest = Interactions.CreateModelInteractionParamsNonStreaming;

// The stage owns retries and its deadline, so the SDK must not retry the same request.
export const noSdkRetries = { strategy: "none" } as const;
export const MODEL_ATTEMPTS = 3;

function fields(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function httpStatus(error: unknown): number | undefined {
  const { status, statusCode } = fields(error);
  if (typeof status === "number") return status;
  if (typeof statusCode === "number") return statusCode;
}

function isServerError(status: number | undefined): boolean {
  return status !== undefined && status >= 500 && status < 600;
}

function errorChain(error: unknown): Error[] {
  const chain: Error[] = [];
  for (let item = error; item instanceof Error && chain.length < 5 && !chain.includes(item); item = item.cause) {
    chain.push(item);
  }
  return chain;
}

const CONNECTION_CODES = new Set([
  "EAI_AGAIN", "ECONNABORTED", "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "EPIPE",
  "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT", "UND_ERR_SOCKET",
]);

function isConnectionFailure(error: unknown): boolean {
  const chain = errorChain(error);
  if (chain.some(({ name }) => name === "InvalidRequestError" || name === "AbortError"
    || name === "APIUserAbortError" || name === "RequestAbortedError")) return false;
  // The public SDK does not export its transport classes. Node also wraps socket
  // failures in fetch TypeErrors, including errors raised after stream headers.
  return chain.some((item) => item.name === "APIConnectionError" || item.name === "APIConnectionTimeoutError"
    || item.name === "ConnectionError" || item instanceof GeminiStreamConnectionError
    || (typeof fields(item).code === "string" && CONNECTION_CODES.has(String(fields(item).code)))
    || (item instanceof TypeError && /^(?:fetch failed|failed to fetch|terminated)$/i.test(item.message)));
}

function retryAfterMs(error: unknown): number {
  const headers = fields(error).headers;
  const value = (headers instanceof Headers ? headers.get("retry-after") : fields(headers)["retry-after"]);
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

interface ProviderDiagnostic {
  name: string;
  status?: number;
  code?: string;
  message: string;
  body?: string;
}

type ProviderObserver = (event: "retry" | "failure", diagnostic: ProviderDiagnostic) => void;
const diagnostics = new AsyncLocalStorage<ProviderObserver>();

export function withGeminiDiagnostics<T>(observe: ProviderObserver, work: () => T): T {
  return diagnostics.run(observe, work);
}

function redact(value: string, max: number): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  return (key ? value.replaceAll(key, "[redacted]") : value)
    .replace(/AIza[\w-]{35}/g, "[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, max);
}

/** Keeps the HTTP status and nested transport cause available without request data or credentials. */
export function providerDiagnostic(error: unknown): ProviderDiagnostic {
  const chain = errorChain(error);
  const { body, error: payload } = fields(error);
  const code = [...chain.map((item) => fields(item).code), fields(payload).code, fields(fields(payload).error).code]
    .find((item): item is string => typeof item === "string");
  const message = chain.length ? [...new Set(chain.map(({ message }) => message).filter(Boolean))].join(" · ")
    : typeof error === "string" ? error : "Unknown provider error";
  const status = httpStatus(error);
  return {
    name: error instanceof InvalidGeminiResponse ? "InvalidGeminiResponse" : chain[0]?.name ?? "ProviderError",
    status,
    code: code === undefined ? undefined : redact(code, 100),
    message: redact(message, 600),
    body: status === 400 && typeof body === "string" && body ? redact(body, 2400) : undefined,
  };
}

type AttemptEntry = Omit<TranscriptEntry, "response" | "usage" | "latencyMs" | "thoughts">;

/** Records the real attempt once, including an unanswered request interrupted by its deadline. */
export async function transcriptAttempt<T>(
  entry: AttemptEntry,
  work: () => Promise<T>,
  responseFor: (result: T) => TranscriptEntry["response"],
  usageFor?: (result: T) => Interactions.Usage | undefined,
  signal?: AbortSignal,
  thoughts?: string[],
): Promise<T> {
  signal?.throwIfAborted();
  const started = performance.now();
  // The deadline may be triggered outside the run's AsyncLocalStorage context.
  const report = AsyncLocalStorage.bind(recordGeminiTranscript);
  let recorded = false;
  const record = (data: Pick<TranscriptEntry, "response" | "usage" | "note">) => {
    if (recorded) return;
    recorded = true;
    report({ ...entry, ...data, latencyMs: Math.round(performance.now() - started),
      thoughts: thoughts?.length ? thoughts : undefined });
  };
  let stop: (() => void) | undefined;
  const interrupted = signal ? new Promise<never>((_, reject) => {
    stop = () => {
      record({ note: [entry.note, "Call interrupted by deadline or cancellation"].filter(Boolean).join(". ") });
      reject(signal.reason);
    };
    signal.addEventListener("abort", stop, { once: true });
  }) : undefined;
  let result: T;
  try {
    const pending = work();
    result = await (interrupted ? Promise.race([pending, interrupted]) : pending);
  } catch (error) {
    const { status, code, name } = providerDiagnostic(error);
    const issue = signal?.aborted ? "Call interrupted by deadline or cancellation" : `Call failed (${status === undefined ? code ?? name : `HTTP ${status}`})`;
    record({ note: [entry.note, issue].filter(Boolean).join(". ") });
    throw error;
  } finally {
    if (stop) signal?.removeEventListener("abort", stop);
  }
  const reported = geminiUsage(usageFor?.(result));
  const usage = reported ? { inputTokens: reported.inputTokens, outputTokens: reported.outputTokens,
    thoughtTokens: reported.thoughtTokens, totalTokens: reported.totalTokens } : undefined;
  record({ response: responseFor(result), usage, note: entry.note });
  return result;
}

export async function waitForRetry(error: unknown, signal: AbortSignal, attemptIndex = 0): Promise<void> {
  signal.throwIfAborted();
  const status = httpStatus(error);
  if (status !== 429 && !isServerError(status) && !(status === undefined && isConnectionFailure(error))) throw error;
  diagnostics.getStore()?.("retry", providerDiagnostic(error));
  const base = attemptIndex === 0 ? 250 : 500;
  const wait = Math.max(base, retryAfterMs(error)) + Math.floor(Math.random() * base);
  // Node otherwise converts delays above the timer limit into a one-millisecond wait.
  const maxTimer = 2_147_483_647;
  for (let remaining = wait; remaining > 0; remaining -= maxTimer) {
    await delay(Math.min(remaining, maxTimer), undefined, { signal });
  }
}

export function providerFailure(error: unknown): string {
  const diagnostic = providerDiagnostic(error);
  diagnostics.getStore()?.("failure", diagnostic);
  if (error instanceof PipelineFailure) return error.message;
  // Server-side diagnostics only: the provider's own words never reach the browser.
  const { status, code, message, body } = diagnostic;
  console.error("[gemini] provider error", status ?? "", code ? `${code} · ${message}` : message, ...(body ? [{ body }] : []));
  if (isServerError(status)) return "Gemini is temporarily unavailable. Try again shortly.";
  switch (status) {
    case 400: return "Gemini rejected the request. Check the capture and model configuration.";
    case 401:
    case 403: return "Gemini denied access. Check the server key and its model permissions.";
    case 404: return "This Gemini model is unavailable to the configured project.";
    case 429: return "Gemini is rate limited or out of quota. Try again shortly.";
    default: return isConnectionFailure(error)
      ? "The connection to Gemini failed. Try the capture again."
      : "This stage could not finish. Try the capture again.";
  }
}

export async function validated<T>(
  schema: z.ZodType<T>,
  signal: AbortSignal,
  request: (correction?: string) => Promise<unknown>,
  options: { attempts?: number; onValidRaw?: (value: unknown) => void } = {},
): Promise<T> {
  const attempts = options.attempts ?? MODEL_ATTEMPTS;
  let correction: string | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    signal.throwIfAborted();
    let value: unknown;
    try {
      value = await request(correction);
    } catch (error) {
      if (attempt + 1 === attempts) throw error;
      await waitForRetry(error, signal, attempt);
      continue;
    }
    signal.throwIfAborted();
    const result = schema.safeParse(value);
    if (result.success) {
      options.onValidRaw?.(value);
      return result.data;
    }
    const fields = result.error.issues.slice(0, 4).map((issue) => issue.path.join(".") || "response");
    console.warn("[gemini] response schema mismatch", fields.join(", "));
    if (correction || attempt + 1 === attempts) {
      throw new InvalidGeminiResponse("Gemini returned an invalid structured response. Try the capture again.");
    }
    correction = `Check the declared response schema carefully, especially: ${fields.join(", ")}.`;
  }
  throw new InvalidGeminiResponse("Gemini returned an invalid structured response. Try the capture again.");
}

export class InvalidGeminiResponse extends PipelineFailure {}
class GeminiStreamConnectionError extends Error {}

const STREAM_ERROR_STATUS: Readonly<Record<string, number>> = {
  invalid_argument: 400, invalid_request: 400, rate_limit_exceeded: 429, resource_exhausted: 429,
  internal: 500, internal_server_error: 500, unavailable: 503, service_unavailable: 503,
  deadline_exceeded: 504, gateway_timeout: 504,
};

function jsonValue(text: string | null | undefined): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function providerSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-07", io: "input" });
  const unsupported = new Set(["$schema", "minLength", "maxLength", "maxItems"]);
  return JSON.parse(JSON.stringify(json, (key, value) => {
    if (unsupported.has(key)) return undefined;
    if (value && typeof value === "object" && Object.hasOwn(value, "const")) {
      const { const: literal, ...rest } = value;
      return { ...rest, enum: [literal] };
    }
    return value;
  }));
}

const thoughtText = z.string().min(1);

function interactionText(interaction: { steps?: Interactions.Step[] }): string | null {
  if ("output_text" in interaction && typeof interaction.output_text === "string" && interaction.output_text.trim()) {
    return interaction.output_text;
  }
  const output = interaction.steps?.findLast((step) => step.type === "model_output");
  return output?.content?.map((part) => part.type === "text" ? part.text : "").join("") || null;
}

function interactionThoughts(interaction: { steps?: Interactions.Step[] }): string[] {
  return interaction.steps?.flatMap((step) => step.type === "thought"
    ? step.summary?.flatMap((part) => part.type === "text" && part.text ? [part.text] : []) ?? []
    : []) ?? [];
}

interface InteractionResponse {
  text: string | null;
  id?: string;
  usage?: Interactions.Usage;
  retrieve?: boolean;
}

async function readInteraction(
  client: GeminiClients["interactions"],
  request: InteractionRequest,
  signal: AbortSignal,
  onThought?: (text: string) => void,
  collectedThoughts?: string[],
): Promise<InteractionResponse> {
  const options = { signal, retries: noSdkRetries };
  if (!onThought) {
    const result = await client.create({ ...request, stream: false, automatic_continuation: false }, options);
    if (collectedThoughts) collectedThoughts.push(...interactionThoughts(result));
    reportGeminiUsage(request.model, result.usage);
    if (result.status === "incomplete") return { text: null, usage: result.usage };
    if (result.status !== "completed") throw new PipelineFailure("Gemini could not complete this stage.");
    return { text: interactionText(result), id: result.id, usage: result.usage };
  }

  const stream = await client.create({ ...request, stream: true, automatic_continuation: false }, options);
  let id: string | undefined;
  let text = "";
  for await (const event of stream) {
    signal.throwIfAborted();
    switch (event.event_type) {
      case "interaction.created":
        id = event.interaction?.id;
        break;
      case "interaction.status_update":
        id ||= event.interaction_id;
        break;
      case "step.delta":
        if (event.delta?.type === "text") text += event.delta.text ?? "";
        if (event.delta?.type === "thought_summary" && event.delta.content?.type === "text") {
          const thought = thoughtText.safeParse(event.delta.content.text);
          if (thought.success) onThought(thought.data);
        }
        break;
      case "interaction.completed": {
        const interaction = event.interaction;
        if (collectedThoughts && !collectedThoughts.length && interaction) collectedThoughts.push(...interactionThoughts(interaction));
        reportGeminiUsage(request.model, interaction?.usage);
        if (interaction?.status === "incomplete") return { text: null, usage: interaction.usage };
        if (interaction?.status !== "completed") throw new PipelineFailure("Gemini could not complete this stage.");
        id = interaction.id?.trim() || id?.trim();
        const output = text.trim() ? text : interactionText(interaction);
        // Lifecycle events can omit the completed interaction's steps.
        const retrieve = !output?.trim() && Boolean(id) && request.store !== false;
        return { text: output, id, usage: interaction.usage, retrieve };
      }
      case "error": {
        const code = event.error?.code;
        throw Object.assign(new Error(event.error?.message ?? "Gemini interrupted this stage."), {
          code,
          status: code && Object.hasOwn(STREAM_ERROR_STATUS, code.toLowerCase())
            ? STREAM_ERROR_STATUS[code.toLowerCase()] : undefined,
          body: event.error ? JSON.stringify(event.error) : undefined,
        });
      }
    }
  }
  throw new GeminiStreamConnectionError("The Gemini stream ended before completion.");
}

interface StructuredTranscript {
  stage: TranscriptEntry["stage"];
  crew: TranscriptEntry["crew"];
  schema: string;
  note?: string;
  response?: "text";
}

function responseFields(response: InteractionResponse, transcript: StructuredTranscript): TranscriptEntry["response"] {
  if (response.text === null || response.text.length === 0) return;
  const json = transcript.response === "text" ? undefined : jsonValue(response.text);
  return json === undefined ? { text: response.text } : { json };
}

export function structuredInteraction<T>(
  client: GeminiClients["interactions"],
  schema: z.ZodType<T>,
  request: InteractionRequest,
  signal: AbortSignal,
  onThought?: (text: string) => void,
  options?: NonNullable<Parameters<typeof validated<T>>[3]> & { transcript?: StructuredTranscript },
): Promise<{ value: T; interactionId?: string }> {
  const format = { type: "text", mime_type: "application/json", schema: providerSchema(schema) } as const;
  let interactionId: string | undefined;
  let attempt = 0;
  let failedStatus: number | undefined;
  const { transcript } = options ?? {};
  return validated(schema, signal, async (correction) => {
    const sent = {
      ...request,
      system_instruction: [request.system_instruction, correction].filter(Boolean).join("\n"),
      response_format: format,
    };
    const thoughts: string[] = [];
    const handleThought = onThought && ((thought: string) => {
      if (transcript) thoughts.push(thought);
      onThought(thought);
    });
    const retryReason = failedStatus !== undefined ? ` after HTTP ${failedStatus}` : correction ? " after schema mismatch" : " after connection failure";
    const note = [transcript?.note, attempt > 0 ? `Retry ${attempt}${retryReason}` : undefined].filter(Boolean).join(". ");
    attempt += 1;
    const entry: AttemptEntry | undefined = transcript && {
      stage: transcript.stage, crew: transcript.crew, engine: sent.model,
      thinkingLevel: sent.generation_config?.thinking_level,
      request: { ...transcriptInput(sent.input), system: sent.system_instruction, schema: transcript.schema },
      note: note || undefined,
    };
    const read = () => readInteraction(client, sent, signal, handleThought, transcript ? thoughts : undefined);
    try {
      const response = entry && transcript
        ? await transcriptAttempt(entry, read, (value) => responseFields(value, transcript), (value) => value.usage, signal, thoughts)
        : await read();
      interactionId = response.id;
      if (response.retrieve && interactionId) {
        const id = interactionId;
        const retrieve = async (): Promise<InteractionResponse> => {
          const stored = await client.get(id, {}, { signal, retries: noSdkRetries });
          if (!response.usage) reportGeminiUsage(request.model, stored.usage);
          return { text: stored.status === "completed" ? interactionText(stored) : null, usage: stored.usage };
        };
        const retrieved = entry && transcript ? await transcriptAttempt({
          ...entry, request: { text: id, schema: transcript.schema }, note: "Retrieved the completed interaction output",
        }, retrieve, (value) => responseFields(value, transcript), (value) => value.usage, signal) : await retrieve();
        return jsonValue(retrieved.text);
      }
      return jsonValue(response.text);
    } catch (error) {
      failedStatus = httpStatus(error);
      throw error;
    }
  }, options).then((value) => ({ value, interactionId }));
}
