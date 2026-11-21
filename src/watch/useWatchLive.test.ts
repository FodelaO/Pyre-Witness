/** Checks top-bar health after the first feed request fails and the next one succeeds. */
import { watchStatus } from "@/shell/watchStatus";
import { afterEach, expect, it, vi } from "vitest";
import { LIVE_SOURCE_LABELS } from "./liveTypes";
import { refreshWatchFeeds } from "./useWatchLive";
import { useWatchStore } from "./watchStore";

afterEach(() => {
  vi.unstubAllGlobals();
  useWatchStore.setState(useWatchStore.getInitialState(), true);
});

function topBarTone() {
  const { local, feedStatus, review } = useWatchStore.getState();
  return watchStatus(local, { feedStatus, review }).tone;
}

it.each([
  { failure: () => Promise.resolve(new Response(null, { status: 503 })), error: "Feed check HTTP 503" },
  { failure: () => Promise.reject(new DOMException("Request timed out", "TimeoutError")), error: "Feed check unavailable" },
])("reports $error as offline until a good check", async ({ failure, error }) => {
  const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(failure).mockResolvedValueOnce(Response.json({
    checkedAt: Date.now(), items: [],
    sources: [{ source: "cisa-kev", count: 0, ms: 100, cached: false }],
  }));
  vi.stubGlobal("fetch", fetcher);

  expect(useWatchStore.getState().feedStatus).toBe("pending");
  expect((await refreshWatchFeeds()).error).toBe(error);
  const { feedStatus, local } = useWatchStore.getState();
  expect(feedStatus).toBe("offline");
  expect(local.sources.map((source) => [source.source, source.error])).toEqual(
    Object.keys(LIVE_SOURCE_LABELS).map((source) => [source, error]),
  );
  expect(topBarTone()).toBe("alarm");

  expect((await refreshWatchFeeds()).error).toBeUndefined();
  expect(useWatchStore.getState().feedStatus).toBe("live");
  expect(topBarTone()).toBe("live");
});
