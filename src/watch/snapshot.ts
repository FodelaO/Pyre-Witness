/** Validates fictional twin snapshots before admitting a watch run. */
import { analyzeRequestSchema } from "@/pipeline/server/requests";
import type { Twin } from "@/twin/types";

const twinSchema = analyzeRequestSchema.shape.twin;
const MAX_TWIN_BYTES = 768 * 1024;

export function parseWatchTwin(raw: unknown): Twin {
  const twin = twinSchema.parse(raw);
  if (twin.assets.length > 256 || twin.conduits.length > 64
    || new Set(twin.assets.map(({ id }) => id)).size !== twin.assets.length
    || new Set(twin.conduits.map(({ id }) => id)).size !== twin.conduits.length
    || new Set(twin.areas.map(({ id }) => id)).size !== twin.areas.length) {
    throw new Error("Invalid or oversized twin inventory");
  }
  return twin;
}

export async function readWatchTwin(request: Request): Promise<Twin> {
  if (!request.body || Number(request.headers.get("content-length")) > MAX_TWIN_BYTES) {
    throw new Error("Missing or oversized twin snapshot");
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return parseWatchTwin(JSON.parse(text + decoder.decode()));
      size += value.byteLength;
      if (size > MAX_TWIN_BYTES) {
        await reader.cancel();
        throw new Error("Oversized twin snapshot");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
