/** Verifies reload restores pending watch proposals without a second run or a replayed decision. */
import { createRateLimit } from "@/app/api/health/rateLimit";
import { useTwinStore } from "@/twin/store";
import { afterEach, expect, it, vi } from "vitest";
import { createWatchRunHandler } from "./runAdmission";
import { cachedWatchResponse } from "./sse";
import { WATCH_FORCE_HEADER, type ThreatItem, type WatchReport } from "./types";
import { LAST_WATCH_DAY, saveWatchReport } from "./watchCache";
import { useWatchStore, watchDay } from "./watchStore";

afterEach(() => {
  useTwinStore.getState().reset();
  vi.unstubAllGlobals();
});

it("restores pending proposals from the server once and does not replay decisions on reload", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const date = watchDay();
  const { risk, proposeMitigations, decideMitigation, reset } = useTwinStore.getState();
  const base = {
    title: "Fixture safeguard", description: "Review the simulation", kind: "physical" as const,
    proposedBy: "threat-watch", status: "proposed" as const, riskDelta: 0,
  };
  const recommendations: WatchReport["recommendations"] = [
    { ...base, id: "watch-applied", targets: ["HMI-F3"], effects: [{ type: "add_protection", assetId: "HMI-F3", protection: "port-lock" }] },
    { ...base, id: "watch-rejected", targets: ["HMI-F3"], effects: [{ type: "add_protection", assetId: "HMI-F3", protection: "locked-cabinet" }] },
    { ...base, id: "watch-pending", targets: ["GW-PK"], effects: [{ type: "disable_radio", assetId: "GW-PK", radio: "cellular" }] },
    { ...base, id: "watch-stale", targets: ["removed"], effects: [{ type: "add_protection", assetId: "removed", protection: "port-lock" }] },
  ];
  const report: WatchReport = {
    date, runId: "fixture", mode: "local", finishedAt: Date.now(), headline: "Fixture report", baselineScore: risk.score,
    sources: [], candidates: [], items: [], warnings: [], stages: [], recommendations,
  };
  saveWatchReport(report);
  values.set(LAST_WATCH_DAY, date);
  proposeMitigations(recommendations.slice(0, 2));
  decideMitigation("watch-applied", "approved");
  decideMitigation("watch-rejected", "rejected");
  expect(JSON.parse(values.get("pyre-witness:watch:last-report")!).recommendations.map(({ status }: { status: string }) => status))
    .toEqual(Array(4).fill("proposed"));
  reset();

  const initialTwin = useTwinStore.getState().twin;
  fetch.mockImplementation(async (_url: string, init: RequestInit) => cachedWatchResponse(
    new Request("http://localhost:4119/api/watch/run", init), { report, cached: true, checkedAt: report.finishedAt },
  ));
  useWatchStore.getState().runDaily();
  useWatchStore.getState().runDaily();
  expect(useTwinStore.getState().mitigations).toEqual([]);
  await vi.waitFor(() => expect(useWatchStore.getState().review.status).toBe("finished"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(new Headers(fetch.mock.calls[0][1].headers).has(WATCH_FORCE_HEADER)).toBe(false);
  expect(useWatchStore.getState().review).toMatchObject({ cached: true, checkedAt: report.finishedAt });
  expect(useTwinStore.getState().twin).toBe(initialTwin);
  expect(useTwinStore.getState().mitigations).toMatchObject([{ id: "watch-pending", status: "proposed", riskDelta: expect.any(Number) }]);
  const restored = useWatchStore.getState().local.report;
  expect(restored?.recommendations.map(({ id }) => id)).toEqual(["watch-pending"]);
  expect(restored?.warnings).toEqual([expect.stringContaining("1 saved proposals need a fresh review")]);
  await useWatchStore.getState().runNow();
  expect(new Headers(fetch.mock.calls[1][1].headers).get(WATCH_FORCE_HEADER)).toBe("1");
  expect(useTwinStore.getState().mitigations.map(({ id }) => id)).toEqual(["watch-pending"]);
});

it("reuses an unchanged feed snapshot for 15 minutes and invalidates on expiry or revised feed content", async () => {
  let now = Date.parse("2026-11-21T19:00:00Z");
  const checkedAt = now;
  const twin = useTwinStore.getState().twin;
  const item: ThreatItem = {
    source: "cisa-ics", id: "fixture", title: "Fixture advisory", summary: "Initial text", cves: [],
    published: new Date(now).toISOString(), url: "https://example.com/advisory",
  };
  let summary = item.summary;
  const readFeeds = async () => ({
    items: [{ ...item, summary }], sources: [{ source: item.source, count: 1, cached: now !== checkedAt, ms: now === checkedAt ? 20 : 0 }],
  });
  const run = vi.fn<Parameters<typeof createWatchRunHandler>[1]>(async (_twin, _emit, _signal, runId, feeds) => ({
    date: "2026-11-21", runId, mode: "local", finishedAt: now, headline: feeds.items[0].summary, baselineScore: 0,
    sources: feeds.sources, candidates: [], items: [], warnings: [], stages: [], recommendations: [],
  }));
  const post = createWatchRunHandler(createRateLimit(10, 60_000, () => now), run, undefined, () => now, readFeeds);
  const request = () => new Request("http://localhost:4119/api/watch/run", { method: "POST", body: JSON.stringify(twin) });

  await (await post(request())).text();
  now += 15 * 60_000 - 1;
  expect(await (await post(request())).json()).toMatchObject({ cached: true, checkedAt, report: { headline: summary } });
  expect(run).toHaveBeenCalledTimes(1);

  now += 1;
  await (await post(request())).text();
  expect(run).toHaveBeenCalledTimes(2);

  summary = "Revised text on the same advisory";
  expect(await (await post(request())).text()).toContain(summary);
  expect(run).toHaveBeenCalledTimes(3);
  expect(await (await post(request())).json()).toMatchObject({ cached: true, checkedAt: now, report: { headline: summary } });
});
