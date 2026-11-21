/** Sends a source and current layout, then consumes its cancellable SSE stream. */
import type { Twin } from "@/twin/types";
import { modelTwinContext } from "./context";
import { ModelerError } from "./limits";
import type { ModelEvent } from "./types";

export async function requestModel(
  files: File[], twin: Twin, receive: (event: ModelEvent) => void, signal: AbortSignal,
): Promise<void> {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  body.set("twin", JSON.stringify(modelTwinContext(twin)));
  const response = await fetch("/api/model/ingest", {
    method: "POST", headers: { Accept: "text/event-stream" }, body, signal,
  });
  if (response.status === 413) throw new ModelerError("The server upload limit was exceeded. Try a smaller source.");
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new ModelerError("Could not open the modeler stream. Retry the upload.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (!frame.startsWith("data:")) continue;
        const event = JSON.parse(frame.slice(5)) as ModelEvent;
        receive(event);
        if (event.type === "complete" || event.type === "error") return;
      }
    }
    throw new ModelerError("The modeler stream ended early. Retry the upload.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
