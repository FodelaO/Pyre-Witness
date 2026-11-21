/**
 * Server-side product page fetch for link captures.
 * Orchestrates SSRF-safe HTML download, pure metadata/spec extraction, and main image download.
 * Must stay server-only (never import from client components).
 */
import type { LinkSnapshot } from "@/pipeline/types";
import { LinkFetchError } from "./errors";
import { extractProductInfo } from "./extract";
import { fetchMainImage } from "./image";
import { HTML_MAX_BYTES, safeFetch, type SafeFetchOptions } from "./safeFetch";

export { LinkFetchError, type LinkFetchErrorCode } from "./errors";

const HTML_ACCEPT = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5";

export interface FetchProductPageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
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

export async function fetchProductPage(
  url: string,
  options?: FetchProductPageOptions,
): Promise<LinkSnapshot> {
  const signal = options?.signal;
  signal?.throwIfAborted();
  const response = await safeFetch(url, {
    maxBytes: HTML_MAX_BYTES,
    accept: HTML_ACCEPT,
    timeoutMs: options?.timeoutMs,
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
  const extracted = extractProductInfo(html, response.finalUrl);

  const image = await fetchMainImage(extracted.imageUrl, {
    signal,
    timeoutMs: options?.timeoutMs,
    fetchImpl: options?.fetchImpl,
    dnsLookup: options?.dnsLookup,
  });
  signal?.throwIfAborted();

  return {
    url: response.finalUrl,
    title: extracted.title,
    specText: extracted.specText,
    imageUrl: extracted.imageUrl,
    image,
  };
}
