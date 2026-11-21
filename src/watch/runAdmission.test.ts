/** Checks cache, coalescing, caller isolation, and the fresh-work budget. */
import { createRateLimit } from "@/app/api/health/rateLimit";
import { SEED_TWIN } from "@/twin/seed";
import { describe, expect, it, vi } from "vitest";
import { createWatchRunHandler } from "./runAdmission";
import type { WatchRunner } from "./sse";
import { WATCH_FORCE_HEADER, WATCH_REVIEW_CACHE_MS, type WatchEvent, type WatchReport } from "./types";

const start = Date.parse("2026-11-21T19:00:00Z");
const request = (headers: Record<string, string> = {}, body: unknown = SEED_TWIN) => new Request("http://localhost:4119/api/watch/run", {
  method: "POST", headers: { "Content-Type": "application/json", origin: "http://localhost:4119", ...headers },
  body: JSON.stringify(body),
});
const manual = { [WATCH_FORCE_HEADER]: "1" };
const report = (runId: string, finishedAt: number): WatchReport => ({
  date: "2026-11-21", runId, mode: "local", finishedAt, headline: "Fixture review", baselineScore: 0,
  candidates: [], items: [], recommendations: [], sources: [], stages: [], warnings: [],
});
const event = (sse: string): WatchEvent => JSON.parse(sse.split("\n")[0].slice(6));
const readFeeds = async () => ({ sources: [], items: [] });

describe("local watch admission", () => {
  it("reuses a fresh report and only manual refreshes spend a budget slot", async () => {
    let now = start;
    const limit = createRateLimit(2, 10 * 60_000, () => now);
    const run = vi.fn<WatchRunner>(async (_twin, _emit, _signal, runId) => report(runId, now));
    const post = createWatchRunHandler(limit, run, undefined, () => now, readFeeds);
    const first = event(await (await post(request())).text());
    expect(first).toMatchObject({ type: "done", cached: false, checkedAt: start });
    now += 60_000;
    const warm = await post(request());
    expect(warm.status).toBe(200);
    expect(await warm.json()).toMatchObject({ cached: true, checkedAt: start, report: { runId: first.runId } });
    expect(run).toHaveBeenCalledTimes(1);
    await (await post(request(manual))).text();
    expect(run).toHaveBeenCalledTimes(2);
    expect(limit.blocked()).toBeGreaterThan(0);
    const limited = await post(request({ ...manual, Accept: "text/event-stream" }));
    expect(limited.status).toBe(200);
    expect(event(await limited.text())).toMatchObject({ type: "done", cached: true, checkedAt: now, note: expect.stringContaining("limit reached") });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("streams the previous report immediately when an automatic review is due", async () => {
    let now = start;
    const run = vi.fn<WatchRunner>(async (_twin, _emit, _signal, runId) => report(runId, now));
    const post = createWatchRunHandler(createRateLimit(2, 10 * 60_000, () => now), run, undefined, () => now, readFeeds);
    const first = event(await (await post(request())).text());
    now += WATCH_REVIEW_CACHE_MS;
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    run.mockImplementationOnce(async (_twin, _emit, _signal, runId) => { await hold; return report(runId, now); });
    const refresh = await post(request());
    const reader = refresh.body!.getReader();
    try {
      const { value } = await reader.read();
      expect(event(new TextDecoder().decode(value))).toMatchObject({
        type: "snapshot", cached: true, checkedAt: start, report: { runId: first.runId },
      });
    } finally {
      release();
    }
    const { value } = await reader.read();
    expect(event(new TextDecoder().decode(value))).toMatchObject({ type: "done", cached: false, checkedAt: now });
    await reader.cancel();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("coalesces twelve cold tabs on the same twin", async () => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const run = vi.fn<WatchRunner>(async (_twin, _emit, _signal, runId) => { await hold; return report(runId, start); });
    const post = createWatchRunHandler(createRateLimit(1, 600_000, () => start), run, undefined, () => start, readFeeds);
    const first = await post(request());
    const joins = Array.from({ length: 11 }, () => post(request()));
    let joinedEarly = false;
    void joins[0].then(() => { joinedEarly = true; });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(joinedEarly).toBe(false);
    release();
    const result = event(await first.text());
    const responses = await Promise.all(joins);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const snapshots = await Promise.all(responses.map((response) => response.json()));
    expect(snapshots.every((value) => value.cached && value.report.runId === result.runId)).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("validates input and origin before serving a cache and keeps reports twin-specific", async () => {
    let now = start;
    const run = vi.fn<WatchRunner>(async (_twin, _emit, _signal, runId) => report(runId, now));
    const post = createWatchRunHandler(createRateLimit(1, 20 * 60_000, () => now), run, undefined, () => now, readFeeds);
    expect((await post(request({}, {}))).status).toBe(400);
    await (await post(request())).text();
    now += WATCH_REVIEW_CACHE_MS;
    const stale = await post(request());
    expect(stale.status).toBe(200);
    expect(await stale.json()).toMatchObject({ cached: true, checkedAt: start, note: expect.stringContaining("limit reached") });
    expect((await post(request({ origin: "https://example.com" }))).status).toBe(403);
    expect((await post(request({}, { ...SEED_TWIN, plant: { ...SEED_TWIN.plant, name: "Another plant" } }))).status).toBe(429);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
