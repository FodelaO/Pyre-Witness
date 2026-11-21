/** Resize camera frames and local photos to the pipeline's JPEG input format. */
import type { CaptureImage } from "@/pipeline/types";
import { fitToLongEdge, prepareImage } from "./image-runtime.mjs";

export const MAX_CAPTURE_PHOTOS = 3;
export const CAPTURE_LONG_EDGE = 1600;
export const CAPTURE_JPEG_QUALITY = 0.85;

export function fitImage(width: number, height: number) {
  return fitToLongEdge(width, height, CAPTURE_LONG_EDGE);
}

export function prepareCaptureImage(source: File | HTMLVideoElement): Promise<CaptureImage> {
  return prepareImage(source, CAPTURE_LONG_EDGE, CAPTURE_JPEG_QUALITY);
}

export function captureImageUrl(image: CaptureImage) {
  return `data:${image.mimeType};base64,${image.dataBase64}`;
}
