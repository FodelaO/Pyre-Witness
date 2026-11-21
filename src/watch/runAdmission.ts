/** Reuses recent twin-specific reports and admits only fresh model work against the budget. */
import { createHash } from "node:crypto";
import { crossOriginRejection } from "@/app/api/health/originGuard";
import { tooManyRequests, type RateLimit } from "@/app/api/health/rateLimit";
import type { Twin } from "@/twin/types";
import { readWatchTwin } from "./snapshot";
import { cachedWatchResponse, streamWatchTwin, type WatchRunner } from "./sse";
import { WATCH_FORCE_HEADER, WATCH_REVIEW_CACHE_MS, type WatchReport, type WatchRunResult } from "./types";

const MAX_REPORTS = 16;
const RUN_TIMEOUT_MS = 118_000;

export interface WatchRunCache {
  reports: Map<string, WatchReport>;
  pending: Map<string, Promise<WatchReport>>;
}

const twinKey = (twin: Twin) => createHash("sha256")
  .update(JSON.stringify(twin, (key, value) => key === "telemetry" ? undefined : value)).digest("hex");
const snapshot = (report: WatchReport, note?: string): WatchRunResult => ({
  report, cached: true, checkedAt: report.finishedAt, note,
});

export function createWatchRunHandler(
  limit: RateLimit,
  run: WatchRunner,
  cache: WatchRunCache = { reports: new Map(), pending: new Map() },
  now = Date.now,
) {
  return async function post(request: Request): Promise<Response> {
    const rejected = crossOriginRejection(request);
    if (rejected) return rejected;
    let twin: Twin;
    try {
      twin = await readWatchTwin(request);
    } catch {
      return Response.json({ error: "Send a valid simulated twin snapshot." }, { status: 400 });
    }
    const key = twinKey(twin);
    const cached = cache.reports.get(key);
    const force = request.headers.get(WATCH_FORCE_HEADER) === "1";
    if (cached && !force && now() - cached.finishedAt < WATCH_REVIEW_CACHE_MS) {
      return cachedWatchResponse(request, snapshot(cached));
    }
    const pending = cache.pending.get(key);
    if (pending) {
      if (cached) return cachedWatchResponse(request, snapshot(cached, "Review in progress · showing last review."));
      try {
        return cachedWatchResponse(request, snapshot(await pending));
      } catch {
        return Response.json({ error: "Threat watch could not finish. Try again." }, { status: 503 });
      }
    }
    const wait = limit.take();
    if (wait) {
      return cached
        ? cachedWatchResponse(request, snapshot(cached, "Review limit reached · showing last review."))
        : tooManyRequests(wait, "Threat watch");
    }
    return streamWatchTwin(request, twin, async (input, emit, _signal, runId) => {
      // The shared review can finish for other tabs after the initiating tab closes.
      const work = Promise.resolve().then(() => run(input, emit, AbortSignal.timeout(RUN_TIMEOUT_MS), runId));
      cache.pending.set(key, work);
      try {
        const report = await work;
        cache.reports.delete(key);
        cache.reports.set(key, report);
        if (cache.reports.size > MAX_REPORTS) cache.reports.delete(cache.reports.keys().next().value!);
        return report;
      } finally {
        cache.pending.delete(key);
      }
    }, cached && snapshot(cached));
  };
}
