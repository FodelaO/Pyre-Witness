/** Content-addressed, bounded in-process storage for generated fit illustrations. */
import { createHash } from "node:crypto";
import type { FitRequest, FitResult, FitScene } from "./types";

const MAX_IMAGES = 24;
const MAX_AGE_MS = 15 * 60 * 1_000;
const images = new Map<string, { value: FitResult; expires: number }>();

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]));
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function fitCacheKey({ profile, placement, variant, image }: FitRequest, scene: FitScene): string {
  const reference = image ? sha256(`${image.mimeType}:${image.dataBase64}`) : null;
  return sha256(stableJson({ profile: sha256(stableJson(profile)), placement, variant, reference, scene }));
}

export function cachedFit(key: string): FitResult | undefined {
  const entry = images.get(key);
  if (!entry) return undefined;
  images.delete(key);
  if (entry.expires <= Date.now()) return undefined;
  images.set(key, entry);
  return entry.value;
}

export function cacheFit(key: string, value: FitResult): void {
  images.delete(key);
  images.set(key, { value, expires: Date.now() + MAX_AGE_MS });
  if (images.size > MAX_IMAGES) images.delete(images.keys().next().value!);
}
