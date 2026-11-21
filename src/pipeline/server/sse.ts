/** Adapts a validated pipeline request to the browser's cancellable event stream. */
import { randomUUID } from "node:crypto";
import type { Assessment, CaptureImage, PipelineEvent } from "@/pipeline/types";
import type { z } from "zod";

/** Adds link thumbnails and the final checked assessment to the stream. */
export type StreamEvent = Exclude<PipelineEvent, { type: "link.fetched" | "summary.started" }>
  | (Extract<PipelineEvent, { type: "link.fetched" }> & { thumbnail?: CaptureImage })
  | (Extract<PipelineEvent, { type: "summary.started" }> & { assessment?: Assessment });

type RunPipeline<T> = (body: T, sink: (event: StreamEvent) => void, signal: AbortSignal) => Promise<void>;

export function streamPipeline<T>(request: Request, schema: z.ZodType<T>, run: RunPipeline<T>): Response {
  const disconnect = new AbortController();
  const signal = AbortSignal.any([disconnect.signal, request.signal]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: StreamEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const error = (message: string) => emit({
        type: "run.error", runId: randomUUID(), at: Date.now(), stage: "unknown", message,
      });
      async function send() {
        try {
          if (Number(request.headers.get("content-length")) > 18_000_000) {
            error("The capture is too large. Try smaller photos.");
            return;
          }
          const body = schema.safeParse(await request.json());
          if (signal.aborted) return;
          if (!body.success) {
            const issue = body.error.issues[0];
            const field = issue?.path.join(".");
            error(issue?.code === "custom" ? issue.message : `Invalid analysis request${field ? ` at ${field}` : ""}.`);
            return;
          }
          await run(body.data, emit, signal);
        } catch {
          error("The analysis request could not be read or processed. Try again.");
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
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
