/** Long-run conservation, throughput and monitor checks on the seeded production line. */
import { describe, expect, it } from "vitest";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import type { Asset, Twin } from "@/twin/types";
import { monitorProcess, readMonitors } from "../monitors";
import { createProcessState, TANK_IDS } from "./model";
import { tickProcess } from "./tick";

function inspect(twin: Twin, id: string): Asset {
  const asset = twin.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Expected seed asset ${id}`);
  return asset;
}

function level(twin: Twin, id: string): number {
  return inspect(twin, id).process?.levelPct ?? NaN;
}

function edit(twin: Twin, id: string, change: (asset: Asset) => Asset): Twin {
  return { ...twin, assets: twin.assets.map((item) => item.id === id ? change(item) : item) };
}

function value(twin: Twin, id: string, tag = id): number {
  return inspect(twin, id).process?.telemetry?.find((point) => point.tag === tag)?.value ?? NaN;
}

function reading(twin: Twin, id: string, next: number): Twin {
  return edit(twin, id, (asset) => ({
    ...asset,
    process: { ...asset.process, telemetry: asset.process?.telemetry?.map((point) => ({ ...point, value: next })) },
  }));
}

describe("living Line 3 process", () => {
  it("closes the mass ledger over ten minutes and fills 6,000 bottles", () => {
    let twin = SEED_TWIN;
    let state = createProcessState(twin);
    let inputKg = 0;
    let outputKg = 0;
    let initialKg = 0;
    let finalKg = 0;
    let bottles = 0;
    const rawLevels = [level(twin, "TK-101")];
    const concentrateLevels = [level(twin, "TK-202")];

    for (let second = 0; second < 600; second += 1) {
      const next = tickProcess(twin, state);
      const { balance } = next;
      if (second === 0) initialKg = balance.initialKg;
      finalKg = balance.finalKg;
      inputKg += balance.externalInKg;
      outputKg += balance.externalOutKg;
      bottles += balance.bottles;
      expect(Math.abs(balance.residualKg)).toBeLessThan(1e-8);
      expect(balance.roFeedKg).toBeCloseTo(balance.roPermeateKg + balance.roRejectKg, 10);
      expect(balance.roPermeateKg / balance.roFeedKg).toBeCloseTo(0.75, 10);
      expect(balance.treatedToBlendKg + balance.syrupToBlendKg).toBeCloseTo(balance.blendInKg, 10);
      expect(balance.syrupToBlendKg / balance.blendInKg * 0.54).toBeCloseTo(0.106, 10);
      expect(readMonitors(next.twin)).toEqual([]);
      expect(TANK_IDS.every((id) => level(next.twin, id) >= 0 && level(next.twin, id) <= 100)).toBe(true);
      twin = next.twin;
      state = next.state;
      rawLevels.push(level(twin, "TK-101"));
      concentrateLevels.push(level(twin, "TK-202"));
    }

    expect(finalKg - initialKg - inputKg + outputKg).toBeCloseTo(0, 7);
    expect(bottles).toBeCloseTo(6000, 8);
    expect(value(twin, "FT-403")).toBeCloseTo(18, 8);
    expect(value(twin, "QT-301")).toBeCloseTo(3.7, 8);
    expect(value(twin, "LT-101")).toBe(level(twin, "TK-101"));
    expect(value(twin, "TK-401", "PT-403")).not.toBe(20);
    expect(Math.min(...rawLevels)).toBeLessThan(71.1);
    expect(Math.max(...rawLevels)).toBeGreaterThan(72.8);
    expect(Math.min(...concentrateLevels)).toBeLessThan(51.71);
    expect(concentrateLevels[600]).toBeGreaterThan(52);
    expect(level(SEED_TWIN, "TK-101")).toBe(72);
  });

  it("replays seeded noise exactly and caps flows against actual stocks and piping", () => {
    const state = createProcessState(SEED_TWIN);
    const first = tickProcess(SEED_TWIN, state);
    expect(tickProcess(SEED_TWIN, state)).toEqual(first);
    expect(tickProcess(first.twin, first.state).twin).not.toEqual(first.twin);
    expect(tickProcess(SEED_TWIN, state, 0).twin).toBe(SEED_TWIN);

    const isolated = applyEffects(SEED_TWIN, [{ type: "remove_connection", assetId: "RO-101", to: "UV-101", medium: "water" }]);
    const noRo = tickProcess(isolated, createProcessState(isolated));
    expect(noRo.balance.roPermeateKg).toBe(0);
    expect(level(noRo.twin, "TK-102")).toBeLessThan(level(isolated, "TK-102"));
    expect(noRo.balance.bottles).toBeCloseTo(10);

    const emptyBlend = edit(isolated, "BL-301", (asset) => ({ ...asset, process: { ...asset.process, levelPct: 0 } }));
    const noProduct = tickProcess(emptyBlend, createProcessState(emptyBlend));
    expect(noProduct.balance.bottles).toBe(0);
    expect(noProduct.balance.dissolvedCo2Kg).toBe(0);
    expect(value(noProduct.twin, "FT-403")).toBe(0);
    expect(Math.abs(noProduct.balance.residualKg)).toBeLessThan(1e-8);
  });
});

describe("simulated plant monitors", () => {
  it("paints every measured band breach onto the asset and its area", () => {
    const drift = reading(SEED_TWIN, "FT-403", 15);
    const { twin, alerts } = monitorProcess(drift);
    expect(alerts).toEqual([expect.objectContaining({ id: "band:FT-403:FT-403", severity: "attention", source: "simulated plant" })]);
    expect(inspect(twin, "FT-403").status).toBe("attention");
    expect(twin.areas.find((area) => area.id === "filler3")?.status).toBe("attention");
    expect(inspect(drift, "FT-403").status).toBe("ok");
    expect(monitorProcess(SEED_TWIN).twin).toBe(SEED_TWIN);
  });

  it("alarms for an open CIP branch, high gas reading, and warm outlet during filling", () => {
    const openValve = edit(SEED_TWIN, "V-311", (asset) => ({ ...asset, process: { ...asset.process, running: true } }));
    const abnormal = reading(reading(openValve, "GT-401", 10), "TT-301", 5);
    const { twin, alerts } = monitorProcess(abnormal);
    expect(alerts.map((alert) => alert.id)).toEqual([
      "interlock:cip-production", "interlock:ammonia-detector", "interlock:cola-outlet",
    ]);
    expect(alerts.every((alert) => alert.severity === "alarm" && alert.source === "simulated plant")).toBe(true);
    expect(inspect(twin, "FIL-3").status).toBe("alarm");
    expect(inspect(twin, "V-311").status).toBe("alarm");
    expect(inspect(twin, "CC-301").status).toBe("alarm");
    expect(twin.areas.find((area) => area.id === "nh3_hazard")?.status).toBe("alarm");
    const stopped = edit(openValve, "FIL-3", (asset) => ({ ...asset, process: { ...asset.process, running: false } }));
    expect(readMonitors(stopped).map((alert) => alert.id)).not.toContain("interlock:cip-production");
  });
});
