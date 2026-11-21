/** Checks loss calibration, controls, determinism and the complete seed asset/rule matrix. */
import { describe, expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { placementHomeRule } from "@/rules/placement";
import { RULES } from "@/rules/registry";
import { SEED_TWIN } from "@/twin/seed";
import type { Asset, Mitigation, RuleFinding, Twin } from "@/twin/types";
import { consequenceEconomics } from "./economics";
import { estimateLoss, formatUsd, plantExposure } from "./model";
import { scenarioFromFinding, scenarioFromWatch } from "./scenarios";
import type { LossEstimate, LossScenario } from "./types";
import { assetValuation } from "./valuation";

function asset(id: string): Asset {
  return SEED_TWIN.assets.find((entry) => entry.id === id)!;
}

function withAsset(changed: Asset): Twin {
  return { ...SEED_TWIN, assets: [...SEED_TWIN.assets.filter(({ id }) => id !== changed.id), changed] };
}

function testScenario(assetId: string, consequence: LossScenario["consequence"] = "processStop"): LossScenario {
  return { id: "fixed-test", assetId, consequence, trigger: { id: "test", kind: "rule", label: "Test scenario" } };
}

function line(estimate: LossEstimate, key: LossEstimate["components"][number]["key"]) {
  return estimate.components.find((component) => component.key === key)!;
}

describe("deterministic economic model", () => {
  it("uses the scenario identifier rather than twin or object identity for draws", () => {
    const scenario = testScenario("PLC-F3");
    const first = estimateLoss(SEED_TWIN, scenario);
    const again = estimateLoss(structuredClone(SEED_TWIN), structuredClone(scenario));
    expect(again).toEqual(first);
    expect(estimateLoss(SEED_TWIN, { ...scenario, id: "another-seed" }).p50).not.toBe(first.p50);
    expect(first.p10).toBeLessThan(first.p50);
    expect(first.p50).toBeLessThan(first.p90);
    expect(first.annualised).toBe(first.frequency.lef * first.lossIfManifests);
  });

  it("moves exploit evidence, protections, and a relevant approval in the expected directions", () => {
    const origin = asset("PLC-F3");
    const advisory = {
      id: "test-cve", title: "Controller advisory", url: "", cves: [], published: "",
      summary: "CVSS base score: 9.8",
    };
    const scored = scenarioFromWatch(SEED_TWIN, { ...advisory, source: "cisa-ics" }, origin.id);
    const exploited = scenarioFromWatch(SEED_TWIN, { ...advisory, source: "cisa-kev" }, origin.id);
    const standard = estimateLoss(SEED_TWIN, scored);
    expect(estimateLoss(SEED_TWIN, exploited).annualised).toBeGreaterThan(standard.annualised);

    const protectedTwin = withAsset({ ...origin, protections: [...origin.protections ?? [], "test-independent-safeguard"] });
    expect(estimateLoss(protectedTwin, scored).frequency.vulnerability).toBeLessThan(standard.frequency.vulnerability);
    const mitigation: Mitigation = {
      id: "test-mitigation", title: "Install an independent safeguard", description: "Test",
      kind: "physical", targets: [origin.id], status: "approved", proposedBy: "inspector",
      effects: [{ type: "add_protection", assetId: origin.id, protection: "test-independent-safeguard" }],
    };
    expect(estimateLoss(SEED_TWIN, { ...scored, mitigation }).frequency.vulnerability)
      .toBeLessThan(standard.frequency.vulnerability);
    expect(estimateLoss(SEED_TWIN, { ...scored, mitigation: { ...mitigation, status: "proposed" } }).annualised)
      .toBe(standard.annualised);
  });

  it("lowers TEF when the WAN conduit is enforced", () => {
    const scenario = testScenario("FW-EDGE", "device");
    const open: Twin = {
      ...SEED_TWIN,
      conduits: SEED_TWIN.conduits.map((conduit) => conduit.id === "C-WAN-ENT" ? { ...conduit, enforcedBy: null } : conduit),
    };
    expect(estimateLoss(SEED_TWIN, scenario).frequency.tef).toBeLessThan(estimateLoss(open, scenario).frequency.tef);
  });

  it("uses the line and the control graph to distinguish a full stop from a redundant or partial stop", () => {
    const filler = assetValuation(SEED_TWIN, asset("FIL-3"));
    const controller = assetValuation(SEED_TWIN, asset("PLC-F3"));
    const primary = asset("P-301");
    const backup: Asset = {
      ...primary, id: "P-301-STANDBY", description: "Automatic standby transfer pump.",
      physical: { ...primary.physical, connections: primary.physical.connections.map((connection) => ({
        ...connection, active: false, label: "Automatic standby product discharge",
      })) },
    };
    const redundant = {
      ...SEED_TWIN, assets: [...SEED_TWIN.assets.map((candidate) => candidate.id === "CC-301"
        ? { ...candidate, physical: { ...candidate.physical, connections: [
          ...candidate.physical.connections, { to: backup.id, medium: "product" as const, label: "Automatic standby" },
        ] } } : candidate), backup],
    };
    const scenario = testScenario(primary.id);
    const full = estimateLoss(SEED_TWIN, scenario);
    const partial = estimateLoss(SEED_TWIN, { ...testScenario("HMI-F3"), id: scenario.id });
    expect(filler.dependency).toBe(1);
    expect(controller.dependency).toBe(1);
    expect(full.assetValue.dependency).toBeGreaterThan(partial.assetValue.dependency);
    expect(full.lossIfManifests).toBeGreaterThan(partial.lossIfManifests);
    expect(assetValuation(SEED_TWIN, asset("C-1")).dependency).toBe(0);
    expect(line(estimateLoss(redundant, scenario), "downtime").mean).toBe(0);
  });

  it("reconciles component means and makes liability exactly zero outside its classes", () => {
    for (const consequence of Object.keys(consequenceEconomics) as LossScenario["consequence"][]) {
      const estimate = estimateLoss(SEED_TWIN, testScenario("PLC-F3", consequence));
      expect(estimate.components.reduce((sum, component) => sum + component.mean, 0)).toBeCloseTo(estimate.lossIfManifests, 8);
      expect(estimate.items.reduce((sum, item) => sum + item.total, 0) + estimate.otherLines.reduce((sum, cost) => sum + cost.amount, 0))
        .toBeCloseTo(estimate.lossIfManifests, 7);
      const liability = line(estimate, "regulatory");
      if (consequence !== "ammoniaRelease" && consequence !== "productRecall") {
        expect(liability).toMatchObject({ low: 0, mode: 0, high: 0, mean: 0 });
        expect(estimate.otherLines.some(({ key }) => key === "regulatory")).toBe(false);
      } else {
        expect(liability.mean).toBeGreaterThan(1_000_000);
      }
    }
  });

  it("evaluates every current rule for every seed asset without non-finite or negative costs", () => {
    expect(SEED_TWIN.assets).toHaveLength(92);
    for (const origin of SEED_TWIN.assets) {
      for (const rule of [...RULES, placementHomeRule]) {
        const finding: RuleFinding = {
          ruleId: rule.id, title: rule.title, kind: rule.kind, detail: "",
          assetId: origin.id, severity: 3, references: [...rule.references],
        };
        const estimate = estimateLoss(SEED_TWIN, scenarioFromFinding(SEED_TWIN, finding));
        const numbers = [
          estimate.lossIfManifests, estimate.p10, estimate.p50, estimate.p90, estimate.annualised,
          ...Object.values(estimate.assetValue), estimate.frequency.tef, estimate.frequency.vulnerability, estimate.frequency.lef,
          ...estimate.items.flatMap((item) => [item.installedReplacement, item.total, ...item.roles.map(({ amount }) => amount)]),
        ];
        if (!numbers.every((n) => Number.isFinite(n) && n >= 0)) {
          throw new Error(`Invalid loss for ${origin.id} · ${rule.id}`);
        }
        expect(estimate.assetValue.replacement).toBeGreaterThan(0);
      }
    }
  }, 120_000);

  it("retains the maximum annual loss for triggers with the same asset and outcome", () => {
    const baseline = evaluateTwin(SEED_TWIN);
    const finding = baseline.findings.find(({ ruleId, assetId }) => ruleId === "USB-01" && assetId === "HMI-F3")!;
    const generic = { ...finding, ruleId: "GENERIC-TEST", title: "Generic detection" };
    const individual = [finding, generic].map((candidate) =>
      estimateLoss(SEED_TWIN, scenarioFromFinding(SEED_TWIN, candidate)).annualised);
    const report = { ...baseline, findings: [finding, finding, generic], paths: [] };
    const result = plantExposure(SEED_TWIN, report);
    expect(result.totalAnnualised).toBe(Math.max(...individual));
    expect(result.topScenarios).toHaveLength(1);
  });
});

describe("USD formatting", () => {
  it.each([[0, "$0"], [8.29, "$8.3"], [4201, "$4.2k"], [184000, "$180k"], [2390000, "$2.4M"],
    [999990, "$1M"], [-121500, "−$120k"], [0.001, "<$0.01"], [NaN, "—"]] as const)("formats %s as %s", (value, text) => {
    expect(formatUsd(value)).toBe(text);
  });
});
