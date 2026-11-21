/** Calls the Gemini Developer API and validates its wire responses with one schema retry. */
import { GoogleGenAI, type Interactions } from "@google/genai";
import { z } from "zod";

export class PipelineFailure extends Error {}

export function geminiClients() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new PipelineFailure("GEMINI_API_KEY is missing. Set it on the server to run device analysis.");
  return {
    interactions: new GoogleGenAI({ apiKey, apiVersion: "v1", vertexai: false }).interactions,
    decisions: new GoogleGenAI({ apiKey, apiVersion: "v1beta", vertexai: false }).decisions,
  };
}

export type GeminiClients = ReturnType<typeof geminiClients>;
type InteractionRequest = Interactions.CreateModelInteractionParamsNonStreaming;

export function providerFailure(error: unknown): string {
  if (error instanceof PipelineFailure) return error.message;
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  switch (status) {
    case 400: return "Gemini rejected the request. Check the capture and model configuration.";
    case 401:
    case 403: return "Gemini denied access. Check the server key and its model permissions.";
    case 404: return "This Gemini model is unavailable to the configured project.";
    case 429: return "Gemini is rate limited or out of quota. Try again shortly.";
    case 500:
    case 502:
    case 503:
    case 504: return "Gemini is temporarily unavailable. Try again shortly.";
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
    const value = await request(correction);
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

async function readInteraction(
  client: GeminiClients["interactions"],
  request: InteractionRequest,
  signal: AbortSignal,
  onThought?: (text: string) => void,
): Promise<{ text: string | null; id?: string }> {
  if (!onThought) {
    const result = await client.create({ ...request, stream: false, automatic_continuation: false }, { signal });
    if (result.status === "incomplete") return { text: null };
    if (result.status !== "completed") throw new PipelineFailure("Gemini could not complete this stage.");
    return { text: result.output_text ?? null, id: result.id };
  }

  const stream = await client.create({ ...request, stream: true, automatic_continuation: false }, { signal });
  let id: string | undefined;
  let text = "";
  for await (const event of stream) {
    signal.throwIfAborted();
    switch (event.event_type) {
      case "interaction.created":
        id = event.interaction?.id;
        break;
      case "step.delta":
        if (event.delta?.type === "text") text += event.delta.text ?? "";
        if (event.delta?.type === "thought_summary" && event.delta.content?.type === "text") {
          const thought = thoughtText.safeParse(event.delta.content.text);
          if (thought.success) onThought(thought.data);
        }
        break;
      case "interaction.completed":
        if (event.interaction?.status === "incomplete") return { text: null };
        if (event.interaction?.status !== "completed") throw new PipelineFailure("Gemini could not complete this stage.");
        return { text, id: event.interaction.id ?? id };
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
