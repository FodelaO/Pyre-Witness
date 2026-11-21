/** Exercises cached reads, concurrent runs, and costly probe scheduling with a fake clock. */
import { describe, expect, it, vi } from "vitest";
import type { HealthCheck } from "./checks";
import { createHealthRunner } from "./runner";
import type { HealthService } from "./services";

const minute = 60_000;

function check(id: string, now: () => number, settings: Partial<HealthService> = {}) {
  const service = { id, label: id, model: id, job: `Checks ${id}.`, costly: false, ...settings };
  const run = vi.fn(async () => ({ ...service, ok: true, latencyMs: 17, detail: "Pass", checkedAt: new Date(now()).toISOString() }));
  return { service, run } satisfies HealthCheck;
}

describe("health runner", () => {
  it("returns a cold snapshot without running probes and reuses the completed snapshot for 60 seconds", async () => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    const runner = createHealthRunner([cheap], now);
    expect(runner.getHealth()).toMatchObject({ checkedAt: null, refreshing: false, services: [{ status: "unknown", last: null }], history: [] });
    expect(cheap.run).not.toHaveBeenCalled();
    expect(runner.needsRefresh()).toBe(true);
    const cached = await runner.refreshHealth();
    time = minute - 1;
    expect(runner.needsRefresh()).toBe(false);
    expect(runner.getHealth()).toEqual(cached);
    expect(cheap.run).toHaveBeenCalledTimes(1);
    time += 1;
    expect(runner.needsRefresh()).toBe(true);
  });

  it("checks image every 15 minutes and the managed API only on demand after 30 minutes", async () => {
    let time = 0;
    const now = () => time;
    const cheap = check("cheap", now);
    const image = check("image", now, { costly: true, minIntervalMs: 15 * minute });
    const managed = check("managed", now, { costly: true, minIntervalMs: 30 * minute, onDemand: true });
    const runner = createHealthRunner([cheap, image, managed], now);
    const first = await runner.refreshHealth();
    expect(first.services.map(({ status, skipped }) => [status, skipped])).toEqual([
      ["ok", null], ["ok", null], ["skipped", "on-demand"],
    ]);
    expect(managed.run).not.toHaveBeenCalled();

    const forced = await runner.refreshHealth(true);
    expect(forced.services[1]).toMatchObject({ status: "skipped", skipped: "cooldown", last: first.services[1].last });
    expect(forced.services[2]).toMatchObject({ status: "ok", skipped: null });
    time = 15 * minute - 1;
    expect((await runner.refreshHealth(true)).services[2]).toMatchObject({ status: "skipped", skipped: "cooldown" });
    expect(image.run).toHaveBeenCalledTimes(1);
    expect(managed.run).toHaveBeenCalledTimes(1);

    time += 1;
    await runner.refreshHealth();
    expect(image.run).toHaveBeenCalledTimes(2);
    time = 30 * minute;
    const automatic = await runner.refreshHealth();
    expect(automatic.services[2]).toMatchObject({ status: "skipped", skipped: "on-demand", last: forced.services[2].last });
    expect(managed.run).toHaveBeenCalledTimes(1);
    await runner.refreshHealth(true);
    expect(managed.run).toHaveBeenCalledTimes(2);
    expect(image.run).toHaveBeenCalledTimes(3);
    expect(cheap.run).toHaveBeenCalledTimes(6);
  });

  it("runs cheap probes concurrently and adds an all request to the active pass", async () => {
    const now = () => 0;
    const slow = check("slow", now);
    const fast = check("fast", now);
    const onDemand = check("managed", now, { onDemand: true, costly: true });
    const original = await slow.run();
    slow.run.mockClear();
    let finish!: () => void;
    slow.run.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve(original); }));
    const runner = createHealthRunner([slow, fast, onDemand], now);
    const periodic = runner.refreshHealth();
    expect(runner.getHealth().refreshing).toBe(true);
    expect(runner.needsRefresh()).toBe(false);
    await Promise.resolve();
    expect(slow.run).toHaveBeenCalledTimes(1);
    expect(fast.run).toHaveBeenCalledTimes(1);
    expect(onDemand.run).not.toHaveBeenCalled();
    expect(runner.refreshHealth(true)).toBe(periodic);
    expect(runner.refreshHealth(true)).toBe(periodic);
    expect(onDemand.run).toHaveBeenCalledTimes(1);
    finish();
    await expect(periodic).resolves.toMatchObject({ refreshing: false, history: [{ all: true }] });
  });

  it("keeps the last 20 runs and preserves failures as results", async () => {
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
    expect(failed.services[0]).toMatchObject({ status: "failing", last: { ok: false, detail: "Provider unavailable" } });
  });
});
