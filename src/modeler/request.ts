/** Reads bounded multipart or base64 JSON requests and validates their twin snapshot. */
import { z } from "zod";
import { SEED_TWIN } from "@/twin/seed";
import type { Asset } from "@/twin/types";
import type { PreparedContext } from "./context";
import { inspectFiles, MAX_PHOTOS, ModelerError } from "./limits";
import { referenceKey } from "./observations";
import { contextSchema } from "./schemas";

const MAX_MULTIPART_BYTES = 51_000_000;
const MAX_JSON_BYTES = 68_000_000;
const MAX_CONTEXT_CHARS = 650_000;
const jsonBody = z.object({
  files: z.array(z.object({
    name: z.string().min(1).max(255),
    mimeType: z.string().max(100),
    dataBase64: z.string().min(4),
  })).min(1).max(MAX_PHOTOS),
  twin: z.unknown().optional(),
});

export function readModelContext(value?: unknown): PreparedContext {
  if (value === undefined) return {
    twin: SEED_TWIN,
    reservedIds: new Set([...SEED_TWIN.conduits, ...SEED_TWIN.entryPoints].map(({ id }) => referenceKey(id))),
  };
  const context = contextSchema.safeParse(value);
  if (!context.success) throw new ModelerError("The twin snapshot is invalid. Refresh the plant and retry.");
  const { areas, assets, conduitIds, entryIds } = context.data;
  const areaIds = new Set(areas.map(({ id }) => id));
  const assetIds = new Set(assets.map(({ id }) => referenceKey(id)));
  if (areaIds.size !== areas.length || assetIds.size !== assets.length
    || assets.some(({ physical }) => !areaIds.has(physical.area))) {
    throw new ModelerError("The twin snapshot has duplicate IDs or missing rooms.");
  }
  return {
    // These defaults are used only to adapt the compact snapshot to shared placement helpers.
    twin: { ...SEED_TWIN, areas, assets: assets.map((asset): Asset => ({
      ...asset, origin: "seed", status: "ok", criticality: 2,
    })), conduits: [], entryPoints: [] },
    reservedIds: new Set([...conduitIds, ...entryIds].map(referenceKey)),
  };
}

async function boundedBody(request: Request, limit: number, signal: AbortSignal) {
  if (Number(request.headers.get("content-length")) > limit) throw new ModelerError("The upload is too large.");
  if (!request.body) throw new ModelerError("Choose a source to upload.");
  signal.throwIfAborted();
  const reader = request.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  const chunks: BlobPart[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        abort();
        throw new ModelerError("The upload is too large.");
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
    }
    return new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } });
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

function base64Files(parts: z.infer<typeof jsonBody>["files"]): File[] {
  inspectFiles(parts.map(({ name, mimeType, dataBase64 }) => ({
    name, type: mimeType, size: Math.floor(dataBase64.length * 3 / 4) - (dataBase64.endsWith("==") ? 2 : dataBase64.endsWith("=") ? 1 : 0),
  })));
  return parts.map(({ name, mimeType, dataBase64 }) => {
    if (dataBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) {
      throw new ModelerError("Send base64 file bytes without a data URL prefix.");
    }
    return new File([Buffer.from(dataBase64, "base64")], name, { type: mimeType });
  });
}

export async function readModelRequest(request: Request, signal: AbortSignal) {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "multipart/form-data" && type !== "application/json") {
    throw new ModelerError("Send a multipart upload or a JSON file payload.");
  }
  const body = await boundedBody(request, type === "multipart/form-data" ? MAX_MULTIPART_BYTES : MAX_JSON_BYTES, signal);
  try {
    if (type === "application/json") {
      const parsed = jsonBody.safeParse(await body.json());
      if (!parsed.success) throw new ModelerError("The JSON upload needs a files array with name, mimeType and dataBase64.");
      return { files: base64Files(parsed.data.files), context: readModelContext(parsed.data.twin) };
    }
    const data = await body.formData();
    const files = data.getAll("files");
    if (files.some((file) => !(file instanceof File))) throw new ModelerError("The files field must contain files.");
    const context = data.get("twin");
    if (context !== null && (typeof context !== "string" || context.length > MAX_CONTEXT_CHARS)) {
      throw new ModelerError("The twin snapshot is too large or malformed.");
    }
    return { files: files as File[], context: readModelContext(context === null ? undefined : JSON.parse(context)) };
  } catch (error) {
    if (error instanceof ModelerError) throw error;
    throw new ModelerError("The upload could not be read. Re-select the source and retry.");
  }
}
