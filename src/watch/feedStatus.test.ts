/** Verifies public status and the unchanged top-bar mapper under failure and rate limiting. */
import { watchStatus } from "@/shell/watchStatus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WATCH_FEED_STALE_MS, watchFeedStatus } from "./feedStatus";
import type { LiveSourceResult } from "./liveTypes";
import { WATCH_FORCE_HEADER } from "./types";
import { useWatchStore } from "./watchStore";

const now = Date.parse("2026-11-21T19:00:00Z");
const ok: LiveSourceResult = { source: "openfda", count: 0, ms: 120, cached: false };
const failed: LiveSourceResult = { source: "cisa-ics", count: 0, ms: 8000, cached: false, error: "Publisher timed out" };

afterEach(() => vi.unstubAllGlobals());

describe("public feed status", () => {
  it("requires a completed check and considers a zero-item source success live", () => {
    expect(watchFeedStatus(undefined, now)).toBe("pending");
    expect(watchFeedStatus({ checkedAt: now, sources: [] }, now)).toBe("pending");
    expect(watchFeedStatus({ checkedAt: now, sources: [ok, failed] }, now)).toBe("live");
    expect(watchFeedStatus({ checkedAt: now, sources: [failed] }, now)).toBe("offline");
  });

  it("flags a previous success as stale only after fifteen minutes", () => {
    const check = { checkedAt: now, sources: [ok] };
    expect(watchFeedStatus(check, now + WATCH_FEED_STALE_MS)).toBe("live");
    expect(watchFeedStatus(check, now + WATCH_FEED_STALE_MS + 1)).toBe("stale");
    useWatchStore.getState().setFeedCheck(check, now + WATCH_FEED_STALE_MS + 1);
    expect(watchStatus(useWatchStore.getState().local)).toBe("Partial");
  });

  it("keeps a successful check and top-bar dot after our server returns 429", async () => {
    const fetcher = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ error: "limited" }, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    const store = useWatchStore.getState();
    store.setFeedCheck({ checkedAt: now, sources: [ok] }, now);
    await store.runReview("local", false);
    await store.runNow();
    expect(new Headers(fetcher.mock.calls[0][1].headers).has(WATCH_FORCE_HEADER)).toBe(false);
    expect(new Headers(fetcher.mock.calls[1][1].headers).get(WATCH_FORCE_HEADER)).toBe("1");
    const current = useWatchStore.getState();
    expect(current.review.message).toContain("Review limit reached");
    expect(current.feedStatus).toBe("live");
    expect(current.local.checkedAt).toBe(now);
    expect(watchStatus(current.local)).toBe("Complete");
    store.setFeedCheck({ checkedAt: now, sources: [failed, { ...ok, error: "Source unavailable" }] }, now);
    expect(useWatchStore.getState().feedStatus).toBe("offline");
    expect(watchStatus(useWatchStore.getState().local)).toBe("Feed offline");
  });
});
