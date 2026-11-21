/**
 * Typed error definitions for server-side product page fetching.
 * Server-only module — never import from client components.
 */

export type LinkFetchErrorCode =
  | "invalid_url"
  | "blocked_host"
  | "timeout"
  | "http_error"
  | "too_large"
  | "not_html";

export class LinkFetchError extends Error {
  readonly code: LinkFetchErrorCode;
  readonly status?: number;

  constructor(code: LinkFetchErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "LinkFetchError";
    this.code = code;
    this.status = options?.status;
  }
}
