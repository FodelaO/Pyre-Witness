/** Streams one JSON watch event per SSE frame and propagates disconnects. */
import { randomUUID } from "node:crypto";
import type { Twin } from "@/twin/types";
import { readWatchTwin } from "./snapshot";
import type { WatchEvent, WatchReport, WatchRunResult } from "./types";

export type WatchRunner = (twin: Twin, emit: (event: WatchEvent) => void, signal: AbortSignal, runId: string) => Promise<WatchReport>;
const streamHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};
const frame = (event: WatchEvent) => `data: ${JSON.stringify(event)}\n\n`;

export function cachedWatchResponse(request: Request, result: WatchRunResult): Response {
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    return new Response(frame({ ...result, type: "done", runId: result.report.runId, at: Date.now() }), { headers: streamHeaders });
  }
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function streamWatch(request: Request, run: WatchRunner): Promise<Response> {
  let twin: Twin;
  try {
    twin = await readWatchTwin(request);
  } catch {
    return Response.json({ error: "Send a valid simulated twin snapshot." }, { status: 400 });
  }

  return streamWatchTwin(request, twin, run);
}

export function streamWatchTwin(request: Request, twin: Twin, run: WatchRunner, cached?: WatchRunResult): Response {
  const disconnect = new AbortController();
  const signal = AbortSignal.any([request.signal, disconnect.signal]);
  const runId = randomUUID();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: WatchEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(frame(event)));
      };
      async function send() {
        try {
          if (cached) emit({ ...cached, type: "snapshot", runId, at: Date.now() });
          const report = await run(twin, emit, signal, runId);
          emit({ type: "done", runId, at: Date.now(), report, cached: false, checkedAt: report.finishedAt });
        } catch {
          emit({ type: "error", runId, at: Date.now(), message: "Threat watch could not finish. Try again." });
        } finally {
          if (!disconnect.signal.aborted) controller.close();
        }
      }
      void send();
    },
    cancel() {
      disconnect.abort();
    },
  });
  return new Response(stream, { headers: streamHeaders });
}
