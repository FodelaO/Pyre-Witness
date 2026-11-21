/** Verifies all publisher formats offline and checks actual publishers on demand. */
import { describe, expect, it, vi } from "vitest";
import type { ThreatItem } from "../types";
import { ICS_FIXTURE, KEV_FIXTURE, NEWS_FIXTURE } from "./fixtures";
import { parseIcs } from "./ics";
import { loadSource, recentItems } from "./index";
import { parseKev } from "./kev";
import { parseNews } from "./news";

describe("feed fixtures", () => {
  it("normalizes the KEV inclusion date, product and CVE", () => {
    const [item, ...other] = parseKev(KEV_FIXTURE);
    expect(item).toMatchObject({
      id: "CVE-2099-1234", source: "cisa-kev", vendor: "Fortinet", product: "FortiOS", cves: ["CVE-2099-1234"],
      published: "2026-11-20T00:00:00.000Z",
    });
    expect(other).toEqual([]);
    expect(() => parseKev("{}")).toThrow();
  });

  it("extracts the ICS id, deduplicates CVEs, and strips RSS markup", () => {
    expect(parseIcs(ICS_FIXTURE)).toEqual([{
      id: "ICSA-26-323-03", source: "cisa-ics", cves: ["CVE-2099-5678"], published: "2026-11-19T12:00:00.000Z",
      title: "Siemens SIMATIC S7-1500 & related controllers", summary: "Review CVE-2099-5678 and CVE-2099-5678.",
      url: "https://www.cisa.gov/news-events/ics-advisories/icsa-26-323-03",
    }]);
    expect(() => parseIcs("<!DOCTYPE rss><rss/>")).toThrow();
  });

  it("accepts an NCSC news item without a CVE", () => {
    expect(parseNews(NEWS_FIXTURE)).toEqual([{
      source: "ncsc-news", id: "https://www.ncsc.gov.uk/news/test-incident",
      url: "https://www.ncsc.gov.uk/news/test-incident", title: "Manufacturer reports a cyber incident",
      summary: "Source confirms an investigation.", cves: [], published: "2026-11-17T12:00:00.000Z",
    }]);
  });

  it("filters by publication time, retains the latest duplicate, and excludes future dates", () => {
    const [item] = parseKev(KEV_FIXTURE);
    const withDate = (id: string, published: string): ThreatItem => ({ ...item, id, published });
    const older = withDate(item.id, "2026-11-19T12:00:00.000Z");
    const beforeWindow = withDate("old", "2026-11-07T11:59:59.999Z");
    const boundary = withDate("equal", "2026-11-07T12:00:00.000Z");
    const future = withDate("future", "2026-11-21T12:00:00.001Z");
    expect(recentItems([older, beforeWindow, boundary, future, item], Date.parse("2026-11-21T12:00:00Z")))
      .toEqual([item, boundary]);
  });

  it("returns a source failure without manufacturing items", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unavailable", { status: 503 }));
    try {
      const result = await loadSource("cisa-kev");
      expect(result.items).toEqual([]);
      expect(result.result).toMatchObject({ source: "cisa-kev", count: 0, error: "HTTP 503" });
    } finally {
      fetch.mockRestore();
    }
  });
});

describe.skipIf(process.env.WATCH_LIVE !== "1")("publisher smoke tests (WATCH_LIVE=1)", () => {
  it.each(["cisa-kev", "cisa-ics", "ncsc-news"] as const)("loads and caches %s", async (source) => {
    const first = await loadSource(source);
    expect(first.result.error).toBeUndefined();
    expect(first.result.count).toBe(first.items.length);
    expect(first.items.every((item) => item.source === source && item.url.startsWith("https://"))).toBe(true);
    const second = await loadSource(source);
    expect(second.result.cached).toBe(true);
    expect(second.items).toEqual(first.items);
  }, 10_000);
});
