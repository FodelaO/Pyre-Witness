/** Bound the streamed request body and accept only compact JPEG photo batches. */
import { z } from "zod";
import { MAX_CAPTURE_PHOTOS } from "@/capture/image";
import { HANDOFF_NOTE_MAX, type HandoffPayload } from "./types";

const MAX_PHOTO_CHARS = 4 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_CAPTURE_PHOTOS * MAX_PHOTO_CHARS + 4096;

const payloadSchema = z.object({
  images: z.array(z.object({
    mimeType: z.literal("image/jpeg"),
    dataBase64: z.string().min(8).max(MAX_PHOTO_CHARS).refine((value) => (
      value.length % 4 === 0 && value.startsWith("/9j/") && /^[A-Za-z0-9+/]+={0,2}$/.test(value)
    )),
  })).min(1).max(MAX_CAPTURE_PHOTOS),
  note: z.string().trim().max(HANDOFF_NOTE_MAX).optional(),
});

export class HandoffUploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function tooLarge() {
  return new HandoffUploadError("Photos are too large. Try sending one at a time.", 413);
}

export async function readHandoffPayload(request: Request): Promise<HandoffPayload> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HandoffUploadError("Send JPEG photos from the capture page.", 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw tooLarge();
  if (!request.body) throw new HandoffUploadError("Choose at least one photo.", 400);

  let bytes = 0;
  let body = "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw tooLarge();
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new HandoffUploadError("Could not read the photo upload.", 400);
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    const oversized = parsed.error.issues.some((issue) => issue.code === "too_big" && issue.path.at(-1) === "dataBase64");
    if (oversized) throw tooLarge();
    throw new HandoffUploadError("Choose one to three JPEG photos and a short note.", 400);
  }
  return parsed.data;
}
