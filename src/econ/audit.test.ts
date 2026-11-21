/** FAIR audit properties: frequency semantics, no double counting, reconciliation, ranking and de-duplication. */
import { describe, expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import type { Asset, Mitigation, Twin } from "@/twin/types";
import { consequenceEconomics, FREQUENCY, penaltyBenchmark, type Consequence } from "./economics";
import { displayLedger } from "./displayLedger";
import { METHOD_FOOTER } from "./format";
import { estimateLoss, plantExposure, SEVERITY_CORRELATION } from "./model";
import { pertMean } from "./pert";
import { scenarioFromFinding, scenarioFromPath, scenarioFromWatch } from "./scenarios";
import type { LossEstimate, LossScenario } from "./types";

const report = evaluateTwin(SEED_TWIN);
const CONSEQUENCES = Object.keys(consequenceEconomics) as Consequence[];

function asset(id: string): Asset {
  return SEED_TWIN.assets.find((entry) => entry.id === id)!;
}

function withAsset(changed: Asset): Twin {
  return { ...SEED_TWIN, assets: SEED_TWIN.assets.map((entry) => entry.id === changed.id ? changed : entry) };
}

function scenario(assetId: string, consequence: Consequence, trigger: Partial<LossScenario["trigger"]> = {}): LossScenario {
  return {
    id: JSON.stringify(["audit", assetId, consequence, trigger]), assetId, consequence,
    trigger: { kind: "rule", id: "audit", label: "Audit scenario", ...trigger },
  };
}

function component(estimate: LossEstimate, key: LossEstimate["components"][number]["key"]) {
  return estimate.components.find((part) => part.key === key)!;
}

function advisory(source: "cisa-kev" | "cisa-ics", summary: string) {
  return { id: "audit-advisory", title: "Controller advisory", url: "", cves: [], published: "", summary, source };
}

describe("loss event frequency", () => {
  it("keeps TEF a yearly frequency, vulnerability a probability, and LEF and ALE their products", () => {
    const scenarios = [
      ...report.findings.map((finding) => scenarioFromFinding(SEED_TWIN, finding)),
      ...report.paths.map((path) => scenarioFromPath(SEED_TWIN, path)),
      scenarioFromWatch(SEED_TWIN, advisory("cisa-kev", "CVSS 10"), "PLC-F3"),
    ];
    const highestContact = Math.max(...Object.values(FREQUENCY.exposure).map(({ value }) => pertMean(value)));
    for (const entry of scenarios) {
      const { frequency, annualised, lossIfManifests } = estimateLoss(SEED_TWIN, entry);
      expect(frequency.tef).toBeGreaterThan(0);
      expect(frequency.tef).toBeLessThanOrEqual(highestContact);
      expect(frequency.vulnerability).toBeGreaterThan(0);
      expect(frequency.vulnerability).toBeLessThanOrEqual(1);
      expect(frequency.lef).toBe(frequency.tef * frequency.vulnerability);
      expect(annualised).toBe(frequency.lef * lossIfManifests);
    }
  }, 120_000);

  it("orders the evidence priors and never lets a prior or a control factor leave [0, 1]", () => {
    const mean = (key: keyof typeof FREQUENCY.conversion) => pertMean(FREQUENCY.conversion[key].value);
    expect(mean("kev")).toBeGreaterThan(mean("credential"));
    expect(mean("credential")).toBeGreaterThan(mean("cvssMaximum"));
    expect(mean("cvssMaximum")).toBeGreaterThan(mean("unmanaged"));
    expect(mean("unmanaged")).toBeGreaterThan(mean("generic"));
    expect(mean("generic")).toBeGreaterThan(mean("cvssBase"));
    expect(mean("cvssBase")).toBeGreaterThan(mean("compliance") - 0.02);
    for (const { value: [low, mode, high] } of Object.values(FREQUENCY.conversion)) {
      expect(low).toBeGreaterThanOrEqual(0);
      expect(low).toBeLessThanOrEqual(mode);
      expect(mode).toBeLessThanOrEqual(high);
      expect(high).toBeLessThanOrEqual(1);
    }
    for (const { value } of Object.values(FREQUENCY.controls)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
    const contact = (key: keyof typeof FREQUENCY.exposure) => pertMean(FREQUENCY.exposure[key].value);
    expect(contact("internet")).toBeGreaterThan(contact("cloud"));
    expect(contact("remote")).toBeGreaterThan(contact("rf"));
    expect(contact("rf")).toBeGreaterThan(contact("visitor"));
    expect(contact("removable")).toBeGreaterThan(contact("internal"));
  }, 120_000);

  it("ranks known exploitation above a severity score, and a higher score above a lower one", () => {
    for (const id of ["PLC-F3", "HMI-F3", "SCADA-03"]) {
      const kev = estimateLoss(SEED_TWIN, scenarioFromWatch(SEED_TWIN, advisory("cisa-kev", "CVSS base score: 9.8"), id));
      const critical = estimateLoss(SEED_TWIN, scenarioFromWatch(SEED_TWIN, advisory("cisa-ics", "CVSS base score: 9.8"), id));
      const medium = estimateLoss(SEED_TWIN, scenarioFromWatch(SEED_TWIN, advisory("cisa-ics", "CVSS base score: 5.3"), id));
      expect(kev.frequency.tef).toBe(critical.frequency.tef);
      expect(kev.frequency.vulnerability).toBeGreaterThan(critical.frequency.vulnerability * 1.5);
      expect(critical.frequency.vulnerability).toBeGreaterThan(medium.frequency.vulnerability);
      expect(kev.annualised).toBeGreaterThan(critical.annualised);
      expect(critical.annualised).toBeGreaterThan(medium.annualised);
    }
  }, 120_000);

  it("credits a safeguard once: resistance in vulnerability, a port lock in exposure only", () => {
    const origin = asset("HMI-F3");
    const entry = scenario(origin.id, "processStop");
    const baseline = estimateLoss(SEED_TWIN, entry).frequency;
    const bare = withAsset({ ...origin, protections: [] });
    const one = withAsset({ ...origin, protections: ["audit-safeguard-a"] });
    const two = withAsset({ ...origin, protections: ["audit-safeguard-a", "audit-safeguard-b"] });
    const none = estimateLoss(bare, entry).frequency;
    const single = estimateLoss(one, entry).frequency;
    const double = estimateLoss(two, entry).frequency;
    expect(single.tef).toBe(none.tef);
    expect(single.vulnerability).toBeCloseTo(none.vulnerability * FREQUENCY.controls.protection.value, 12);
    expect(double.vulnerability).toBeCloseTo(none.vulnerability * FREQUENCY.controls.protection.value ** 2, 12);

    const locked = estimateLoss(withAsset({ ...origin, protections: ["port-lock"] }), entry).frequency;
    expect(locked.vulnerability).toBe(none.vulnerability);
    expect(locked.tef).toBeLessThanOrEqual(none.tef);
    expect(baseline.lef).toBeGreaterThan(0);
  }, 120_000);

  it("prices a mechanism-specific finding on that mechanism and credits its port lock in TEF", () => {
    const finding = report.findings.find(({ ruleId, assetId }) => ruleId === "USB-01" && assetId === "HMI-F3")!;
    const open = estimateLoss(SEED_TWIN, scenarioFromFinding(SEED_TWIN, finding));
    expect(open.frequency.drivers[0]).toMatch(/Removable|Visitor/);
    const origin = asset("HMI-F3");
    const lockedTwin = withAsset({ ...origin, protections: [...origin.protections ?? [], "port-lock"] });
    const locked = estimateLoss(lockedTwin, scenarioFromFinding(lockedTwin, finding));
    expect(locked.frequency.vulnerability).toBe(open.frequency.vulnerability);

    const radio = report.findings.find(({ ruleId }) => ruleId === "RF-01")!;
    expect(estimateLoss(SEED_TWIN, scenarioFromFinding(SEED_TWIN, radio)).frequency.drivers[0]).toMatch(/Radio/);
  }, 120_000);

  it("prices an approved mitigation on the projected twin, so applying it changes nothing further", () => {
    const origin = asset("PLC-F3");
    const entry = scenarioFromWatch(SEED_TWIN, advisory("cisa-ics", "CVSS base score: 9.8"), origin.id);
    const mitigation: Mitigation = {
      id: "audit-mitigation", title: "Install an independent safeguard", description: "Audit",
      kind: "physical", targets: [origin.id], status: "approved", proposedBy: "inspector",
      effects: [{ type: "add_protection", assetId: origin.id, protection: "audit-independent-safeguard" }],
    };
    const before = estimateLoss(SEED_TWIN, entry).frequency;
    const approved = estimateLoss(SEED_TWIN, { ...entry, mitigation }).frequency;
    const appliedTwin = applyEffects(SEED_TWIN, mitigation.effects);
    const applied = estimateLoss(appliedTwin, { ...entry, mitigation: { ...mitigation, status: "applied" } }).frequency;
    expect(approved.vulnerability).toBeCloseTo(before.vulnerability * FREQUENCY.controls.protection.value, 12);
    expect(applied.vulnerability).toBeCloseTo(approved.vulnerability, 12);
    expect(applied.tef).toBe(approved.tef);
    expect(estimateLoss(SEED_TWIN, { ...entry, mitigation: { ...mitigation, status: "rejected" } }).frequency.lef).toBe(before.lef);
  }, 120_000);

  it("lowers TEF, and only TEF, when a conduit on the route is enforced", () => {
    const entry = scenario("IT-WS1", "device");
    const open: Twin = {
      ...SEED_TWIN,
      conduits: SEED_TWIN.conduits.map((conduit) => conduit.id === "C-WAN-ENT" ? { ...conduit, enforcedBy: null } : conduit),
    };
    const enforced = estimateLoss(SEED_TWIN, entry).frequency;
    const permissive = estimateLoss(open, entry).frequency;
    expect(enforced.tef).toBeLessThan(permissive.tef);
    expect(enforced.vulnerability).toBe(permissive.vulnerability);
  }, 120_000);
});

describe("loss magnitude", () => {
  it("matches the analytic PERT mean of every component and keeps primary and secondary loss apart", () => {
    for (const consequence of CONSEQUENCES) {
      const estimate = estimateLoss(SEED_TWIN, scenario("PLC-F3", consequence));
      for (const part of estimate.components) {
        const analytic = pertMean([part.low, part.mode, part.high]);
        expect(Math.abs(part.mean - analytic)).toBeLessThanOrEqual(Math.max(1e-9, analytic * 0.015));
      }
      const regulatory = component(estimate, "regulatory").mean;
      expect(estimate.secondaryLoss).toBe(regulatory);
      expect(estimate.primaryLoss + estimate.secondaryLoss).toBeCloseTo(estimate.lossIfManifests, 6);
      const liable = consequence === "ammoniaRelease" || consequence === "productRecall";
      expect(estimate.secondaryLoss > 0).toBe(liable);
      if (!liable) expect(consequenceEconomics[consequence].regulatoryLiability.value).toEqual([0, 0, 0]);
      expect(estimate.p10).toBeLessThanOrEqual(estimate.p50);
      expect(estimate.p50).toBeLessThanOrEqual(estimate.p90);
      expect(estimate.p10).toBeGreaterThanOrEqual(estimate.components.reduce((sum, part) => sum + part.low, 0));
      expect(estimate.p90).toBeLessThanOrEqual(estimate.components.reduce((sum, part) => sum + part.high, 0));
    }
  }, 120_000);

  it("widens the range beyond independent components because outage, product and response move together", () => {
    expect(SEVERITY_CORRELATION).toBeGreaterThan(0);
    expect(SEVERITY_CORRELATION).toBeLessThanOrEqual(1);
    const estimate = estimateLoss(SEED_TWIN, scenario("BL-301", "productHold"));
    // Variance of a sum of independent components is the sum of their PERT variances.
    const independentVariance = estimate.components.reduce((sum, { low, mode, high }) => {
      const mean = pertMean([low, mode, high]);
      return sum + (mean - low) * (high - mean) / 7;
    }, 0);
    const independentWidth = 2 * 1.2816 * Math.sqrt(independentVariance);
    expect(estimate.p90 - estimate.p10).toBeGreaterThan(independentWidth * 1.03);
  }, 120_000);

  it("itemizes exactly one line stop: asset rows plus other lines equal the headline", () => {
    const scenarios = [
      ...report.findings.map((finding) => scenarioFromFinding(SEED_TWIN, finding)),
      ...report.paths.map((path) => scenarioFromPath(SEED_TWIN, path)),
      ...CONSEQUENCES.flatMap((consequence) => ["PLC-F3", "FIL-3", "C-1", "BL-301", "IT-WS1"].map((id) => scenario(id, consequence))),
    ];
    for (const entry of scenarios) {
      const estimate = estimateLoss(SEED_TWIN, entry);
      const rows = estimate.items.reduce((sum, item) => sum + item.total, 0);
      const other = estimate.otherLines.reduce((sum, line) => sum + line.amount, 0);
      expect(rows + other).toBeCloseTo(estimate.lossIfManifests, 6);
      const downtime = estimate.items.flatMap(({ roles }) => roles).filter(({ key }) => key === "downtime");
      expect(downtime.reduce((sum, role) => sum + role.amount, 0)).toBeCloseTo(component(estimate, "downtime").mean, 6);
      if (component(estimate, "downtime").mean > 0) {
        expect(downtime.reduce((sum, role) => sum + role.share!, 0)).toBeCloseTo(1, 12);
      }
      // The rounded headline shown in the app stays within rounding of the simulated mean.
      const shown = displayLedger(estimate).total;
      expect(Math.abs(shown - estimate.lossIfManifests)).toBeLessThanOrEqual(estimate.lossIfManifests * 0.08 + 1);
    }
  }, 120_000);

  it("keeps the expert ranking: recall and ammonia are the tail, a controller stop is mid, a device is trivial", () => {
    const mean = (id: string, consequence: Consequence) => estimateLoss(SEED_TWIN, scenario(id, consequence)).lossIfManifests;
    const recall = mean("BL-301", "productRecall");
    const ammonia = mean("C-1", "ammoniaRelease");
    const controller = mean("PLC-F3", "processStop");
    const operator = mean("HMI-F3", "processStop");
    const workstation = mean("IT-WS1", "device");
    expect(recall).toBeGreaterThan(1_000_000);
    expect(ammonia).toBeGreaterThan(1_000_000);
    expect(Math.min(recall, ammonia)).toBeGreaterThan(5 * mean("FIL-3", "processStop"));
    expect(controller).toBeGreaterThan(20_000);
    expect(controller).toBeLessThan(300_000);
    expect(operator).toBeLessThan(controller);
    expect(workstation).toBeLessThan(10_000);
  }, 120_000);
});

describe("plant roll-up and disclosure", () => {
  it("counts each asset and consequence once, at its highest annualized loss", () => {
    const exposure = plantExposure(SEED_TWIN, report);
    const scenarios = [
      ...report.findings.map((finding) => scenarioFromFinding(SEED_TWIN, finding)),
      ...report.paths.map((path) => scenarioFromPath(SEED_TWIN, path)),
    ];
    const highest = new Map<string, number>();
    let naive = 0;
    for (const entry of scenarios) {
      const { annualised } = estimateLoss(SEED_TWIN, entry);
      naive += annualised;
      const key = `${entry.assetId}|${entry.consequence}`;
      highest.set(key, Math.max(highest.get(key) ?? 0, annualised));
    }
    const expected = [...highest.values()].reduce((sum, value) => sum + value, 0);
    expect(exposure.totalAnnualised).toBeCloseTo(expected, 6);
    expect(exposure.totalAnnualised).toBeLessThan(naive);

    const doubled = { ...report, findings: [...report.findings, ...report.findings], paths: [...report.paths, ...report.paths] };
    expect(plantExposure(SEED_TWIN, doubled).totalAnnualised).toBeCloseTo(exposure.totalAnnualised, 6);
    const keys = exposure.topScenarios.map(({ asset: { id }, consequence }) => `${id}|${consequence}`);
    expect(new Set(keys).size).toBe(keys.length);
  }, 120_000);

  it("labels the one published constant with a source and everything else as assumed", () => {
    expect(penaltyBenchmark).toMatchObject({ basis: "published", value: 165_514, source: "https://www.osha.gov/penalties" });
    const estimate = estimateLoss(SEED_TWIN, scenario("C-1", "ammoniaRelease"));
    for (const input of estimate.assumptions) {
      if (input.basis === "published") expect(input.source).toMatch(/^https:\/\//);
      else expect(input.source).toBeUndefined();
    }
    expect(estimate.assumptions.filter(({ basis }) => basis === "published")).toHaveLength(1);
    expect(METHOD_FOOTER).toBe("FAIR · Monte Carlo 10,000 draws · fixed seed · assumed plant economics (simulated plant)");
  }, 120_000);
});
