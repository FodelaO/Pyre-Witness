/** Checks source bytes and prepares inline Gemini media or a video Files API upload. */
import type { Decisions, Interactions } from "@google/genai";
import { inspectFiles, MAX_VIDEO_SECONDS, ModelerError, type ModelMime } from "./limits";
import type { ModelSource } from "./types";
import { videoDuration } from "./videoDuration";

type InlinePart = Interactions.ImageContent | Interactions.DocumentContent;
export type GateInput = Exclude<Decisions.CreateDecisionRequest["input"], string>;

export interface PreparedSource {
  source: ModelSource;
  parts: InlinePart[];
  inventoryLines?: string[];
  video?: { file: File; mime: ModelMime };
}

function signature(bytes: Buffer, mime: ModelMime): boolean {
  switch (mime) {
    case "image/jpeg": return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png": return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/webp": return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    case "application/pdf": return bytes.subarray(0, 1024).includes("%PDF-");
    default: return true;
  }
}

export async function prepareSource(files: File[], signal: AbortSignal): Promise<PreparedSource> {
  const { kind, bytes, media } = inspectFiles(files);
  const source: ModelSource = {
    kind, bytes, files: files.map(({ name }) => name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 160) || "Upload"),
  };
  const prepared: PreparedSource = { source, parts: [] };
  for (const [index, file] of files.entries()) {
    signal.throwIfAborted();
    const { mime } = media[index];
    const bytes = await file.arrayBuffer();
    signal.throwIfAborted();
    if (kind === "video") {
      const seconds = videoDuration(bytes, mime);
      if (seconds === undefined) throw new ModelerError("Video duration is unreadable. Export a seekable MP4, MOV or WebM.");
      if (seconds > MAX_VIDEO_SECONDS + 0.1) throw new ModelerError("Trim the video to 60 seconds or less.");
      source.durationSeconds = seconds;
      source.videoProcessing = seconds >= 30 ? "agentic" : "static";
      prepared.video = { file, mime };
      continue;
    }

    const content = Buffer.from(bytes);
    if (!signature(content, mime)) throw new ModelerError("A file does not match its declared format.");
    if (kind === "inventory") {
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(content);
      } catch {
        throw new ModelerError("Export the CSV or text inventory as UTF-8.");
      }
      if (!text.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) {
        throw new ModelerError("The inventory has no readable text or contains binary data.");
      }
      prepared.inventoryLines = text.split(/\r\n|\n|\r/);
    } else if (kind === "document") {
      prepared.parts.push({
        type: "document", data: content.toString("base64"), mime_type: "application/pdf",
        resolution: "high",
        processing: { type: "static", page_options: { start_page: 1, end_page: 1, content_layers: ["page_image", "page_text"] } },
      });
    } else {
      prepared.parts.push({ type: "image", mime_type: mime, data: content.toString("base64"), resolution: "high" });
    }
  }
  return prepared;
}

/** Number the photos and inventory lines so citations refer to stable positions. */
export function inlineEvidence(prepared: PreparedSource): GateInput {
  if (prepared.inventoryLines) {
    return [{ type: "text", text: prepared.inventoryLines.map((line, index) => `${index + 1}: ${line}`).join("\n") }];
  }
  if (prepared.source.kind === "document") return prepared.parts;
  return prepared.parts.flatMap((part, index) => [
    { type: "text" as const, text: `\nPhoto ${index + 1}:\n` },
    part,
  ]);
}
