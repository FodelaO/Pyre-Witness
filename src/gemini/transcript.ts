/** Collects sanitized, run-scoped transcript entries without storing request attachments. */
import { AsyncLocalStorage } from "node:async_hooks";
import type { TranscriptEntry } from "@/pipeline/types";

type TranscriptSink = (entry: TranscriptEntry) => void;
const scope = new AsyncLocalStorage<TranscriptSink>();
const TEXT_LIMIT = 40_000;
const REDACTED = "[redacted]";
const SECRET_FIELD = /^(?:x[-_]goog[-_]api[-_]key|(?:gemini[-_]?)?api[-_]?key|authorization|(?:access|refresh|auth|bearer)[-_]?token|password|passwd|client[-_]?secret|cookie|set[-_]?cookie)$/i;
const IMAGE_FIELD = /^(?:dataBase64|base64|base64_data|image_data|inline_data|inlineData)$/i;

export function withGeminiTranscript<T>(sink: TranscriptSink, work: () => T): T {
  return scope.run(sink, work);
}

export function transcriptInput(input: unknown): { text?: string; attachments: number } {
  if (typeof input === "string") return { text: input, attachments: 0 };
  const parts = Array.isArray(input) ? input : [input];
  const texts: string[] = [];
  let attachments = 0;
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    if (part.type === "text" && typeof part.text === "string") texts.push(part.text);
    else if (["image", "document", "audio", "video"].includes(part.type)) attachments += 1;
  }
  return { text: texts.length ? texts.join("\n") : undefined, attachments };
}

export function recordGeminiTranscript(entry: TranscriptEntry): void {
  const sink = scope.getStore();
  if (!sink) return;
  const key = process.env.GEMINI_API_KEY?.trim();
  let truncated = false;
  const clean = (value: string): string => {
    const sanitized = (key ? value.replaceAll(key, REDACTED) : value)
      .replace(/AIza[\w-]{35}/g, REDACTED)
      .replace(/data:[^\s,]{0,120};base64,[a-z\d+/_=-]+/gi, REDACTED)
      .replace(/(?:\/9j\/|iVBORw0KGgo|UklGR|R0lGOD)[a-z\d+/_=-]{4,}/gi, REDACTED)
      .replace(/[a-z\d+/_-]{160,}={0,2}/gi, (candidate) =>
        /[A-Z]/.test(candidate) && /[a-z]/.test(candidate) && /[\d+/=_-]/.test(candidate) ? REDACTED : candidate)
      .replace(/([?&](?:key|api_key|access_token|token)=)[^&#\s"']+/gi, `$1${REDACTED}`)
      .replace(/\bBearer\s+[a-z\d._~+/=-]+/gi, `Bearer ${REDACTED}`)
      .replace(/\b((?:x-goog-api-key|api[-_]?key|access[-_]?token|password|client[-_]?secret)\s*[:=]\s*)[^\s,;"']+/gi, `$1${REDACTED}`)
      .replace(/"([^"\\]+)"\s*:\s*"(?:[^"\\]|\\.)*"/g, (match, field: string) =>
        SECRET_FIELD.test(field) || IMAGE_FIELD.test(field) ? `"${field}":"${REDACTED}"` : match);
    if (sanitized.length <= TEXT_LIMIT) return sanitized;
    truncated = true;
    return sanitized.slice(0, TEXT_LIMIT);
  };
  const sanitize = (value: unknown): unknown => {
    if (typeof value === "string") return clean(value);
    if (Array.isArray(value)) return value.map(sanitize);
    if (value === null || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    const mime = record.mime_type ?? record.mimeType;
    const image = record.type === "image" || (typeof mime === "string" && mime.startsWith("image/"));
    return Object.fromEntries(Object.entries(record).map(([field, child]) => [
      clean(field), IMAGE_FIELD.test(field) || (image && field === "data") || (SECRET_FIELD.test(field) && typeof child === "string")
        ? REDACTED : sanitize(child),
    ]));
  };
  const safe = sanitize(entry) as TranscriptEntry;
  if (truncated) {
    const omission = "Transcript text truncated at 40,000 characters per field.";
    safe.note = safe.note ? `${safe.note.slice(0, TEXT_LIMIT - omission.length - 1)} ${omission}` : omission;
  }
  sink(safe);
}
