/** Streams one JSON watch event per SSE frame and propagates disconnects. */
import { randomUUID } from "node:crypto";
import type { Twin } from "@/twin/types";
import { readWatchTwin } from "./snapshot";
import type { WatchEvent, WatchReport } from "./types";

type WatchRunner = (twin: Twin, emit: (event: WatchEvent) => void, signal: AbortSignal, runId: string) => Promise<WatchReport>;

export async function streamWatch(request: Request, run: WatchRunner): Promise<Response> {
  let twin: Twin;
  try {
    twin = await readWatchTwin(request);
  } catch {
    return Response.json({ error: "Send a valid simulated twin snapshot." }, { status: 400 });
  }

  const disconnect = new AbortController();
  const signal = AbortSignal.any([request.signal, disconnect.signal]);
  const runId = randomUUID();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: WatchEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      async function send() {
        try {
          const report = await run(twin, emit, signal, runId);
          emit({ type: "done", runId, at: Date.now(), report });
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
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
