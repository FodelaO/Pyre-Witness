/** Reads the watch's SSE frames across arbitrary fetch chunk boundaries. */
import type { Twin } from "@/twin/types";
import { WATCH_FORCE_HEADER, type WatchEvent, type WatchReport, type WatchRunResult } from "./types";

export class WatchRateLimitError extends Error {}

export async function readWatchStream(
  mode: WatchReport["mode"],
  twin: Twin,
  onEvent: (event: WatchEvent) => void,
  force = false,
): Promise<WatchRunResult> {
  const response = await fetch(`/api/watch/${mode === "local" ? "run" : "managed"}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", Accept: "text/event-stream",
      ...(mode === "local" && force ? { [WATCH_FORCE_HEADER]: "1" } : {}),
    },
    body: JSON.stringify(twin),
  });
  if (response.status === 429) throw new WatchRateLimitError("Review limit reached · try again later.");
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Could not open the threat watch stream.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let runId: string | undefined;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw new Error("Watch stream ended before the report arrived.");
      buffer += decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const data = buffer.slice(0, boundary.index).split(/\r?\n/)
          .filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (!data) continue;
        const event: WatchEvent = JSON.parse(data);
        if (!event || typeof event.runId !== "string" || (runId && runId !== event.runId)) {
          throw new Error("Watch stream sent an unexpected event.");
        }
        runId = event.runId;
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "done") {
          const { report, cached, checkedAt, note } = event;
          return { report, cached, checkedAt, note };
        }
        onEvent(event);
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
