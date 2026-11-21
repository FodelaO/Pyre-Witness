/** Covers exact threshold boundaries, transient detections and episode re-arming. */
import { describe, expect, it } from "vitest";
import { advancePolicy, DEFAULT_THRESHOLDS as thresholds, initialPolicy, thresholdCrossed } from "./policy";
import type { EscalationCause } from "./types";

const device: EscalationCause = {
  key: "finding:CAM-901:CRED-01", kind: "finding", title: "Default credentials",
  assetId: "CAM-901", assetName: "Wi-Fi camera", assetKind: "ip_camera", room: "Filler 3",
  loss: 100_000, score: 45, baseline: 40, ruleId: "CRED-01",
};

describe("escalation policy", () => {
  it("checks monetary loss per detection and includes the exact threshold", () => {
    expect(thresholdCrossed(device, thresholds)).toBe(true);
    expect(thresholdCrossed({ ...device, loss: 99_999 }, thresholds)).toBe(false);
    expect(thresholdCrossed({ ...device, loss: null }, thresholds)).toBe(false);
    const below = { ...device, loss: 60_000 };
    expect(advancePolicy(initialPolicy, [below, { ...below, key: "other" }], thresholds, 0).nextAt).toBeUndefined();
  });

  it("checks both absolute risk and change from baseline", () => {
    const risk = { ...device, kind: "risk" as const, loss: null, baseline: 51 };
    expect(thresholdCrossed({ ...risk, score: 60, baseline: 59 }, thresholds)).toBe(true);
    expect(thresholdCrossed({ ...risk, score: 59 }, thresholds)).toBe(true);
    expect(thresholdCrossed({ ...risk, score: 58.99 }, thresholds)).toBe(false);
    expect(thresholdCrossed({ ...risk, score: 55 }, { ...thresholds, risk: 55 })).toBe(true);
  });

  it("debounces, deduplicates, clears and re-arms after the cause resolves", () => {
    const first = advancePolicy(initialPolicy, [device], thresholds, 0);
    expect(first.raised).toEqual([]);
    expect(first.nextAt).toBe(500);
    const flicker = advancePolicy(first.state, [], thresholds, 499);
    expect(flicker.state.episodes.size).toBe(0);
    const again = advancePolicy(flicker.state, [device], thresholds, 500);
    const fired = advancePolicy(again.state, [device, device], thresholds, 1000);
    expect(fired.raised).toEqual([device]);
    expect(advancePolicy(fired.state, [device], thresholds, 5000).raised).toEqual([]);
    const cleared = advancePolicy(fired.state, [{ ...device, loss: 99_000 }], thresholds, 5500);
    expect(cleared.state.episodes.size).toBe(0);
    const recurrence = advancePolicy(cleared.state, [device], thresholds, 6000);
    expect(advancePolicy(recurrence.state, [device], thresholds, 6500).raised).toEqual([device]);
  });

  it("treats a simulation outcome as its own monetary cause", () => {
    const sim = { ...device, key: "simulation:wireless:1", kind: "simulation" as const };
    const first = advancePolicy(initialPolicy, [device, sim], thresholds, 0);
    const result = advancePolicy(first.state, [device, sim], thresholds, 500);
    expect(result.raised).toEqual([device, sim]);
    expect(advancePolicy(result.state, [device], thresholds, 1000).state.episodes.has(sim.key)).toBe(false);
  });
});
