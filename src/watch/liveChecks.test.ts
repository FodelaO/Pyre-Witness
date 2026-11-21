/** Checks FDA normalization and change detection across initial checks and outages. */
import { describe, expect, it, vi } from "vitest";
import { loadBeverageRecalls, normalizeRecalls, openFdaUrl } from "./feeds/openFda";
import { compareChecks } from "./liveHistory";
import { liveItemKey, type LiveCheck, type LiveItem } from "./liveTypes";

const product = {
  event_id: "123", recall_number: "H-0435-2026", report_date: "20261111", recalling_firm: "Example Beverage",
  product_description: "Apple juice, 16 oz. Ingredients: apple juice, ascorbic acid", reason_for_recall: "Potential undeclared milk",
};
const [recall] = normalizeRecalls({ results: [product] });
const now = Date.parse("2026-11-21T18:00:00Z");

describe("live watch checks", () => {
  it("requests a bounded, descending beverage search and links to the exact record", () => {
    const url = openFdaUrl(now);
    expect(url.origin).toBe("https://api.fda.gov");
    expect(url.searchParams.get("search")).toContain('"bottled water"');
    expect(url.searchParams.get("search")).toContain("TO 20261121");
    expect(url.searchParams.get("sort")).toBe("report_date:desc");
    expect(Number(url.searchParams.get("limit"))).toBeLessThanOrEqual(15);
    expect(new URL(recall.url).searchParams.get("search")).toBe('recall_number:"H-0435-2026"');
  });

  it("groups records from the same event and filters non-beverage ingredient matches", () => {
    const rows = normalizeRecalls({ results: [
      product, { ...product, recall_number: "H-0436-2026" },
      { ...product, event_id: "124", product_description: "Salsa, lime juice concentrate" },
      { ...product, event_id: "125", report_date: "20261312" },
    ] });
    expect(rows).toEqual([recall]);
    expect(recall).toMatchObject({ id: "123", title: "Apple juice", published: "2026-11-11T00:00:00.000Z" });
  });

  it("shares openFDA fetches and honors the cache lifetime and rate-limit backoff", async () => {
    let time = now;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => time);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ results: [product] }));
    try {
      const first = await Promise.all([loadBeverageRecalls(time), loadBeverageRecalls(time)]);
      expect(first.map(({ items }) => items)).toEqual([[recall], [recall]]);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
      time += 599_999;
      expect((await loadBeverageRecalls(time)).result.cached).toBe(true);
      time += 1;
      fetcher.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "1200" } }));
      expect((await loadBeverageRecalls(time)).result).toMatchObject({ cached: false, error: "Rate limited by openFDA" });
      time += 600_000;
      expect((await loadBeverageRecalls(time)).result).toMatchObject({ cached: true, error: "Rate limited by openFDA" });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
      fetcher.mockRestore();
    }
  });

  it("marks additions after a prior successful check and retains that baseline during failures", () => {
    const check = (items: LiveItem[], error?: string): LiveCheck => ({
      items, checkedAt: now, sources: [{ source: "openfda", count: items.length, error, cached: false, ms: 15 }],
    });
    const newRecall = { ...recall, id: "new" };
    const first = compareChecks({}, check([recall]));
    expect(first.added.size).toBe(0);
    const failed = compareChecks(first.history, check([], "Fetch timed out"));
    const recovered = compareChecks(failed.history, check([recall, newRecall]));
    expect([...recovered.added]).toEqual([liveItemKey(newRecall)]);
    expect(compareChecks(recovered.history, check([recall, newRecall])).added.size).toBe(0);
  });
});
