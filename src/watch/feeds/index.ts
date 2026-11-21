/** Fetches publisher feeds concurrently and coalesces refreshes within the server process. */
import { performance } from "node:perf_hooks";
import { WATCH_SOURCES, WATCH_WINDOW_DAYS } from "../sources";
import type { SourceResult, ThreatItem, ThreatSource } from "../types";
import { parseIcs } from "./ics";
import { parseKev } from "./kev";
import { parseNews } from "./news";

const CACHE_MS = 30 * 60_000;
const TIMEOUT_MS = 8_000;
const MAX_FEED_BYTES = 6 * 1024 * 1024;
const WINDOW_MS = WATCH_WINDOW_DAYS * 24 * 60 * 60_000;
const parsers = { "cisa-kev": parseKev, "cisa-ics": parseIcs, "ncsc-news": parseNews };
export const sourceIds = Object.keys(parsers) as ThreatSource[];

type CacheEntry = { pending: Promise<ThreatItem[]> } | { items: ThreatItem[]; expires: number };
const server = globalThis as typeof globalThis & { pyreNormalizedWatchFeeds?: Map<ThreatSource, CacheEntry> };
const cache = (server.pyreNormalizedWatchFeeds ??= new Map());

class FeedFailure extends Error {}

async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) {
    await response.body?.cancel();
    throw new FeedFailure(`HTTP ${response.status}`);
  }
  if (!response.body) throw new FeedFailure("Empty response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return output + decoder.decode();
      size += value.byteLength;
      if (size > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new FeedFailure("Feed exceeds size limit");
      }
      output += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

async function fetchItems(source: ThreatSource): Promise<ThreatItem[]> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let text: string;
  try {
    text = await fetchText(WATCH_SOURCES[source].url, signal);
  } catch (error) {
    if (signal.aborted) throw new FeedFailure("Fetch timed out");
    if (error instanceof FeedFailure) throw error;
    throw new FeedFailure("Network request failed");
  }
  try {
    return parsers[source](text);
  } catch {
    throw new FeedFailure("Unrecognized feed format");
  }
}

function getItems(source: ThreatSource): { promise: Promise<ThreatItem[]>; cached: boolean } {
  const existing = cache.get(source);
  if (existing && "pending" in existing) return { promise: existing.pending, cached: false };
  if (existing && existing.expires > Date.now()) return { promise: Promise.resolve(existing.items), cached: true };

  const pending = fetchItems(source).then(
    (items) => {
      cache.set(source, { items, expires: Date.now() + CACHE_MS });
      return items;
    },
    (error) => {
      cache.delete(source);
      throw error;
    },
  );
  cache.set(source, { pending });
  return { promise: pending, cached: false };
}

export function recentItems(items: ThreatItem[], now: number): ThreatItem[] {
  const unique = new Map<string, ThreatItem>();
  for (const item of items) {
    const published = Date.parse(item.published);
    if (!(published >= now - WINDOW_MS && published <= now)) continue;
    const id = `${item.source}:${item.id}`;
    const prior = unique.get(id);
    if (!prior || prior.published < item.published) unique.set(id, item);
  }
  return [...unique.values()].sort((a, b) => b.published.localeCompare(a.published));
}

export async function loadSource(source: ThreatSource, now = Date.now()) {
  const start = performance.now();
  const { promise, cached } = getItems(source);
  try {
    const items = recentItems(await promise, now);
    const result: SourceResult = { source, count: items.length, cached, ms: Math.round(performance.now() - start) };
    return { items, result };
  } catch (error) {
    const message = error instanceof FeedFailure ? error.message : "Feed unavailable";
    const result: SourceResult = { source, count: 0, cached, ms: Math.round(performance.now() - start), error: message };
    return { items: [], result };
  }
}

export async function loadFeeds(now: number, onSource: (result: SourceResult) => void = () => {}) {
  const loaded = await Promise.all(sourceIds.map(async (source) => {
    const feed = await loadSource(source, now);
    onSource(feed.result);
    return feed;
  }));
  return { items: loaded.flatMap(({ items }) => items), sources: loaded.map(({ result }) => result) };
}

export async function loadKnownExploitedCves(): Promise<ReadonlySet<string>> {
  // A catalog entry can predate the watch window and still corroborate a fresh advisory.
  try {
    const catalog = await getItems("cisa-kev").promise;
    return new Set(catalog.map(({ id }) => id));
  } catch {
    return new Set();
  }
}
