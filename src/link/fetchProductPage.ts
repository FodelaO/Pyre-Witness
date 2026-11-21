/**
 * Server-side product page fetch for link captures.
 * Orchestrates SSRF-safe HTML download, pure metadata/spec extraction, and main image download.
 * Must stay server-only (never import from client components).
 */
import type { LinkSnapshot } from "@/pipeline/types";
import { hasDocumentedProductSpecs } from "./captureBudget";
import { isLinkConnectionFailure, LinkFetchError } from "./errors";
import { extractProductInfo } from "./extract";
import { fetchMainImage } from "./image";
import { HTML_MAX_BYTES, safeFetch, type SafeFetchOptions } from "./safeFetch";

export { LinkFetchError, type LinkFetchErrorCode } from "./errors";

const HTML_ACCEPT = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5";
const CAPTURE_ATTEMPT_MS = 6_000;
const CAPTURE_HTML_BYTES = 2 * 1024 * 1024;
const HTML_PREFERENCES = [
  { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", acceptLanguage: "en-US,en;q=0.9" },
  { accept: HTML_ACCEPT, acceptLanguage: "en,en-US;q=0.8" },
] as const;
const NO_READABLE_PRODUCT = "This page did not return readable product details; try a photo or paste the specs as text";

export interface FetchProductPageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Tighter evidence and optional image limits for an interactive capture. */
  captureBudget?: boolean;
  /** Dependency injection hooks for unit tests. */
  fetchImpl?: SafeFetchOptions["fetchImpl"];
  dnsLookup?: SafeFetchOptions["dnsLookup"];
}

function isHtmlContentType(contentType: string): boolean {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return base === "text/html" || base === "application/xhtml+xml";
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 512)).trimStart().toLowerCase();
  return sample.startsWith("<!doctype html") || sample.startsWith("<html") || sample.includes("<head") || sample.includes("<body");
}

function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const charsetMatch = /charset\s*=\s*["']?([a-zA-Z0-9._-]+)/i.exec(contentType);
  const charset = charsetMatch?.[1]?.toLowerCase() ?? "utf-8";
  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

async function fetchProductPageOnce(
  url: string,
  options: FetchProductPageOptions | undefined,
  preferences?: (typeof HTML_PREFERENCES)[number],
): Promise<LinkSnapshot> {
  const signal = options?.signal;
  signal?.throwIfAborted();
  const attemptMs = preferences ? Math.min(options?.timeoutMs ?? CAPTURE_ATTEMPT_MS, CAPTURE_ATTEMPT_MS) : undefined;
  const startedAt = performance.now();
  const response = await safeFetch(url, {
    maxBytes: preferences ? CAPTURE_HTML_BYTES : HTML_MAX_BYTES,
    accept: preferences?.accept ?? HTML_ACCEPT,
    acceptLanguage: preferences?.acceptLanguage,
    timeoutMs: attemptMs ?? options?.timeoutMs,
    signal,
    fetchImpl: options?.fetchImpl,
    dnsLookup: options?.dnsLookup,
  });

  const hasContentType = response.contentType.trim().length > 0;
  if (hasContentType ? !isHtmlContentType(response.contentType) : !looksLikeHtml(response.body)) {
    throw new LinkFetchError(
      "not_html",
      `Expected an HTML product page but received "${response.contentType || "unknown content type"}".`,
    );
  }

  const html = decodeHtml(response.body, response.contentType);
  const extracted = extractProductInfo(html, response.finalUrl, options?.captureBudget);
  if (preferences && extracted.pageKind === "unreadable") {
    throw new LinkFetchError("unreadable_product", NO_READABLE_PRODUCT);
  }

  const richSpecs = preferences && hasDocumentedProductSpecs(extracted.title, extracted.specText);
  const thumbnailTimeout = richSpecs ? 900 : 1_750;
  const remaining = attemptMs === undefined ? undefined : Math.floor(attemptMs - (performance.now() - startedAt));

  const image = remaining !== undefined && remaining <= 0 ? null : await fetchMainImage(extracted.imageUrl, {
    signal,
    timeoutMs: remaining === undefined ? options?.timeoutMs : Math.min(remaining, thumbnailTimeout),
    maxBytes: preferences ? (richSpecs ? 384 : 1536) * 1024 : undefined,
    fetchImpl: options?.fetchImpl,
    dnsLookup: options?.dnsLookup,
  });
  signal?.throwIfAborted();
  if (preferences && extracted.pageKind === "image-only" && !image) {
    throw new LinkFetchError("unreadable_product", NO_READABLE_PRODUCT);
  }

  return {
    url: response.finalUrl,
    title: extracted.title,
    specText: extracted.specText,
    imageUrl: extracted.imageUrl,
    image,
  };
}

function retryableCaptureFailure(error: unknown): boolean {
  if (!(error instanceof LinkFetchError)) return false;
  const { code, status } = error;
  return isLinkConnectionFailure(error) || code === "timeout" || code === "not_html"
    || status === 406 || status === 408 || (status !== undefined && status >= 500 && status < 600);
}

/** Fetches public product evidence. Capture mode retries only transport or negotiation failures. */
export async function fetchProductPage(url: string, options?: FetchProductPageOptions): Promise<LinkSnapshot> {
  if (!options?.captureBudget) return fetchProductPageOnce(url, options);
  try {
    return await fetchProductPageOnce(url, options, HTML_PREFERENCES[0]);
  } catch (error) {
    options.signal?.throwIfAborted();
    if (!retryableCaptureFailure(error)) throw error;
    return fetchProductPageOnce(url, options, HTML_PREFERENCES[1]);
  }
}
