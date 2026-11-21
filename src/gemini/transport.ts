/** Calls Gemini and validates each stage with a bounded retry budget. */
import { setTimeout as delay } from "node:timers/promises";
import { GoogleGenAI, type Interactions } from "@google/genai";
import { z } from "zod";

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

function httpStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
    return error.status;
  }
}

function isServerError(status: number | undefined): boolean {
  return status !== undefined && status >= 500 && status < 600;
}

export async function waitForRetry(error: unknown, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const status = httpStatus(error);
  if (status !== 429 && !isServerError(status)) throw error;
  await delay(350, undefined, { signal });
}

export function providerFailure(error: unknown): string {
  if (error instanceof PipelineFailure) return error.message;
  const status = httpStatus(error);
  // Server-side diagnostics only: the provider's own words never reach the browser.
  console.error("[gemini] provider error", status ?? "", error instanceof Error ? error.message.slice(0, 600) : String(error).slice(0, 600));
  if (isServerError(status)) return "Gemini is temporarily unavailable. Try again shortly.";
  switch (status) {
    case 400: return "Gemini rejected the request. Check the capture and model configuration.";
    case 401:
    case 403: return "Gemini denied access. Check the server key and its model permissions.";
    case 404: return "This Gemini model is unavailable to the configured project.";
    case 429: return "Gemini is rate limited or out of quota. Try again shortly.";
    default: return "This stage could not finish. Try the capture again.";
  }
}

export async function validated<T>(
  schema: z.ZodType<T>,
  signal: AbortSignal,
  request: (correction?: string) => Promise<unknown>,
): Promise<T> {
  let correction: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    signal.throwIfAborted();
    let value: unknown;
    try {
      value = await request(correction);
    } catch (error) {
      if (attempt > 0) throw error;
      await waitForRetry(error, signal);
      continue;
    }
    signal.throwIfAborted();
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    const fields = result.error.issues.slice(0, 4).map((issue) => issue.path.join(".") || "response");
    correction = `Check the declared response schema carefully, especially: ${fields.join(", ")}.`;
  }
  throw new PipelineFailure("Gemini returned an invalid response twice. Try the capture again.");
}

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

async function readInteraction(
  client: GeminiClients["interactions"],
  request: InteractionRequest,
  signal: AbortSignal,
  onThought?: (text: string) => void,
): Promise<{ text: string | null; id?: string }> {
  const options = { signal, retries: noSdkRetries };
  if (!onThought) {
    const result = await client.create({ ...request, stream: false, automatic_continuation: false }, options);
    if (result.status === "incomplete") return { text: null };
    if (result.status !== "completed") throw new PipelineFailure("Gemini could not complete this stage.");
    return { text: interactionText(result), id: result.id };
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
        if (interaction?.status === "incomplete") return { text: null };
        if (interaction?.status !== "completed") throw new PipelineFailure("Gemini could not complete this stage.");
        id = interaction.id?.trim() || id?.trim();
        const output = text.trim() ? text : interactionText(interaction);
        if (output?.trim() || !id || request.store === false) return { text: output, id };
        // Lifecycle events can omit the completed interaction's steps.
        const stored = await client.get(id, {}, options);
        return { text: stored.status === "completed" ? interactionText(stored) : null, id };
      }
      case "error":
        throw new PipelineFailure("Gemini interrupted this stage. Try the capture again.");
    }
  }
  throw new PipelineFailure("The Gemini stream ended early. Try the capture again.");
}

export function structuredInteraction<T>(
  client: GeminiClients["interactions"],
  schema: z.ZodType<T>,
  request: InteractionRequest,
  signal: AbortSignal,
  onThought?: (text: string) => void,
): Promise<{ value: T; interactionId?: string }> {
  const format = { type: "text", mime_type: "application/json", schema: providerSchema(schema) } as const;
  let interactionId: string | undefined;
  return validated(schema, signal, async (correction) => {
    const response = await readInteraction(client, {
      ...request,
      system_instruction: [request.system_instruction, correction].filter(Boolean).join("\n"),
      response_format: format,
    }, signal, onThought);
    interactionId = response.id;
    return jsonValue(response.text);
  }).then((value) => ({ value, interactionId }));
}
