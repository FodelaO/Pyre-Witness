/**
 * SSRF-guarded server-side HTTP fetcher for product pages and images.
 * Enforces scheme checks, DNS/IP blocklists (IPv4 & IPv6), redirect hop limits,
 * timeout, streaming byte limits, and credential-free browser-like headers.
 * Server-only module — never import from client components.
 */
import { lookup as dnsLookupCallback } from "node:dns/promises";
import { isIP } from "node:net";
import { LinkFetchError } from "./errors";

export const HTML_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_REDIRECTS = 3;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".localhost.localdomain",
  ".local",
  ".internal",
  ".home.arpa",
  ".intranet",
];

export type DnsAddress = { address: string; family: number };
export type DnsLookupFn = (hostname: string) => Promise<DnsAddress[]>;

export interface SafeFetchOptions {
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
  signal?: AbortSignal;
  /** Dependency injection hooks for unit tests. */
  fetchImpl?: typeof fetch;
  dnsLookup?: DnsLookupFn;
}

export interface SafeFetchResponse {
  finalUrl: string;
  status: number;
  contentType: string;
  body: Uint8Array;
}

function defaultDnsLookup(hostname: string): Promise<DnsAddress[]> {
  return dnsLookupCallback(hostname, { all: true, verbatim: true });
}

function stripIpv6Brackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function parseIpv4Parts(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith("0")) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    nums.push(n);
  }
  return [nums[0], nums[1], nums[2], nums[3]];
}

function isBlockedIpv4Parts(a: number, b: number, c: number, d: number): boolean {
  void d;
  if (a === 0) return true; // 0.0.0.0/8 (this network)
  if (a === 10) return true; // 10.0.0.0/8 (RFC 1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC 1918)
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 (6to4 relay)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC 1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true; // 224.0.0.0/4 (multicast) & 240.0.0.0/4 (reserved/broadcast)
  return false;
}

function parseIpv6Groups(raw: string): number[] | null {
  const ip = stripIpv6Brackets(raw).toLowerCase();
  if (!ip || ip.includes("%")) return null;

  const doubleColonParts = ip.split("::");
  if (doubleColonParts.length > 2) return null;

  const parseSide = (side: string, allowIpv4Tail: boolean): number[] | null => {
    if (!side) return [];
    const tokens = side.split(":");
    const groups: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (allowIpv4Tail && i === tokens.length - 1 && token.includes(".")) {
        const v4 = parseIpv4Parts(token);
        if (!v4) return null;
        groups.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(token)) return null;
        groups.push(Number.parseInt(token, 16));
      }
    }
    return groups;
  };

  if (doubleColonParts.length === 1) {
    const groups = parseSide(doubleColonParts[0], true);
    return groups && groups.length === 8 ? groups : null;
  }

  const left = parseSide(doubleColonParts[0], false);
  const right = parseSide(doubleColonParts[1], true);
  if (!left || !right) return null;
  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;
  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

function embeddedIpv4Blocked(hi: number, lo: number): boolean {
  return isBlockedIpv4Parts((hi >>> 8) & 0xff, hi & 0xff, (lo >>> 8) & 0xff, lo & 0xff);
}

/**
 * Returns true if the given IPv4 or IPv6 literal belongs to a loopback, private,
 * link-local, CGNAT, multicast, metadata, documentation, or unparseable range.
 */
export function isBlockedIp(rawIp: string): boolean {
  const cleaned = stripIpv6Brackets(rawIp.trim());
  if (!cleaned) return true;
  if (cleaned.includes("%")) return true; // Scoped / link-local zone ID

  const v4 = parseIpv4Parts(cleaned);
  if (v4) {
    return isBlockedIpv4Parts(v4[0], v4[1], v4[2], v4[3]);
  }

  const g = parseIpv6Groups(cleaned);
  if (!g) return true; // Fail closed on malformed IP literals

  // ::/96 (includes :: unspecified, ::1 loopback, and deprecated IPv4-compatible addresses)
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) {
    return true;
  }

  // ::ffff:0:0/96 (IPv4-mapped IPv6)
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) {
    return embeddedIpv4Blocked(g[6], g[7]);
  }

  // ::ffff:0:0:0/96 (IPv4-translated)
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0xffff && g[5] === 0) {
    return embeddedIpv4Blocked(g[6], g[7]);
  }

  // 64:ff9b::/96 (NAT64 well-known prefix)
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) {
    return embeddedIpv4Blocked(g[6], g[7]);
  }

  // 64:ff9b:1::/48 (NAT64 local-use)
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 0x0001) {
    return true;
  }

  // 100::/64 (discard-only)
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) {
    return true;
  }

  // 2001:db8::/32 (documentation)
  if (g[0] === 0x2001 && g[1] === 0x0db8) {
    return true;
  }

  // 2002::/16 (6to4 — inspect embedded IPv4)
  if (g[0] === 0x2002) {
    return embeddedIpv4Blocked(g[1], g[2]);
  }

  // fc00::/7 (Unique Local Address)
  if ((g[0] & 0xfe00) === 0xfc00) return true;

  // fe80::/10 (Link-local)
  if ((g[0] & 0xffc0) === 0xfe80) return true;

  // fec0::/10 (Deprecated site-local)
  if ((g[0] & 0xffc0) === 0xfec0) return true;

  // ff00::/8 (Multicast)
  if ((g[0] & 0xff00) === 0xff00) return true;

  return false;
}

/**
 * Checks whether a hostname string (excluding DNS resolution) is disallowed.
 */
export function isBlockedHostname(rawHost: string): boolean {
  const host = stripIpv6Brackets(rawHost.trim().toLowerCase()).replace(/\.+$/, "");
  if (!host) return true;

  if (isIP(host) !== 0 || host.includes(":")) {
    return isBlockedIp(host);
  }

  if (BLOCKED_HOSTNAMES.has(host)) return true;
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) return true;
  }
  return false;
}

/**
 * Validates URL syntax, scheme, absence of embedded credentials, hostname rules,
 * and resolved DNS records (rejecting any private/internal address).
 */
export async function validateSafeUrl(rawUrl: string, dnsLookup: DnsLookupFn = defaultDnsLookup): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (cause) {
    throw new LinkFetchError("invalid_url", "Enter a valid http:// or https:// product URL.", { cause });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new LinkFetchError("invalid_url", "Only http:// and https:// product links are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new LinkFetchError("invalid_url", "Product links cannot contain embedded credentials.");
  }

  const host = stripIpv6Brackets(parsed.hostname.toLowerCase());
  if (!host) {
    throw new LinkFetchError("invalid_url", "Product URL is missing a hostname.");
  }

  if (isBlockedHostname(host)) {
    throw new LinkFetchError("blocked_host", `Refused to fetch blocked or private host "${host}".`);
  }

  if (isIP(host) !== 0) {
    if (isBlockedIp(host)) {
      throw new LinkFetchError("blocked_host", `Refused to fetch private or reserved IP address "${host}".`);
    }
    return parsed;
  }

  let resolved: DnsAddress[];
  try {
    resolved = await dnsLookup(host);
  } catch (cause) {
    throw new LinkFetchError("http_error", `Could not resolve hostname "${host}".`, { cause });
  }

  if (!resolved.length) {
    throw new LinkFetchError("http_error", `Hostname "${host}" did not resolve to any address.`);
  }

  for (const record of resolved) {
    if (isBlockedIp(record.address)) {
      throw new LinkFetchError("blocked_host", `Refused to fetch "${host}" because it resolves to a private or reserved address.`);
    }
  }

  return parsed;
}

async function readBodyWithCap(response: Response, maxBytes: number): Promise<Uint8Array> {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader) {
    const declared = Number(lengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new LinkFetchError("too_large", `Response exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB size limit.`);
    }
  }

  if (!response.body) {
    return new Uint8Array(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new LinkFetchError("too_large", `Response exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB size limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Fetches a URL after validating it against SSRF rules, re-validating every redirect hop
 * (up to `maxRedirects`), enforcing a timeout and streaming response size cap.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions): Promise<SafeFetchResponse> {
  const maxBytes = options.maxBytes;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const dnsLookup = options.dnsLookup ?? defaultDnsLookup;

  const timer = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timer]) : timer;

  let currentUrl = await validateSafeUrl(rawUrl, dnsLookup);

  try {
    for (let redirects = 0; ; redirects++) {
      if (timer.aborted && !options.signal?.aborted) {
        throw new LinkFetchError("timeout", `Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
      }
      signal.throwIfAborted();

      const headers = new Headers({
        "User-Agent": BROWSER_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: options.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      });

      const response = await fetchImpl(currentUrl.toString(), {
        method: "GET",
        headers,
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        signal,
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        await response.body?.cancel().catch(() => undefined);
        const location = response.headers.get("location");
        if (!location) {
          throw new LinkFetchError("http_error", `Redirect response (${response.status}) was missing a Location header.`, {
            status: response.status,
          });
        }
        if (redirects >= maxRedirects) {
          throw new LinkFetchError("http_error", `Too many redirects (exceeded limit of ${maxRedirects}).`, {
            status: response.status,
          });
        }
        let nextRaw: string;
        try {
          nextRaw = new URL(location, currentUrl).toString();
        } catch (cause) {
          throw new LinkFetchError("invalid_url", "Redirect target is not a valid URL.", { cause });
        }
        currentUrl = await validateSafeUrl(nextRaw, dnsLookup);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new LinkFetchError("http_error", `Remote server responded with HTTP ${response.status}.`, {
          status: response.status,
        });
      }

      const body = await readBodyWithCap(response, maxBytes);
      return {
        finalUrl: currentUrl.toString(),
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        body,
      };
    }
  } catch (error) {
    if (error instanceof LinkFetchError) throw error;
    if (timer.aborted && !options.signal?.aborted) {
      throw new LinkFetchError("timeout", `Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`, {
        cause: error,
      });
    }
    if (options.signal?.aborted) {
      throw error;
    }
    throw new LinkFetchError("http_error", "Failed to fetch the product page.", { cause: error });
  }
}
