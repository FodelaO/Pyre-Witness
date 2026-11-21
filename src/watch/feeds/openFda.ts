/** Fetches bounded public beverage recalls with a shared ten-minute cache and deadline. */
import { z } from "zod";
import { LIVE_CHECK_INTERVAL_MS, type BeverageRecall, type LiveSourceResult } from "../liveTypes";
import { plainText } from "./rss";

const ENDPOINT = "https://api.fda.gov/food/enforcement.json";
const PRODUCT_TERMS = 'beverage OR "bottled water" OR "soft drink" OR "drinking water" OR "sparkling water" OR "spring water" OR "purified water" OR juice OR "squeezed orange" OR "apple cider" OR soda OR kombucha OR "coconut water" OR "fruit punch" OR "energy drink"';
const NON_BEVERAGE_TERMS = 'salsa OR guacamole OR "pico de gallo" OR "fruit cocktail" OR "ice cream" OR granola OR cookies OR "fruit cup" OR loaf OR "whitefish salad"';
const BEVERAGE_NAME = /\b(?:beverages?|juice|(?:bottled|drinking|sparkling|spring|purified|coconut) water|soft drinks?|fruit punch|energy drinks?|coconut drink|squeezed orange|apple cider|soda|kombucha)\b/i;
const NON_BEVERAGE_NAME = /\b(?:noodles?|popcorn|popping boba|salsa|guacamole|pico de gallo|sauces?|granola|loaf|whitefish salad|fruit cocktail|fruit cups?)\b/i;

const catalog = z.object({ results: z.array(z.unknown()) });
const entry = z.object({
  event_id: z.string().regex(/^\d+$/),
  recall_number: z.string().regex(/^[A-Z0-9-]+$/),
  report_date: z.string().regex(/^\d{8}$/),
  recalling_firm: z.string().trim().min(1),
  product_description: z.string().trim().min(1),
  reason_for_recall: z.string().trim().min(1),
});

function dateField(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10).replaceAll("-", "");
}

export function openFdaUrl(now: number): URL {
  const start = dateField(now - 180 * 86_400_000);
  const url = new URL(ENDPOINT);
  url.searchParams.set("search", `product_description:(${PRODUCT_TERMS}) AND NOT product_description:(${NON_BEVERAGE_TERMS}) AND report_date:[${start} TO ${dateField(now)}]`);
  url.searchParams.set("sort", "report_date:desc");
  url.searchParams.set("limit", "14");
  return url;
}

export function normalizeRecalls(input: unknown): BeverageRecall[] {
  const rows = catalog.parse(input).results;
  const events = new Map<string, BeverageRecall>();
  let recognized = false;
  for (const row of rows) {
    const parsed = entry.safeParse(row);
    if (!parsed.success) continue;
    recognized = true;
    const { event_id, product_description, reason_for_recall, recall_number, recalling_firm, report_date } = parsed.data;
    const name = plainText(product_description.split(/\b(?:ingredients|nutrition facts)\s*:/i)[0], 165);
    if (!BEVERAGE_NAME.test(name) || NON_BEVERAGE_NAME.test(name)) continue;
    const date = `${report_date.slice(0, 4)}-${report_date.slice(4, 6)}-${report_date.slice(6)}`;
    if (!z.iso.date().safeParse(date).success) continue;
    const summary = plainText(reason_for_recall, 700);
    const label = plainText(product_description.split(/\s{2,}|\r?\n/)[0], 120);
    const title = (BEVERAGE_NAME.test(label) ? label : name).split(/,|\b(?:NET WT|UPC|NET VOLUME)\b/i)[0].trim();
    if (!title || !summary) continue;
    const link = new URL(ENDPOINT);
    link.searchParams.set("search", `recall_number:"${recall_number}"`);
    const item: BeverageRecall = {
      id: event_id, source: "openfda", title, firm: plainText(recalling_firm, 100),
      published: `${date}T00:00:00.000Z`, cves: [], url: link.href, summary,
    };
    const previous = events.get(event_id);
    if (!previous || item.published > previous.published || (item.published === previous.published && item.url < previous.url)) {
      events.set(event_id, item);
    }
  }
  if (rows.length && !recognized) throw new SyntaxError("Unrecognized openFDA recall records");
  return [...events.values()].sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
}

type Feed = { items: BeverageRecall[]; error?: string; retryAfterMs?: number };
type Cache = { pending?: Promise<Feed>; value?: Feed; expiresAt?: number };
const server = globalThis as typeof globalThis & { pyreBeverageRecallCache?: Cache };
const cache = (server.pyreBeverageRecallCache ??= {});

async function fetchRecalls(now: number): Promise<Feed> {
  const signal = AbortSignal.timeout(8_000);
  try {
    const response = await fetch(openFdaUrl(now), { signal, cache: "no-store" });
    if (response.status === 404) {
      const result = await response.json() as { error?: { code?: string } };
      if (result?.error?.code === "NOT_FOUND") return { items: [] };
      return { items: [], error: "HTTP 404" };
    }
    if (!response.ok) {
      await response.body?.cancel();
      const header = response.headers.get("retry-after");
      const retryAfter = header && (/^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now());
      return {
        items: [], error: response.status === 429 ? "Rate limited by openFDA" : `HTTP ${response.status}`,
        retryAfterMs: typeof retryAfter === "number" && Number.isFinite(retryAfter) ? retryAfter : undefined,
      };
    }
    return { items: normalizeRecalls(await response.json()) };
  } catch (error) {
    const reason = signal.aborted ? "Fetch timed out" : error instanceof z.ZodError || error instanceof SyntaxError
      ? "Unrecognized feed format" : "Network request failed";
    return { items: [], error: reason };
  }
}

export async function loadBeverageRecalls(now: number): Promise<{ items: BeverageRecall[]; result: LiveSourceResult }> {
  const started = performance.now();
  const saved = cache.expiresAt && cache.expiresAt > Date.now() ? cache.value : undefined;
  const feed = saved ?? await (cache.pending ??= fetchRecalls(now).then((value) => {
    cache.value = value;
    cache.expiresAt = Date.now() + Math.max(LIVE_CHECK_INTERVAL_MS, value.retryAfterMs ?? 0);
    cache.pending = undefined;
    return value;
  }));
  return {
    items: feed.items,
    result: { source: "openfda", count: feed.items.length, ms: Math.round(performance.now() - started), cached: !!saved, error: feed.error },
  };
}
