/** Checks structured-output recovery and the stage retry budget using offline SDK fixtures. */
import { GoogleGenAI } from "@google/genai";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { MODEL_IDS } from "./models";
import { withGeminiTranscript } from "./transcript";
import {
  providerDiagnostic, providerFailure, structuredInteraction, validated, waitForRetry, withGeminiDiagnostics, type GeminiClients,
} from "./transport";
import { withGeminiUsage } from "./usage";

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

it("reports each attempt's token counts to its own run observer", async () => {
  const create = vi.fn(async ({ input }: { input: string }) => ({
    status: "completed", output_text: '{"ready":true}',
    usage: { total_input_tokens: Number(input), total_output_tokens: 3, total_thought_tokens: 1 },
  }));
  const client = { create } as unknown as GeminiClients["interactions"];
  const first = vi.fn();
  const second = vi.fn();
  await Promise.all([
    withGeminiUsage(first, () => structuredInteraction(client, schema, { ...request, input: "11" }, signal())),
    withGeminiUsage(second, () => structuredInteraction(client, schema, { ...request, input: "22" }, signal())),
  ]);
  expect(first).toHaveBeenCalledExactlyOnceWith(request.model, expect.objectContaining({ inputTokens: 11, outputTokens: 3, thoughtTokens: 1 }));
  expect(second).toHaveBeenCalledExactlyOnceWith(request.model, expect.objectContaining({ inputTokens: 22, outputTokens: 3, thoughtTokens: 1 }));
});

it("retains the provider diagnostic while redacting the configured key", () => {
  vi.stubEnv("GEMINI_API_KEY", "fixture-provider-key");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const error = Object.assign(new Error("Rejected fixture-provider-key provision"), { status: 403 });
    expect(providerFailure(error)).not.toContain("fixture-provider-key");
    expect(log).toHaveBeenCalledExactlyOnceWith("[gemini] provider error", 403, "Rejected [redacted] provision");
  } finally {
    log.mockRestore();
    vi.unstubAllEnvs();
  }
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

it("spends at most two retries on 5xx failures and immediately rejects a permanent error", async () => {
  const unavailable = Object.assign(new Error("Offline fixture"), { status: 503 });
  const transient = vi.fn().mockRejectedValue(unavailable);
  await expect(validated(schema, signal(), transient)).rejects.toBe(unavailable);
  expect(transient).toHaveBeenCalledTimes(3);

  const badRequest = Object.assign(new Error("Offline fixture"), { status: 400 });
  const permanent = vi.fn().mockRejectedValue(badRequest);
  await expect(validated(schema, signal(), permanent)).rejects.toBe(badRequest);
  expect(permanent).toHaveBeenCalledTimes(1);
});

it("does not exceed two provider attempts for the gate", async () => {
  const transient = vi.fn().mockRejectedValue(Object.assign(new Error("Fixture"), { status: 503 }));
  await expect(validated(schema, signal(), transient, { attempts: 2 })).rejects.toBeInstanceOf(Error);
  expect(transient).toHaveBeenCalledTimes(2);
});

it.each(["seconds", "date"])("respects Retry-After %s before sending another request", async (format) => {
  const date = new Date(Date.now() + 2_000).toUTCString();
  const header = format === "seconds" ? "1" : date;
  const minimum = format === "seconds" ? 1_000 : Date.parse(date) - Date.now();
  const error = Object.assign(new Error("Rate limited"), {
    statusCode: 429, headers: new Headers({ "Retry-After": header }),
  });
  const started = performance.now();
  await waitForRetry(error, signal());
  expect(performance.now() - started).toBeGreaterThanOrEqual(minimum - 5);
});

it("honors a stage deadline while waiting for a long Retry-After", async () => {
  const error = Object.assign(new Error("Rate limited"), {
    status: 429, headers: new Headers({ "Retry-After": "99999999999" }),
  });
  const retry = vi.fn().mockRejectedValue(error);
  const deadline = new AbortController();
  const pending = validated(schema, deadline.signal, retry);
  await Promise.resolve();
  deadline.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(retry).toHaveBeenCalledTimes(1);
});

it("keeps the failed fetch cause scoped to the corresponding run", async () => {
  const reset = Object.assign(new Error("Read reset"), { code: "ECONNRESET" });
  const apiError = new TypeError("fetch failed", { cause: reset });
  const retry = vi.fn().mockRejectedValueOnce(apiError).mockResolvedValueOnce({ ready: true });
  const retryObserver = vi.fn();
  const otherObserver = vi.fn();
  await Promise.all([
    withGeminiDiagnostics(retryObserver, () => validated(schema, signal(), retry)),
    withGeminiDiagnostics(otherObserver, () => validated(schema, signal(), async () => ({ ready: true }))),
  ]);
  expect(retryObserver).toHaveBeenCalledExactlyOnceWith("retry", expect.objectContaining({
    code: "ECONNRESET", message: expect.stringContaining("Read reset"),
  }));
  expect(otherObserver).not.toHaveBeenCalled();
});

it("logs a real SDK 400 body with credentials redacted and never retries it", async () => {
  vi.stubEnv("GEMINI_API_KEY", "fixture-provider-key");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetch = vi.fn().mockResolvedValue(Response.json({
    error: { code: "image_safety", message: "Invalid image fixture-provider-key", details: [{ reason: "fixture detail" }] },
  }, { status: 400 }));
  vi.stubGlobal("fetch", fetch);
  const { interactions } = new GoogleGenAI({ apiKey: "fixture-provider-key", apiVersion: "v1beta", vertexai: false });
  try {
    const error = await structuredInteraction(interactions, schema, request, signal()).catch((cause: unknown) => cause);
    expect(providerDiagnostic(error)).toMatchObject({ status: 400, body: expect.stringContaining("fixture detail") });
    expect(providerFailure(error)).toContain("Gemini rejected the request");
    expect(JSON.stringify(log.mock.calls)).not.toContain("fixture-provider-key");
    expect(JSON.stringify(log.mock.calls)).toContain("fixture detail");
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
    vi.unstubAllEnvs();
  }
});

it("retries transient stream events and an early stream disconnect", async () => {
  const create = vi.fn()
    .mockImplementationOnce(async function* () {
      yield { event_type: "error", error: { code: "gateway_timeout", message: "Fixture deadline" } };
    })
    .mockImplementationOnce(async function* () {
      yield { event_type: "interaction.created", interaction: { id: "early" } };
    })
    .mockImplementationOnce(async function* () {
      yield { event_type: "interaction.completed", interaction: { status: "completed", output_text: '{"ready":true}' } };
    });
  const client = { create } as unknown as GeminiClients["interactions"];
  const entry = vi.fn();
  await expect(withGeminiTranscript(entry, () => structuredInteraction(client, schema, request, signal(), vi.fn(), {
    transcript: { stage: "reasoning", crew: "architect", schema: "Fixture" },
  }))).resolves.toMatchObject({ value: { ready: true } });
  expect(create).toHaveBeenCalledTimes(3);
  expect(entry).toHaveBeenCalledTimes(3);
  expect(entry).toHaveBeenNthCalledWith(1, expect.objectContaining({ note: "Call failed (HTTP 504)" }));
  expect(entry).toHaveBeenNthCalledWith(2, expect.objectContaining({ note: expect.stringContaining("Retry 1 after HTTP 504") }));
  expect(entry).toHaveBeenNthCalledWith(3, expect.objectContaining({
    note: "Retry 2 after connection failure", response: { json: { ready: true } },
  }));
});

it("records an interrupted noncooperative attempt immediately and only once", async () => {
  const abort = new AbortController();
  const entry = vi.fn();
  const { promise, resolve } = Promise.withResolvers<unknown>();
  const client = { create: () => promise } as unknown as GeminiClients["interactions"];
  const pending = withGeminiTranscript(entry, () => structuredInteraction(client, schema, request, abort.signal, undefined, {
    transcript: { stage: "reasoning", crew: "architect", schema: "Fixture" },
  }));
  abort.abort();
  expect(entry).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ note: "Call interrupted by deadline or cancellation" }));
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  resolve({ status: "completed", output_text: '{"ready":true}' });
  await Promise.resolve();
  expect(entry).toHaveBeenCalledTimes(1);
});

it("records non-streamed thought summaries in provider order without their signatures", async () => {
  const create = vi.fn().mockResolvedValue({ status: "completed", output_text: '{"ready":true}', steps: [
    { type: "thought", signature: "fixture-secret-signature", summary: [{ type: "text", text: "First summary" }] },
    { type: "thought", summary: [{ type: "text", text: "Second summary" }, { type: "text", text: "Third summary" }] },
  ] });
  const client = { create } as unknown as GeminiClients["interactions"];
  const entry = vi.fn();
  await withGeminiTranscript(entry, () => structuredInteraction(client, schema, request, signal(), undefined, {
    transcript: { stage: "revision", crew: "architect", schema: "Fixture" },
  }));
  expect(entry).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    thoughts: ["First summary", "Second summary", "Third summary"], response: { json: { ready: true } },
  }));
  expect(JSON.stringify(entry.mock.calls)).not.toContain("fixture-secret-signature");
});

it("retries a real SDK connection error once", async () => {
  const accepted = Response.json({
    id: "id", status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: '{"ready":true}' }] }],
  });
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(accepted);
  vi.stubGlobal("fetch", fetch);
  const { interactions } = new GoogleGenAI({ apiKey: "offline-test-placeholder", apiVersion: "v1beta", vertexai: false });
  await expect(structuredInteraction(interactions, schema, request, signal())).resolves.toMatchObject({ value: { ready: true } });
  expect(fetch).toHaveBeenCalledTimes(2);
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
