/** Validates inline photo framing and dimensions before any model request. */
import type { CaptureImage, CaptureInput } from "@/pipeline/types";

export const MAX_CAPTURE_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_CAPTURE_IMAGE_EDGE = 1600;
const MAX_BASE64_LENGTH = Math.ceil(MAX_CAPTURE_IMAGE_BYTES / 3) * 4;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

const IMAGE_SIZE_MESSAGE = "The photo exceeds 2 MiB. Upload it through the capture card to resize it, or choose a smaller photo.";
const IMAGE_FORMAT_MESSAGE = "Upload a still JPEG, PNG, or WebP photo. For another format, re-export it or take a new photo.";
const IMAGE_DATA_MESSAGE = "The photo is incomplete or unreadable. Re-export it or take a new photo.";

type SupportedMime = "image/jpeg" | "image/png" | "image/webp";
type Dimensions = { width: number; height: number };

export class CaptureImageError extends Error {}

function jpegDimensions(bytes: Buffer): Dimensions | undefined {
  let dimensions: Dimensions | undefined;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) return undefined;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (offset + 2 > bytes.length || marker === 0 || marker === 0xd9) return undefined;
    const length = bytes.readUInt16BE(offset);
    const end = offset + length;
    if (length < 2 || end > bytes.length) return undefined;
    if (marker === 0xda) {
      const components = bytes[offset + 2];
      return components && length === 6 + 2 * components && bytes.lastIndexOf(JPEG_END) > end
        ? dimensions : undefined;
    }
    // SOF markers encode dimensions. DHT, JPG and DAC in the same range use other layouts.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (dimensions || length < 11 || length !== 8 + 3 * bytes[offset + 7]) return undefined;
      dimensions = { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset = end;
  }
}

function pngDimensions(bytes: Buffer): Dimensions | undefined {
  if (bytes.length < 45 || bytes.readUInt32BE(8) !== 13 || bytes.toString("latin1", 12, 16) !== "IHDR") return undefined;
  const dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  let hasPixels = false;
  for (let offset = 33; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length || type === "IHDR") return undefined;
    if (type === "IDAT" && length > 0) hasPixels = true;
    if (type === "IEND") return hasPixels && length === 0 && end === bytes.length ? dimensions : undefined;
    offset = end;
  }
}

function webpDimensions(bytes: Buffer): Dimensions | undefined {
  if (bytes.readUInt32LE(4) + 8 !== bytes.length) return undefined;
  let canvas: Dimensions | undefined;
  let frame: Dimensions | undefined;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("latin1", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    const end = data + length + (length & 1);
    if (end > bytes.length) return undefined;
    switch (type) {
      case "VP8X":
        if (offset !== 12 || length !== 10) return undefined;
        if (bytes[data] & 2) throw new CaptureImageError(IMAGE_FORMAT_MESSAGE);
        canvas = { width: bytes.readUIntLE(data + 4, 3) + 1, height: bytes.readUIntLE(data + 7, 3) + 1 };
        break;
      case "VP8 ":
        if (frame || length <= 10 || (bytes[data] & 1) !== 0 || bytes.readUIntBE(data + 3, 3) !== 0x9d012a) return undefined;
        frame = { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
        break;
      case "VP8L": {
        if (frame || length <= 5 || bytes[data] !== 0x2f || (bytes[data + 4] >>> 5) !== 0) return undefined;
        const bits = bytes.readUInt32LE(data + 1);
        frame = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
        break;
      }
    }
    offset = end;
  }
  if (offset !== bytes.length || (canvas && (canvas.width !== frame?.width || canvas.height !== frame?.height))) return undefined;
  return frame;
}

function readImage(bytes: Buffer): { mimeType: SupportedMime; dimensions: Dimensions | undefined } {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { mimeType: "image/jpeg", dimensions: jpegDimensions(bytes) };
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return { mimeType: "image/png", dimensions: pngDimensions(bytes) };
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", dimensions: webpDimensions(bytes) };
  }
  throw new CaptureImageError(IMAGE_FORMAT_MESSAGE);
}

export function normalizeCaptureImage({ dataBase64 }: CaptureImage): CaptureImage {
  if (dataBase64.length > MAX_BASE64_LENGTH) throw new CaptureImageError(IMAGE_SIZE_MESSAGE);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) throw new CaptureImageError(IMAGE_DATA_MESSAGE);
  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length > MAX_CAPTURE_IMAGE_BYTES) throw new CaptureImageError(IMAGE_SIZE_MESSAGE);
  const canonical = bytes.toString("base64");
  if (canonical !== dataBase64 && canonical.replace(/=+$/, "") !== dataBase64) throw new CaptureImageError(IMAGE_DATA_MESSAGE);

  const { mimeType, dimensions } = readImage(bytes);
  if (!dimensions?.width || !dimensions.height) throw new CaptureImageError(IMAGE_DATA_MESSAGE);
  if (Math.max(dimensions.width, dimensions.height) > MAX_CAPTURE_IMAGE_EDGE) {
    throw new CaptureImageError(
      `The photo exceeds ${MAX_CAPTURE_IMAGE_EDGE} pixels on its longest edge. Upload it through the capture card to resize it.`,
    );
  }
  return { mimeType, dataBase64: canonical };
}

/** Direct pipeline callers use the same boundary as HTTP request validation. */
export function normalizeCaptureImages(input: CaptureInput): CaptureInput {
  if (input.kind !== "photo") return input;
  if (input.images.length < 1 || input.images.length > 3) throw new CaptureImageError("Upload between one and three photos.");
  return { ...input, images: input.images.map(normalizeCaptureImage) };
}
