/** Reads a JSON request body with a content-type check and a hard byte limit while streaming. */

export class BodyError extends Error {
  constructor(readonly status: 400 | 413 | 415, message: string) {
    super(message);
  }
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new BodyError(415, "Send the request as application/json.");
  }
  // Content-Length is only a fast path: a chunked upload has none, so the stream is counted too.
  if (Number(request.headers.get("content-length")) > maxBytes) throw new BodyError(413, "The request is too large.");
  if (!request.body) throw new BodyError(400, "The request body is missing.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => undefined);
        throw new BodyError(413, "The request is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new BodyError(400, "The request body is not valid JSON.");
  }
}
