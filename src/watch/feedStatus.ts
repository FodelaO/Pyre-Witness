/** Keeps the latest public check authoritative for the panel and legacy top-bar dot. */
import type { LiveCheck } from "./liveTypes";
import type { WatchRunState } from "./watchStore";

export const WATCH_FEED_STALE_MS = 15 * 60_000;
export type WatchFeedStatus = "pending" | "live" | "stale" | "offline";
export type WatchFeedCheck = Pick<LiveCheck, "checkedAt" | "sources">;

export function watchFeedStatus(check?: WatchFeedCheck, now = Date.now()): WatchFeedStatus {
  if (!check?.sources.length) return "pending";
  if (check.sources.every(({ error }) => Boolean(error))) return "offline";
  return now - check.checkedAt > WATCH_FEED_STALE_MS ? "stale" : "live";
}

export function watchFeedFields(
  check: WatchFeedCheck | undefined,
  status: WatchFeedStatus,
): Pick<WatchRunState, "status" | "sources" | "stages" | "checkedAt"> {
  return {
    status: status === "pending" ? "idle" : "finished",
    checkedAt: check?.checkedAt,
    sources: check?.sources ?? [],
    stages: status === "stale" ? [{
      name: "feeds", state: "failed", ms: 0, detail: "Public feed check older than 15 minutes",
    }] : [],
  };
}
