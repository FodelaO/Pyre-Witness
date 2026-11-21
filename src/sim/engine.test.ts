/** Exercises all five fictional incidents, the shared approval queue, and exact rollback. */
import { afterEach, describe, expect, it } from "vitest";
import { isKnownTechnique } from "@/data/attack-ics";
import { applyEffects } from "@/twin/effects";
import { assetById } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import type { Asset, Twin } from "@/twin/types";
import { projectScenarioMitigations, runScenario } from "./engine";
import { useSimStore } from "./simStore";
import type { ScenarioId } from "./types";

function sharedUtilityResponse(): Twin {
  return {
    ...SEED_TWIN,
    assets: SEED_TWIN.assets.map((asset) => {
      if (asset.id === "PLC-UT") return { ...asset, safetyCritical: false };
      if (asset.id === "SW-UT" && asset.cyber) {
        return { ...asset, cyber: { ...asset.cyber, remoteAccess: true, cloudConnected: true, radios: ["cellular"] } };
      }
      return asset;
    }),
  };
}

function addedRadio(): Twin {
  const officeRadio = assetById(SEED_TWIN, "AP-IT")!;
  const endpoint: Asset = {
    ...officeRadio, id: "EXERCISE-RADIO", origin: "added",
    physical: { ...officeRadio.physical, area: "filler3", x: 760, y: 660, connections: [] },
    network: { level: 2, area: "Cell F3", conduit: "C-OPS-F3", protocols: ["HTTPS"] },
  };
  return { ...SEED_TWIN, assets: [...SEED_TWIN.assets, endpoint] };
}

const fixtures: { scenario: ScenarioId; vulnerable: () => Twin; control: string; metric: string; observed: number }[] = [
  { scenario: "cip", vulnerable: () => applyEffects(SEED_TWIN, [{ type: "remove_asset", assetId: "ZSC-311" }]),
    control: "sim-cip-isolate", metric: "contaminatedM3", observed: 0.15 },
  { scenario: "ammonia", vulnerable: sharedUtilityResponse,
    control: "sim-ammonia-remote", metric: "peakPpm", observed: 330 },
  { scenario: "ransomware", vulnerable: () => ({
    ...SEED_TWIN,
    conduits: SEED_TWIN.conduits.map((conduit) => ["C-ENT-DMZ", "C-DMZ-OPS", "C-OPS-F3"].includes(conduit.id)
      ? { ...conduit, enforcedBy: null } : conduit),
  }), control: "sim-ransomware-C-ENT-DMZ", metric: "areasStopped", observed: 2 },
  { scenario: "wireless", vulnerable: addedRadio,
    control: "sim-wireless-radio", metric: "fillerRateBph", observed: 29520 },
  { scenario: "chiller", vulnerable: sharedUtilityResponse,
    control: "sim-chiller-remote", metric: "outletTempC", observed: 6.5 },
];

describe("scenario engine", () => {
  it.each(fixtures)("resolves $scenario against safeguards and a vulnerable copy", ({ scenario, vulnerable, control, metric, observed }) => {
    const stock = runScenario(scenario, SEED_TWIN);
    expect(stock.contained).toBe(true);
    expect(stock.stages.at(-1)).toMatchObject({ outcome: "blocked", t: stock.containedAt });

    const twin = vulnerable();
    const snapshot = structuredClone(twin);
    const run = runScenario(scenario, twin);
    expect(run).toEqual(runScenario(scenario, twin));
    expect(run.contained).toBe(false);
    expect(run.consequence.metrics[metric]).toBe(observed);
    expect(run.stages.every((stage) => stage.outcome === "advanced" && (!stage.technique || isKnownTechnique(stage.technique)))).toBe(true);
    expect(run.stages.map(({ t }) => t)).toEqual(run.stages.map(({ t }) => t).sort((a, b) => a - b));

    const candidates = projectScenarioMitigations(scenario, twin);
    const mitigation = candidates.find(({ id }) => id === control);
    expect(mitigation).toMatchObject({ status: "proposed", proposedBy: "inspector", riskDelta: expect.any(Number) });
    const changed = runScenario(scenario, applyEffects(twin, mitigation!.effects));
    expect(mitigation!.simulationContainment).toEqual({
      before: run.containedAt ?? null, after: changed.containedAt, safeguard: changed.stages.at(-1)?.by,
    });
    expect(changed.contained).toBe(true);
    expect(changed.containedAt).toBeLessThan(run.stages.at(-1)!.t);
    expect(changed.stages.at(-1)?.effects).toBeUndefined();
    expect(twin).toEqual(snapshot);
  });

  it("credits independent ammonia protection with the network exposure present", () => {
    const twin = sharedUtilityResponse();
    const restored = { ...twin, assets: twin.assets.map((asset) =>
      asset.id === "PLC-UT" ? { ...asset, safetyCritical: true } : asset) };
    const run = runScenario("ammonia", restored);
    expect(run.contained).toBe(true);
    expect(run.consequence.metrics.evacuation).toBe(false);
  });
});

describe("scenario player", () => {
  afterEach(() => {
    useSimStore.getState().reset();
    useSimStore.getState().setSpeed(1);
    useTwinStore.getState().reset();
  });

  it("pauses stage playback, keeps twin updates quiet, and restores the exact starting twin", () => {
    const { setTwin, addAsset } = useTwinStore.getState();
    setTwin(addedRadio());
    const before = useTwinStore.getState();
    const { start, advance, setSpeed, togglePlayback, tickPlant, reset } = useSimStore.getState();
    start("wireless");
    advance(2);
    togglePlayback();
    advance(30);
    expect(useSimStore.getState().elapsed).toBe(2);
    tickPlant();
    tickPlant();
    expect(useTwinStore.getState().twin).not.toBe(before.twin);
    togglePlayback();
    setSpeed(4);
    advance(7);
    expect(useSimStore.getState().mode).toBe("finished");
    expect(assetById(useTwinStore.getState().twin, "FIL-3")?.status).toBe("alarm");
    expect(useTwinStore.getState().risk).toBe(before.risk);
    reset();
    expect(useTwinStore.getState().twin).toBe(before.twin);
    expect(useSimStore.getState().run).toBeNull();

    start("wireless");
    advance(7);
    const added = { ...assetById(before.twin, "EXERCISE-RADIO")!, id: "SECOND-DEVICE" };
    addAsset(added);
    tickPlant();
    reset();
    expect(useTwinStore.getState().twin).toEqual({ ...before.twin, assets: [...before.twin.assets, added] });
  });

  it("queues a control for approval and replays the changed twin", () => {
    useTwinStore.getState().setTwin(addedRadio());
    const { start, advance, togglePlayback } = useSimStore.getState();
    start("wireless");
    advance(30);
    const queue = useTwinStore.getState().mitigations;
    expect(queue.find(({ id }) => id === "sim-wireless-radio")).toMatchObject({ status: "proposed" });
    expect(assetById(useTwinStore.getState().twin, "EXERCISE-RADIO")?.cyber?.radios).toContain("wifi");
    useTwinStore.getState().decideMitigation("sim-wireless-radio", "approved");
    togglePlayback();
    expect(useSimStore.getState().run).toMatchObject({ contained: true, containedAt: 4, counterfactual: {
      removedControl: "EXERCISE-RADIO radio disable", consequence: { metrics: { fillerRateBph: 29520 } },
    } });
    expect(useTwinStore.getState().mitigations.find(({ id }) => id === "sim-wireless-radio")?.status).toBe("applied");
    expect(assetById(useTwinStore.getState().twin, "EXERCISE-RADIO")?.cyber?.radios).toEqual([]);
  });

  it("feeds equipment trips into plant ticks and restores the pre-run process", () => {
    const before = sharedUtilityResponse();
    useTwinStore.getState().setTwin(before);
    const { start, advance, tickPlant, reset } = useSimStore.getState();
    start("chiller");
    advance(40);
    tickPlant();
    const twin = useTwinStore.getState().twin;
    expect(assetById(twin, "FIL-3")?.process?.running).toBe(false);
    expect(assetById(twin, "P-301")?.process?.telemetry?.find(({ tag }) => tag === "FT-301")?.value).toBe(0);
    reset();
    expect(useTwinStore.getState().twin).toBe(before);
  });
});
