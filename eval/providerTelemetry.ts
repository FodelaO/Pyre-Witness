/** Counts actual Gemini HTTP attempts per capture and pauses new requests after rate limits. */
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay } from "node:timers/promises";
import type { ProviderCalls } from "./types";

const scope = new AsyncLocalStorage<ProviderCalls>();
const isGeminiRequest = /^\/v1(?:beta|alpha)?\/(?:interactions|decisions)(?:\/|$)/;

export function installProviderTelemetry() {
  const fetchOriginal = globalThis.fetch;
  let pausedUntil = 0;
  let backoffMs = 1_000;
  globalThis.fetch = async (input, init) => {
    const calls = scope.getStore();
    const url = new URL(input instanceof Request ? input.url : input);
    if (!calls || url.origin !== "https://generativelanguage.googleapis.com" || !isGeminiRequest.test(url.pathname)) {
      return fetchOriginal(input, init);
    }

    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    while (Date.now() < pausedUntil) {
      await delay(pausedUntil - Date.now(), undefined, { signal: signal ?? undefined });
    }
    signal?.throwIfAborted();
    calls.attempts += 1;
    const response = await fetchOriginal(input, init);
    if (response.status === 429) {
      calls.rateLimited += 1;
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1_000
        : Math.max(0, Date.parse(retryAfter ?? "") - Date.now()) || 0;
      pausedUntil = Math.max(pausedUntil, Date.now() + Math.max(backoffMs, waitMs));
      backoffMs = Math.min(backoffMs * 2, 30_000);
    } else if (response.ok && Date.now() >= pausedUntil) {
      backoffMs = 1_000;
    }
    return response;
  };
  return () => { globalThis.fetch = fetchOriginal; };
}

export async function measureProvider<T>(work: () => Promise<T>): Promise<T & { providerCalls: ProviderCalls }> {
  const providerCalls: ProviderCalls = { attempts: 0, rateLimited: 0 };
  const result = await scope.run(providerCalls, work);
  return { ...result, providerCalls };
}
