/** Shared file picker limits and supported upload formats. */
import type { ModelSourceKind } from "./types";

export const MAX_VIDEO_SECONDS = 60;
export const MAX_PHOTOS = 6;
export const MAX_ITEMS = 32;

const TYPES = {
  "video/mp4": ["video", 50_000_000],
  "video/mov": ["video", 50_000_000],
  "video/webm": ["video", 50_000_000],
  "image/jpeg": ["photos", 8_000_000],
  "image/png": ["photos", 8_000_000],
  "image/webp": ["photos", 8_000_000],
  "application/pdf": ["document", 12_000_000],
  "text/csv": ["inventory", 64_000],
  "text/plain": ["inventory", 64_000],
} as const satisfies Record<string, readonly [ModelSourceKind, number]>;

const EXTENSIONS = {
  mp4: "video/mp4", mov: "video/mov", webm: "video/webm",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  pdf: "application/pdf", csv: "text/csv", txt: "text/plain",
} as const;

export type ModelMime = keyof typeof TYPES;
export const MODEL_ACCEPT = Object.keys(EXTENSIONS).map((extension) => `.${extension}`).join(",");

export class ModelerError extends Error {}

export function modelMime(name: string, declared: string): ModelMime | undefined {
  const mime = declared.toLowerCase().split(";")[0].trim();
  if (mime === "video/quicktime") return "video/mov";
  if (mime === "application/csv" || mime === "application/vnd.ms-excel") return "text/csv";
  if (Object.hasOwn(TYPES, mime)) return mime as ModelMime;
  if (mime && mime !== "application/octet-stream") return;
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return Object.hasOwn(EXTENSIONS, extension) ? EXTENSIONS[extension as keyof typeof EXTENSIONS] : undefined;
}

export function inspectFiles(files: readonly Pick<File, "name" | "type" | "size">[]) {
  if (!files.length || files.length > MAX_PHOTOS) throw new ModelerError("Choose one source or up to six photos.");
  const media = files.map((file) => {
    const mime = modelMime(file.name, file.type);
    if (!mime) throw new ModelerError("Use MP4, MOV, WebM, JPG, PNG, WebP, PDF, CSV or TXT.");
    const [kind, maxBytes] = TYPES[mime];
    if (!file.size) throw new ModelerError("One of the selected files is empty.");
    if (file.size > maxBytes) {
      const size = maxBytes < 1_000_000 ? `${maxBytes / 1000} KB` : `${maxBytes / 1_000_000} MB`;
      throw new ModelerError(`Each ${kind === "photos" ? "photo" : "source file"} must be at most ${size}.`);
    }
    return { mime, kind };
  });
  const { kind } = media[0];
  if (files.length > 1 && media.some((part) => part.kind !== "photos")) {
    throw new ModelerError("Upload one video, PDF or inventory, or a batch of photos.");
  }
  const bytes = files.reduce((total, file) => total + file.size, 0);
  if (kind === "photos" && bytes > 30_000_000) throw new ModelerError("The photos must total at most 30 MB.");
  return { kind, bytes, media };
}
