/**
 * Downloads the main product image via safeFetch, validating supported MIME types
 * (JPEG, PNG, WebP) and enforcing the 4 MB size cap without resizing.
 * Server-only module — never import from client components.
 */
import type { CaptureImage } from "@/pipeline/types";
import { IMAGE_MAX_BYTES, safeFetch, type SafeFetchOptions } from "./safeFetch";

type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

const IMAGE_ACCEPT = "image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5";

export interface FetchMainImageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: SafeFetchOptions["fetchImpl"];
  dnsLookup?: SafeFetchOptions["dnsLookup"];
}

function normalizeImageMime(contentType: string): SupportedImageMime | null {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "image/jpeg" || base === "image/jpg") return "image/jpeg";
  if (base === "image/png") return "image/png";
  if (base === "image/webp") return "image/webp";
  return null;
}

function matchesMagicBytes(mime: SupportedImageMime, bytes: Uint8Array): boolean {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  // WebP: "RIFF" <4-byte size> "WEBP"
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

/**
 * Fetches `imageUrl` through `safeFetch` and returns a base64 `CaptureImage`,
 * or `null` if the image is missing, unsupported, invalid, blocked, or exceeds 4 MB.
 */
export async function fetchMainImage(
  imageUrl: string | null,
  options?: FetchMainImageOptions,
): Promise<CaptureImage | null> {
  const signal = options?.signal;
  signal?.throwIfAborted();
  if (!imageUrl) return null;

  try {
    const response = await safeFetch(imageUrl, {
      maxBytes: IMAGE_MAX_BYTES,
      accept: IMAGE_ACCEPT,
      timeoutMs: options?.timeoutMs,
      signal,
      fetchImpl: options?.fetchImpl,
      dnsLookup: options?.dnsLookup,
    });

    const mimeType = normalizeImageMime(response.contentType);
    if (!mimeType) return null;
    if (response.body.byteLength < 3) return null;
    if (!matchesMagicBytes(mimeType, response.body)) return null;

    return {
      mimeType,
      dataBase64: Buffer.from(response.body).toString("base64"),
    };
  } catch {
    signal?.throwIfAborted();
    return null;
  }
}
