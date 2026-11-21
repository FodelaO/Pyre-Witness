/** Exercises request validation, the real missing-key path, and disconnect propagation. */
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { POST } from "@/app/api/analyze/route";
import type { PipelineEvent } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { streamPipeline } from "./sse";

function post(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function events(response: Response): Promise<PipelineEvent[]> {
  return (await response.text()).trim().split("\n\n").map((frame) => JSON.parse(frame.slice("data: ".length)));
}

afterEach(() => vi.unstubAllEnvs());

it("streams the missing-key gate error without calling a model", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  const response = POST(post({
    input: { kind: "text", description: "An Ethernet temperature sensor." }, twin: SEED_TWIN,
  }));
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const stream = await events(response);
  expect(stream.map(({ type }) => type)).toEqual(["run.started", "run.error"]);
  expect(stream[1]).toMatchObject({
    stage: "gate", runId: stream[0].runId, message: expect.stringContaining("GEMINI_API_KEY is missing"),
  });
});

it("reports malformed capture data over the same event stream", async () => {
  const stream = await events(POST(post({ input: { kind: "photo", images: [] }, twin: SEED_TWIN })));
  expect(stream).toHaveLength(1);
  expect(stream[0]).toMatchObject({ type: "run.error", stage: "unknown", message: expect.stringContaining("input.images") });
});

it("aborts the active runner when the response reader disconnects", async () => {
  let runnerStarted!: () => void;
  let runnerAborted!: () => void;
  const started = new Promise<void>((resolve) => { runnerStarted = resolve; });
  const aborted = new Promise<void>((resolve) => { runnerAborted = resolve; });
  const response = streamPipeline(post({}), z.object({}), async (_body, _emit, signal) => {
    signal.addEventListener("abort", runnerAborted, { once: true });
    runnerStarted();
    await aborted;
  });
  const reader = response.body!.getReader();
  await started;
  await reader.cancel();
  await aborted;
});
