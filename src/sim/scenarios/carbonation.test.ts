/** Verifies the carbonation exercise across its physical and software control branches. */
import { describe, expect, it } from "vitest";
import { isKnownTechnique } from "@/data/attack-ics";
import { applyEffects } from "@/twin/effects";
import { assetById } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { Twin } from "@/twin/types";
import { projectScenarioMitigations, runScenario } from "../engine";
import { carbonation } from "./carbonation";

function openBlendBoundary(twin: Twin): Twin {
  return { ...twin, conduits: twin.conduits.map((conduit) => conduit.id === "C-OPS-BLEND"
    ? { ...conduit, enforcedBy: null } : conduit) };
}

describe("carbonation exercise", () => {
  it("uses the seed's enforced blend boundary and advances when just that control is absent", () => {
    const seed = runScenario("carbonation", SEED_TWIN);
    expect(seed).toMatchObject({ contained: true, containedAt: 0, consequence: { metrics: {
      peakPressureBar: 2.6, reliefDemand: false, foaming: false, heldL: 0, lineStopped: false,
    } } });
    expect(seed.stages[0]).toMatchObject({ outcome: "blocked", by: "Blend cell segmentation", where: ["SW-OT"] });
    expect(seed.counterfactual).toMatchObject({ removedControl: "Blend cell segmentation", consequence: { metrics: { heldL: 60 } } });

    const without = carbonation.stages(SEED_TWIN)[0].control?.without;
    const exposed = openBlendBoundary(SEED_TWIN);
    expect(without?.(SEED_TWIN)).toEqual(exposed);
    expect(without?.(SEED_TWIN).assets).toBe(SEED_TWIN.assets);
    const run = runScenario("carbonation", exposed);
    expect(run).toEqual(runScenario("carbonation", exposed));
    expect(run).toMatchObject({ contained: false, consequence: { metrics: {
      peakPressureBar: 3.175, reliefDemand: true, foaming: true, heldL: 60, lineStopped: true,
    } } });
    expect(run.stages.every(({ outcome }) => outcome === "advanced")).toBe(true);
    expect(run.stages.some(({ technique }) => technique === "T0836" && isKnownTechnique(technique))).toBe(true);
  });

  it("projects machine-applicable physical and software protections independently", () => {
    const exposed = applyEffects(openBlendBoundary(SEED_TWIN), [
      { type: "add_protection", assetId: "CC-301", protection: "maintenance-isolation" },
    ]);
    const snapshot = structuredClone(exposed);
    const proposals = projectScenarioMitigations("carbonation", exposed);
    const physical = proposals.find(({ id }) => id === "sim-carbonation-independent");
    const software = proposals.find(({ id }) => id === "sim-carbonation-boundary");
    expect(physical).toMatchObject({ kind: "physical", proposedBy: "inspector", status: "proposed" });
    expect(software).toMatchObject({ kind: "software", proposedBy: "inspector", status: "proposed" });

    const physicallyProtected = applyEffects(exposed, physical!.effects);
    const pressure = runScenario("carbonation", physicallyProtected);
    expect(pressure).toMatchObject({ contained: true, containedAt: 18, consequence: { metrics: {
      peakPressureBar: 3, reliefDemand: false, foaming: false, heldL: 0, lineStopped: false,
    } } });
    expect(pressure.stages.at(-1)).toMatchObject({ by: "Independent pressure protection", where: ["CC-301"] });
    expect(pressure.counterfactual).toMatchObject({ removedControl: "Independent pressure protection", consequence: { metrics: { heldL: 60 } } });
    const gate = carbonation.stages(physicallyProtected).find(({ t }) => t === 18)?.control;
    const removed = gate?.without?.(physicallyProtected);
    expect(removed?.conduits).toBe(physicallyProtected.conduits);
    expect(assetById(removed!, "CC-301")?.protections).toEqual(["maintenance-isolation"]);
    expect(runScenario("carbonation", removed!).contained).toBe(false);

    expect(runScenario("carbonation", applyEffects(exposed, software!.effects))).toMatchObject({ contained: true, containedAt: 0 });
    expect(exposed).toEqual(snapshot);
  });

  it("credits an isolated gas feed and derives excursions and withheld volume from the current twin", () => {
    const exposed = openBlendBoundary(SEED_TWIN);
    const isolated = applyEffects(exposed, [{ type: "remove_connection", assetId: "HX-401", to: "CC-301", medium: "co2" }]);
    expect(runScenario("carbonation", isolated)).toMatchObject({ contained: true, containedAt: 6, consequence: { metrics: {
      peakPressureBar: 2.6, heldL: 0,
    } } });

    const slower: Twin = { ...exposed, assets: exposed.assets.map((asset) => {
      if (asset.id !== "FT-403" && asset.id !== "PT-301") return asset;
      return { ...asset, process: { ...asset.process, telemetry: asset.process?.telemetry?.map((point) =>
        asset.id === "FT-403" ? { ...point, value: 9 } : { ...point, lo: 2.5, hi: 3.1 },
      ) } };
    }) };
    expect(runScenario("carbonation", slower).consequence.metrics).toMatchObject({ peakPressureBar: 3.43, heldL: 30 });
  });
});
