/** Verifies immutable safeguard subtraction and physical approvals across tabletop exercises. */
import { describe, expect, it } from "vitest";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import { projectScenarioMitigations, runScenario } from "./engine";
import { ALL_SCENARIOS } from "./scenarios";

describe("counterfactual comparison", () => {
  it("shows an incident report before any stock safeguard resolves", () => {
    for (const { id } of Object.values(ALL_SCENARIOS)) {
      const run = runScenario(id, SEED_TWIN);
      const [report, next] = run.stages;
      expect(report).toMatchObject({ t: 0, outcome: "advanced", title: expect.stringMatching(/reported$/) });
      expect(report.effects).toBeDefined();
      expect(next.title).not.toBe(report.title);
      expect(next.t).toBeGreaterThan(0);
      expect(run.containedAt).toBeGreaterThan(0);
    }
  });

  it("quantifies actual and comparison outcomes for all six exercises without changing the seed", () => {
    const before = structuredClone(SEED_TWIN);
    for (const { id } of Object.values(ALL_SCENARIOS)) {
      const run = runScenario(id, SEED_TWIN);
      expect(run.consequence.summary).toMatch(/\d/);
      expect(run.counterfactual.consequence.summary).toMatch(/\d/);
      if (!run.counterfactual.removedControl) {
        expect(run.counterfactual.consequence).toEqual(run.consequence);
      }
    }
    expect(SEED_TWIN).toEqual(before);
  });

  it("subtracts the legacy CIP permissive for a quantitative impact comparison", () => {
    const run = runScenario("cip", SEED_TWIN);
    expect(run).toMatchObject({ containedAt: 12, consequence: { metrics: { contaminatedM3: 0 } } });
    expect(run.counterfactual).toMatchObject({
      removedControl: "ZSC-311 hardwired permissive",
      consequence: { metrics: { contaminatedM3: 0.15 } },
    });
  });
});

describe("independent physical controls", () => {
  it("projects V-311 hardware earlier and retains the old permissive in the alternate replay", () => {
    const item = projectScenarioMitigations("cip", SEED_TWIN).find(({ id }) => id === "sim-cip-hardwired-interlock");
    expect(item).toMatchObject({ kind: "physical", effects: [
      { type: "add_protection", assetId: "V-311", protection: "hardwired-interlock" },
    ] });
    const run = runScenario("cip", applyEffects(SEED_TWIN, item!.effects));
    expect(run).toMatchObject({ containedAt: 10, counterfactual: {
      removedControl: "V-311 hardwired interlock", containedAt: 12, heldBy: "ZSC-311 hardwired permissive",
    } });
  });

  it.each(["port-lock", "locked-cabinet"])("blocks the remaining local entry with a physical %s", (protection) => {
    const twin = applyEffects(SEED_TWIN, [{
      type: "enforce_conduit", conduitId: "C-F3-PACK", enforcedBy: "SW-F3", allows: [],
    }]);
    const item = ALL_SCENARIOS.cip.mitigations(twin).find(({ id }) => id === `sim-cip-${protection}`);
    expect(item).toMatchObject({ kind: "physical", effects: [{ type: "add_protection", assetId: "HMI-F3", protection }] });
    const run = runScenario("cip", applyEffects(twin, item!.effects));
    expect(run).toMatchObject({ containedAt: 4, counterfactual: { containedAt: 12 } });
  });

  it("credits added ammonia safeguards without losing documented protection on unrelated approval", () => {
    const unrelated = applyEffects(SEED_TWIN, [{ type: "add_protection", assetId: "PLC-UT", protection: "locked-cabinet" }]);
    expect(runScenario("ammonia", unrelated)).toMatchObject({ containedAt: 16 });
    const item = projectScenarioMitigations("ammonia", unrelated).find(({ id }) => id === "sim-ammonia-safeguards");
    expect(item).toMatchObject({ kind: "physical", effects: [
      { type: "add_protection", assetId: "GT-401", protection: "independent-gas-detection" },
      { type: "add_protection", assetId: "PLC-UT", protection: "emergency-ventilation" },
    ] });
    const marked = applyEffects(unrelated, item!.effects);
    expect(runScenario("ammonia", marked)).toMatchObject({ containedAt: 12, counterfactual: { containedAt: 16 } });
    expect(runScenario("ammonia", SEED_TWIN).counterfactual.consequence.metrics.evacuation).toBe(true);
  });
});
