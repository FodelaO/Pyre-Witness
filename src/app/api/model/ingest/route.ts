/** Streams modeler progress and a review-only proposal over the Node route. */
import { ingestModel } from "@/modeler/ingest";
import { ModelerError } from "@/modeler/limits";
import { readModelRequest } from "@/modeler/request";
import type { ModelEvent } from "@/modeler/types";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { sharedRateLimit, tooManyRequests } from "@/app/api/health/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 240;

// An upload is buffered in memory (up to 68 MB as JSON) and then sent through several model
// stages, so both the number of runs and the number held in memory at once are bounded.
const runs = sharedRateLimit("model-ingest", 6, 10 * 60_000);
const MAX_ACTIVE = 2;
const state = globalThis as typeof globalThis & { pyreModelIngestActive?: number };

export function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;
  if ((state.pyreModelIngestActive ?? 0) >= MAX_ACTIVE) return tooManyRequests(15, "Plant modeling (two uploads in progress)");
  const wait = runs.take();
  if (wait) return tooManyRequests(wait, "Plant modeling");
  state.pyreModelIngestActive = (state.pyreModelIngestActive ?? 0) + 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    state.pyreModelIngestActive = Math.max(0, (state.pyreModelIngestActive ?? 1) - 1);
  };
  // A run that outlives the route's maximum duration must not hold its slot forever.
  setTimeout(release, (maxDuration + 10) * 1_000).unref();

  const disconnect = new AbortController();
  const signal = AbortSignal.any([request.signal, disconnect.signal]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ModelEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const uploadTimeout = AbortSignal.timeout(45_000);
      let reading = true;
      let keepAlive: ReturnType<typeof setInterval> | undefined;
      try {
        const { files, context } = await readModelRequest(request, AbortSignal.any([uploadTimeout, signal]));
        reading = false;
        keepAlive = setInterval(() => {
          if (!signal.aborted) controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }, 15_000);
        await ingestModel(files, context, emit, signal);
      } catch (error) {
        emit({
          type: "error",
          message: error instanceof ModelerError ? error.message
            : reading && uploadTimeout.aborted ? "The upload timed out. Try a smaller file." : "The source could not be processed.",
        });
      } finally {
        release();
        clearInterval(keepAlive);
        if (!disconnect.signal.aborted) controller.close();
      }
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
