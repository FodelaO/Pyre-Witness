/** Verifies cache-first refreshes and quiet recovery from a refused POST. */
import { afterEach, expect, it, vi } from "vitest";
import { HEALTH_REFRESH_MS, type HealthSnapshot } from "./services";
import { refreshServices, useHealth } from "./useHealth";

function snapshot(age: number): HealthSnapshot {
  return { checkedAt: new Date(Date.now() - age).toISOString(), refreshing: false, services: [], history: [] };
}

afterEach(() => {
  vi.unstubAllGlobals();
  useHealth.setState(useHealth.getInitialState());
});

it("reads a fresh or uninitialized cache without sending POST", async () => {
  const cached = snapshot(0);
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(cached)).mockResolvedValueOnce(Response.json({ ...cached, checkedAt: null }));
  vi.stubGlobal("fetch", fetch);
  await refreshServices();
  await refreshServices();
  expect(fetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([["/api/health", "GET"], ["/api/health", "GET"]]);
  expect(useHealth.getState().error).toBeNull();
});

it("uses GET again after a rate-limited stale refresh and leaves the error clear", async () => {
  const cached = snapshot(0);
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json(snapshot(HEALTH_REFRESH_MS + 1_000)))
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(Response.json(cached));
  vi.stubGlobal("fetch", fetch);
  await refreshServices();
  expect(fetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    ["/api/health", "GET"], ["/api/health?all=1", "POST"], ["/api/health", "GET"],
  ]);
  expect(useHealth.getState()).toMatchObject({ snapshot: cached, error: null, requesting: false });
});
