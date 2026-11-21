/** Per-process sliding-window limits for unauthenticated routes that spend Gemini quota. */

export interface RateLimit {
  /** Seconds until a slot frees, or 0 when a request would be admitted. Records nothing. */
  blocked(): number;
  /** Records one use and returns 0, or returns the seconds to wait when the window is full. */
  take(): number;
  /** Returns the most recent slot, for requests rejected before any spend. */
  refund(): void;
}

export function createRateLimit(max: number, windowMs: number, now: () => number = Date.now): RateLimit {
  const hits: number[] = [];
  function blocked() {
    const start = now() - windowMs;
    while (hits.length && hits[0] <= start) hits.shift();
    return hits.length < max ? 0 : Math.max(1, Math.ceil((hits[0] + windowMs - now()) / 1000));
  }
  return {
    blocked,
    take() {
      const wait = blocked();
      if (!wait) hits.push(now());
      return wait;
    },
    refund() {
      hits.pop();
    },
  };
}

// Stored on globalThis so a dev-server recompile of one route does not reset its budget.
const shared = globalThis as typeof globalThis & { pyreRateLimits?: Map<string, RateLimit> };

export function sharedRateLimit(name: string, max: number, windowMs: number): RateLimit {
  const limits = (shared.pyreRateLimits ??= new Map());
  let limit = limits.get(name);
  if (!limit) limits.set(name, limit = createRateLimit(max, windowMs));
  return limit;
}

export function tooManyRequests(retryAfterSeconds: number, what: string): Response {
  return Response.json(
    { error: `${what} is rate limited on this server. Try again in ${retryAfterSeconds} s.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}
