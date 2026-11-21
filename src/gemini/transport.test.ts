/** Checks structured-output recovery and the stage retry budget using offline SDK fixtures. */
import { GoogleGenAI } from "@google/genai";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { MODEL_IDS } from "./models";
import { structuredInteraction, validated, type GeminiClients } from "./transport";

const schema = z.object({ ready: z.boolean() });
const request = { model: MODEL_IDS.reasoning, input: "Fixture", store: true };
const signal = () => new AbortController().signal;

function streamClient(events: object[], stored?: object) {
  const create = vi.fn(async function* () { yield* events; });
  const get = vi.fn().mockResolvedValue(stored);
  return { client: { create, get } as unknown as GeminiClients["interactions"], create, get };
}

afterEach(() => vi.unstubAllGlobals());

it.each([
  { output_text: '{"ready":true}' },
  { steps: [{ type: "model_output", content: [{ type: "text", text: '{"ready":' }, { type: "text", text: "true}" }] }] },
])("reads completion output when the stream has no text deltas", async (output) => {
  const { client, create, get } = streamClient([
    { event_type: "step.delta", delta: { type: "thought_summary", content: { type: "text", text: "Reviewing evidence" } } },
    { event_type: "interaction.completed", interaction: { status: "completed", ...output } },
  ]);
  const onThought = vi.fn();
  const result = await structuredInteraction(client, schema, request, signal(), onThought);
  expect(result).toEqual({ value: { ready: true }, interactionId: undefined });
  expect(onThought).toHaveBeenCalledExactlyOnceWith("Reviewing evidence");
  expect(create).toHaveBeenCalledTimes(1);
  expect(get).not.toHaveBeenCalled();
});

it("reads the stored interaction when completion contains only metadata", async () => {
  const { client, get } = streamClient([
    { event_type: "interaction.created", interaction: { id: "v1_run" } },
    { event_type: "interaction.completed", interaction: { status: "completed" } },
  ], { status: "completed", output_text: '{"ready":true}' });
  const abortSignal = signal();
  const result = await structuredInteraction(client, schema, request, abortSignal, vi.fn());
  expect(result).toEqual({ value: { ready: true }, interactionId: "v1_run" });
  expect(get).toHaveBeenCalledExactlyOnceWith("v1_run", {}, { signal: abortSignal, retries: { strategy: "none" } });
});

it("preserves text deltas and uses the final interaction ID", async () => {
  const { client, get } = streamClient([
    { event_type: "interaction.created", interaction: { id: "created" } },
    { event_type: "step.delta", delta: { type: "text", text: '{"ready":' } },
    { event_type: "step.delta", delta: { type: "text", text: "true}" } },
    { event_type: "interaction.completed", interaction: { status: "completed", id: "finished" } },
  ]);
  await expect(structuredInteraction(client, schema, request, signal(), vi.fn())).resolves.toEqual({
    value: { ready: true }, interactionId: "finished",
  });
  expect(get).not.toHaveBeenCalled();
});

it("retries an HTTP 429 once through the SDK with SDK retries disabled", async () => {
  const denied = Response.json({ error: { code: 429, message: "Fixture", status: "RESOURCE_EXHAUSTED" } }, { status: 429 });
  const accepted = Response.json({
    id: "id", status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: '{"ready":true}' }] }],
  });
  const fetch = vi.fn().mockResolvedValueOnce(denied).mockResolvedValueOnce(accepted);
  vi.stubGlobal("fetch", fetch);
  const { interactions } = new GoogleGenAI({ apiKey: "offline-test-placeholder", apiVersion: "v1", vertexai: false });
  await expect(structuredInteraction(interactions, schema, request, signal())).resolves.toMatchObject({ value: { ready: true } });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("spends at most one retry on 5xx failures and immediately rejects a permanent error", async () => {
  const unavailable = Object.assign(new Error("Offline fixture"), { status: 503 });
  const transient = vi.fn().mockRejectedValue(unavailable);
  await expect(validated(schema, signal(), transient)).rejects.toBe(unavailable);
  expect(transient).toHaveBeenCalledTimes(2);

  const badRequest = Object.assign(new Error("Offline fixture"), { status: 400 });
  const permanent = vi.fn().mockRejectedValue(badRequest);
  await expect(validated(schema, signal(), permanent)).rejects.toBe(badRequest);
  expect(permanent).toHaveBeenCalledTimes(1);
});

it("reprompts a schema mismatch once and aborts an HTTP retry during backoff", async () => {
  const mismatch = vi.fn().mockResolvedValueOnce({ ready: "yes" }).mockResolvedValueOnce({ ready: true });
  await expect(validated(schema, signal(), mismatch)).resolves.toEqual({ ready: true });
  expect(mismatch).toHaveBeenLastCalledWith(expect.stringContaining("ready"));

  const canceled = new AbortController();
  const transient = vi.fn().mockRejectedValue(Object.assign(new Error("Offline fixture"), { status: 500 }));
  const pending = validated(schema, canceled.signal, transient);
  await Promise.resolve();
  canceled.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(transient).toHaveBeenCalledTimes(1);
});
