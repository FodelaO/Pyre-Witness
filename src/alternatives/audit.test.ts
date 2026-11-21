/** Recomputes Better-options figures by hand for a Wi-Fi PLC placed at Filler 3 the way the pipeline does. */
import { expect, it } from "vitest";
import { plantExposure } from "@/econ/model";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import type { DeviceProfile, DropPoint } from "@/pipeline/types";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import type { Twin } from "@/twin/types";
import { evaluateAlternatives, findingClauseIds } from "./evaluate";
import type { Candidate } from "./types";

const profile = {
  device_type: "Wi-Fi PLC", category: "controller", object_class: "networked_device",
  vendor: null, model: null, radios: ["wifi"], ports: ["RJ45 Ethernet"], storage: null,
  default_credentials_visible: true, default_credentials_note: null, cloud_connectivity: false,
  power: null, physical_kind: "plc_cabinet", capacity_or_size: null, material: null, food_grade: null,
  hazardous_area_rating: null, ip_rating: null, evidence: [], unknowns: [], confidence: 0.9,
} as unknown as DeviceProfile;
const drop = { area: "filler3", x: 620, y: 540 } as unknown as DropPoint;
const plc = assetFromProfile(profile, SEED_TWIN, "AUDIT-WIFI-PLC", drop);
const twin: Twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, plc] };
const radioOff: Candidate = { name: "Radio off", kind: "plc_cabinet", rationale: "-", source: "rules", cost: [45, 90, 180],
  effects: [{ type: "disable_radio", assetId: plc.id, radio: "wifi" }] };
const hardened: Candidate = { name: "Hardened", kind: "plc_cabinet", rationale: "-", source: "carbon", cost: [500, 1500, 4000],
  effects: [...radioOff.effects, { type: "patch_cyber", assetId: plc.id, patch: { managed: true, defaultCredentials: false } }] };

function measure(t: Twin) {
  const risk = evaluateTwin(t);
  const own = risk.findings.filter((f) => f.assetId === plc.id && (f.kind === "compliance" || findingClauseIds(f).length > 0));
  return { score: risk.score, loss: plantExposure(t, risk).totalAnnualised, gaps: own.length,
    clauses: new Set(own.flatMap(findingClauseIds)) };
}

it("matches hand-computed risk, gaps, clauses, loss avoided and 5-year net value", () => {
  const before = measure(twin);
  const results = evaluateAlternatives(twin, plc.id, [radioOff, hardened]);
  for (const candidate of [radioOff, hardened]) {
    const after = measure(applyEffects(twin, candidate.effects));
    const result = results.find((item) => item.candidate === candidate)!;
    const avoided = before.loss - after.loss;
    expect(result.riskDelta).toBeCloseTo(after.score - before.score, 9);
    expect(result.complianceReduction).toBe(before.gaps - after.gaps);
    expect(new Set(result.removedClauses)).toEqual(new Set([...before.clauses].filter((id) => !after.clauses.has(id))));
    expect(result.annualLossAvoided).toBeCloseTo(avoided, 6);
    expect(result.net).toBeCloseTo(avoided - candidate.cost![1] / 5, 6);
  }
  const radio = results.find((item) => item.candidate === radioOff)!;
  expect(radio.complianceReduction).toBe(1);
  expect(radio.removedClauses).toEqual(expect.arrayContaining(["iec62443-3-3-sr-1.6", "iec62443-3-3-sr-2.2"]));
  expect(results.map(({ candidate }) => candidate.name)).toEqual(["Hardened", "Radio off"]);
  expect(results.every(({ qualifies }) => qualifies)).toBe(true);
});

it("never recommends on net value alone or on compliance alone", () => {
  const [result] = evaluateAlternatives(twin, plc.id, [{ ...radioOff, cost: [1e9, 1e9, 1e9] }]);
  expect(result.complianceReduction).toBeGreaterThan(0);
  expect(result.qualifies).toBe(false);
  const [noOp] = evaluateAlternatives(twin, plc.id, [{ ...radioOff, effects: [], cost: [0, 0, 0] }]);
  expect(noOp).toMatchObject({ net: 0, complianceReduction: 0, qualifies: false });
});
