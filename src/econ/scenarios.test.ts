/** Verifies trigger adapters, rule-backed routes and the itemized loss ledger. */
import { describe, expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { runScenario } from "@/sim/engine";
import { ALL_SCENARIOS } from "@/sim/scenarios";
import type { SimScenarioId } from "@/sim/types";
import { SEED_TWIN } from "@/twin/seed";
import type { ThreatItem } from "@/watch/types";
import { frequencyInputs } from "./frequency";
import { estimateLoss } from "./model";
import { scenarioFromCompliance, scenarioFromFinding, scenarioFromPath, scenarioFromSimulation, scenarioFromWatch } from "./scenarios";
import type { LossEstimate } from "./types";

const report = evaluateTwin(SEED_TWIN);
const filler = SEED_TWIN.assets.find(({ id }) => id === "PLC-F3")!;
const advisory: ThreatItem = {
  id: "test-advisory", source: "cisa-ics", title: "Controller advisory",
  published: "2026-06-01", cves: [], summary: "", url: "",
};

function expectBalanced(estimate: LossEstimate) {
  const assetTotal = estimate.items.reduce((total, { asset, total: loss, installedReplacement, roles }) => {
    expect(SEED_TWIN.assets.some(({ id }) => id === asset.id)).toBe(true);
    expect(installedReplacement).toBeGreaterThan(0);
    expect(roles.reduce((sum, role) => sum + role.amount, 0)).toBeCloseTo(loss, 7);
    return total + loss;
  }, 0);
  const otherTotal = estimate.otherLines.reduce((total, { amount }) => total + amount, 0);
  expect(new Set(estimate.items.map(({ asset }) => asset.id)).size).toBe(estimate.items.length);
  expect(assetTotal + otherTotal).toBeCloseTo(estimate.lossIfManifests, 7);
}

describe("economic trigger adapters", () => {
  it("prices a rules-engine finding and preserves its displayed detection", () => {
    const finding = report.findings.find(({ assetId, ruleId }) => assetId === "HMI-F3" && ruleId === "USB-01")!;
    const scenario = scenarioFromFinding(SEED_TWIN, finding);
    expect(scenario).toMatchObject({
      assetId: finding.assetId, trigger: { kind: "rule", id: finding.ruleId, label: finding.title },
    });
    expectBalanced(estimateLoss(SEED_TWIN, scenario));
  });

  it("identifies the current rules-engine path and attributes downstream equipment", () => {
    const rulePath = report.paths.find(({ target, entry }) => target === filler.id && entry === "visitor")!;
    const scenario = scenarioFromPath(SEED_TWIN, rulePath);
    const input = frequencyInputs(SEED_TWIN, filler, scenario);
    expect(input.path).toEqual({ entryLabel: "Visitor", basis: "rules", assetIds: rulePath.steps.map(({ to }) => to) });
    const estimate = estimateLoss(SEED_TWIN, scenario);
    expect(estimate.frequency.path.assets.map(({ id }) => id)).toEqual(input.path.assetIds);
    expect(estimate.items.some(({ asset, roles }) => asset.id === "FIL-3" && roles.some(({ key }) => key === "downtime"))).toBe(true);
    expectBalanced(estimate);
  });

  it("uses an explicit advisory CVSS score and ranks it below confirmed exploitation", () => {
    const fromText = scenarioFromWatch(SEED_TWIN, { ...advisory, summary: "CVSS v3.1 base score of 9.8" }, filler.id);
    const low = scenarioFromWatch(SEED_TWIN, { ...advisory, cvss: 3.1 }, filler.id);
    const version = scenarioFromWatch(SEED_TWIN, { ...advisory, summary: "Uses CVSS 3.1 for reporting" }, filler.id);
    const kev = scenarioFromWatch(SEED_TWIN, { ...advisory, source: "cisa-kev" }, filler.id);

    expect(fromText.trigger.cvss).toBe(9.8);
    expect(version.trigger.cvss).toBeUndefined();
    const vulnerability = (scenario: typeof kev) => frequencyInputs(SEED_TWIN, filler, scenario).vulnerability[1];
    expect(vulnerability(kev)).toBeGreaterThan(vulnerability(fromText));
    expect(vulnerability(fromText)).toBeGreaterThan(vulnerability(low));
    expectBalanced(estimateLoss(SEED_TWIN, fromText));
  });

  it("activates liability for contaminated goods that leave the plant and recognizes a held batch", () => {
    const gap = { framework: "Food safety", clause: "Batch release", status: "gap" as const };
    const scenario = (note: string) => scenarioFromCompliance(SEED_TWIN, { ...gap, note }, "FIL-3");
    const shipped = scenario("Contaminated product was shipped to customers.");
    const held = scenario("Contaminated product never left the plant. Batch held.");
    const clear = scenario("No contaminated product was shipped.");
    expect(shipped.consequence).toBe("productRecall");
    expect(held.consequence).toBe("productHold");
    expect(clear.consequence).toBe("processStop");
    expect(estimateLoss(SEED_TWIN, shipped).components.find(({ key }) => key === "regulatory")!.mean).toBeGreaterThan(0);
    expect(estimateLoss(SEED_TWIN, held).components.find(({ key }) => key === "regulatory")!.mean).toBe(0);
    expectBalanced(estimateLoss(SEED_TWIN, shipped));
  });

  it.each(Object.keys(ALL_SCENARIOS) as SimScenarioId[])("prices the observed %s tabletop outcome", (id) => {
    const run = runScenario(id, SEED_TWIN);
    const scenario = scenarioFromSimulation(SEED_TWIN, run)!;
    expect(scenario.trigger).toMatchObject({ id, kind: "simulation" });
    expectBalanced(estimateLoss(SEED_TWIN, scenario));
  });

  it("prices ammonia evacuation from the safeguard replay only when it occurs", () => {
    const run = runScenario("ammonia", SEED_TWIN);
    const safe = scenarioFromSimulation(SEED_TWIN, run)!;
    const evacuation = scenarioFromSimulation(SEED_TWIN, run, run.counterfactual.consequence)!;
    expect(safe.consequence).toBe("device");
    expect(evacuation.consequence).toBe("ammoniaRelease");
    expect(evacuation.simulation).toMatchObject({ stopped: true, throughputLoss: 1 });
    expect(evacuation.simulation?.stoppedAssetIds).toBeUndefined();
    const uncontained = estimateLoss(SEED_TWIN, evacuation);
    expect(uncontained.lossIfManifests).toBeGreaterThan(estimateLoss(SEED_TWIN, safe).lossIfManifests);
    expectBalanced(uncontained);
  });
});
