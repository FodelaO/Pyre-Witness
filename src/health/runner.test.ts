/** Exercises cached reads, concurrent runs, and costly probe scheduling with a fake clock. */
import { describe, expect, it, vi } from "vitest";
import type { HealthCheck } from "./checks";
import { runCheck } from "./probe";
import { createHealthRunner } from "./runner";
import { summarizeHealth, type HealthResult, type HealthService } from "./services";

const minute = 60_000;

function check(id: string, now: () => number, settings: Partial<HealthService> = {}) {
  const service = { id, label: id, model: id, job: `Checks ${id}.`, costly: false, ...settings };
  const run = vi.fn(async (): Promise<HealthResult> => ({ ...service, ok: true, latencyMs: 17, detail: "Pass", checkedAt: new Date(now()).toISOString() }));
  return { service, run } satisfies HealthCheck;
}

describe("health runner", () => {
  it("returns a cold snapshot without running probes and reuses the completed snapshot for 60 seconds", async () => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    const runner = createHealthRunner([cheap], now);
    expect(runner.getHealth()).toMatchObject({ checkedAt: null, refreshing: false, services: [{ status: "checking", last: null }], history: [] });
    expect(summarizeHealth(runner.getHealth().services)).toEqual({ status: "checking", healthy: 0, completed: 0 });
    expect(cheap.run).not.toHaveBeenCalled();
    expect(runner.needsRefresh()).toBe(true);
    const cached = await runner.refreshHealth();
    time = minute - 1;
    expect(runner.needsRefresh()).toBe(false);
    expect(await runner.refreshHealth(true)).toEqual(cached);
    expect(summarizeHealth(cached.services)).toEqual({ status: "ok", healthy: 1, completed: 1 });
    expect(cheap.run).toHaveBeenCalledTimes(1);
    time += 1;
    expect(runner.needsRefresh()).toBe(true);
  });

  it("excludes optional services from the summary and observes their on-demand cooldowns", async () => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    const image = check("image", now, { costly: true, minIntervalMs: 15 * minute, onDemand: true });
    const managed = check("managed", now, { costly: true, minIntervalMs: 30 * minute, onDemand: true });
    const runner = createHealthRunner([cheap, image, managed], now);
    const first = await runner.refreshHealth();
    expect(first.services.map(({ status }) => status)).toEqual(["ok", "on-demand", "on-demand"]);
    expect(summarizeHealth(first.services)).toEqual({ status: "ok", healthy: 1, completed: 1 });
    expect(image.run).not.toHaveBeenCalled();
    expect(managed.run).not.toHaveBeenCalled();

    time = minute;
    expect((await runner.refreshHealth(true)).services.map(({ status }) => status)).toEqual(["ok", "ok", "ok"]);
    time = 2 * minute;
    await runner.refreshHealth(true);
    expect(image.run).toHaveBeenCalledTimes(1);
    expect(managed.run).toHaveBeenCalledTimes(1);

    time = 16 * minute;
    await runner.refreshHealth(true);
    expect(image.run).toHaveBeenCalledTimes(2);
    time = 31 * minute;
    await runner.refreshHealth();
    expect(managed.run).toHaveBeenCalledTimes(1);
    expect(image.run).toHaveBeenCalledTimes(2);
    time = 32 * minute;
    await runner.refreshHealth(true);
    expect(managed.run).toHaveBeenCalledTimes(2);
    expect(image.run).toHaveBeenCalledTimes(3);
    expect(cheap.run).toHaveBeenCalledTimes(6);
  });

  it("limits concurrent probes to three and adds an all request to the active pass", async () => {
    const now = () => 0;
    const cheap = ["a", "b", "c", "d"].map((id) => check(id, now));
    const onDemand = check("managed", now, { onDemand: true, costly: true });
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    for (const item of cheap.slice(0, 3)) {
      const original = await item.run();
      item.run.mockClear().mockImplementationOnce(async () => { await gate; return original; });
    }
    const runner = createHealthRunner([...cheap, onDemand], now);
    const periodic = runner.refreshHealth();
    expect(runner.getHealth().refreshing).toBe(true);
    expect(runner.needsRefresh()).toBe(false);
    await Promise.resolve();
    expect(cheap.map(({ run }) => run.mock.calls.length)).toEqual([1, 1, 1, 0]);
    expect(onDemand.run).not.toHaveBeenCalled();
    expect(runner.refreshHealth(true)).toBe(periodic);
    expect(runner.refreshHealth(true)).toBe(periodic);
    expect(onDemand.run).not.toHaveBeenCalled();
    finish();
    await expect(periodic).resolves.toMatchObject({ refreshing: false, history: [{ all: true }] });
    expect(cheap[3].run).toHaveBeenCalledTimes(1);
    expect(onDemand.run).toHaveBeenCalledTimes(1);
  });

  it("keeps the last 20 runs and records unexpected errors as unconfirmed", async () => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    const runner = createHealthRunner([cheap], now);
    for (let i = 0; i < 22; i++) {
      time = i * minute;
      await runner.refreshHealth();
    }
    cheap.run.mockRejectedValueOnce(new Error("Provider unavailable"));
    time = 22 * minute;
    const failed = await runner.refreshHealth();
    expect(failed.history).toHaveLength(20);
    expect(failed.history[0]?.startedAt).toBe(new Date(3 * minute).toISOString());
    expect(failed.services[0]).toMatchObject({ status: "stale", last: { ok: true }, lastAttempt: { ok: false, detail: "Provider unavailable" } });
  });

  it("keeps a partly completed round neutral until all cheap probes finish", async () => {
    const now = () => 0;
    const fast = check("fast", now);
    const slow = check("slow", now);
    const result = await slow.run();
    let finish!: () => void;
    slow.run.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve(result); }));
    const runner = createHealthRunner([fast, slow], now);
    const round = runner.refreshHealth();
    await vi.waitFor(() => expect(summarizeHealth(runner.getHealth().services)).toEqual({ status: "checking", healthy: 1, completed: 1 }));
    finish();
    expect(summarizeHealth((await round).services)).toEqual({ status: "ok", healthy: 2, completed: 2 });
  });

  it("keeps a real deadline timeout stale through backoff and recovers on the one retry", async () => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    let resume!: () => void;
    const backoff = vi.fn(() => new Promise<void>((resolve) => { resume = resolve; }));
    const runner = createHealthRunner([cheap], now, backoff);
    const first = await runner.refreshHealth();
    time = minute;
    cheap.run.mockImplementationOnce(() => runCheck(cheap.service, () => new Promise(() => {}), 5));
    const round = runner.refreshHealth();
    await vi.waitFor(() => expect(backoff).toHaveBeenCalledOnce());
    const stale = runner.getHealth().services[0];
    expect(stale).toMatchObject({ status: "stale", last: first.services[0].last, lastGoodAt: first.services[0].lastGoodAt,
      lastAttempt: { ok: false, failure: "timeout" } });
    expect(summarizeHealth([stale])).toEqual({ status: "stale", healthy: 1, completed: 1 });
    resume();
    expect((await round).services[0]).toMatchObject({ status: "ok", lastGoodAt: new Date(time).toISOString() });
    expect(cheap.run).toHaveBeenCalledTimes(3);
  });

  it.each(["http", "timeout", "aborted"] as const)("confirms two consecutive %s outcomes only for HTTP or timeout", async (failure) => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    const runner = createHealthRunner([cheap], now, async () => {});
    await runner.refreshHealth();
    time = minute;
    const failed = { ...cheap.service, ok: false, failure, detail: failure, latencyMs: 10, checkedAt: new Date(time).toISOString() };
    cheap.run.mockResolvedValueOnce(failed).mockResolvedValueOnce(failed);
    const row = (await runner.refreshHealth()).services[0];
    expect(row).toMatchObject({ status: failure === "aborted" ? "stale" : "failing", lastGoodAt: new Date(0).toISOString() });
    expect(row.last?.ok).toBe(failure === "aborted");
    if (failure !== "aborted") {
      expect(row.failingSince).toBe(failed.checkedAt);
      time += minute;
      const later = { ...failed, checkedAt: new Date(time).toISOString() };
      cheap.run.mockResolvedValueOnce(later);
      expect((await runner.refreshHealth()).services[0]).toMatchObject({ failingSince: failed.checkedAt, last: later });
      time += minute;
      expect((await runner.refreshHealth()).services[0].failingSince).toBeUndefined();
    }
  });
});
