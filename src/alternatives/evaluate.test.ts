/** Verifies the economic and compliance gates using the seed plant and a captured camera. */
import { expect, it } from "vitest";
import { plantExposure } from "@/econ/model";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import type { Asset } from "@/twin/types";
import { buildCandidates } from "./candidates";
import { evaluateAlternatives, findingClauseIds } from "./evaluate";
import type { Candidate } from "./types";

const panel = SEED_TWIN.assets.find((asset) => asset.physical.area === "filler3" && asset.physical.kind === "hmi")!;
const camera: Asset = {
  id: "ALT-TEST-CAMERA", name: "Inspection camera", origin: "added", status: "ok", criticality: 2,
  physical: { area: "filler3", x: panel.physical.x - 12, y: panel.physical.y, rotation: 0,
    kind: "ip_camera", connections: [{ to: panel.id, medium: "network" }] },
  network: { level: panel.network.level, area: panel.network.area, conduit: null },
  cyber: { radios: ["wifi"], ports: [], removableStorage: false, cloudConnected: false,
    defaultCredentials: true, remoteAccess: false, managed: true },
  specs: { ipRating: "IP69K", material: "316L", foodGrade: true },
};
const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, camera] };
const wired: Candidate = {
  name: "Wired camera", kind: "ip_camera", source: "rules", rationale: "Retain the existing network cable.",
  effects: [{ type: "disable_radio", assetId: camera.id, radio: "wifi" }], cost: [10, 50, 800],
};

it("derives risk, loss, and removed clauses using the baseline and annualized cost mode", () => {
  const [result] = evaluateAlternatives(twin, camera.id, [wired]);
  const before = evaluateTwin(twin);
  const afterTwin = applyEffects(twin, wired.effects);
  const after = evaluateTwin(afterTwin);
  const avoided = plantExposure(twin, before).totalAnnualised - plantExposure(afterTwin, after).totalAnnualised;
  expect(result.net).toBeCloseTo(avoided - 10);
  expect(result.riskDelta).toBe(after.score - before.score);
  const gaps = (report: typeof before) => report.findings.filter((finding) =>
    finding.assetId === camera.id && (finding.kind === "compliance" || findingClauseIds(finding).length > 0)).length;
  expect(result.complianceReduction).toBe(gaps(before) - gaps(after));
  expect(result.complianceReduction).toBeGreaterThan(0);
  expect(result.removedClauses).toContain("iec62443-3-3-sr-1.6");
  expect(camera.cyber?.radios).toEqual(["wifi"]);
});

it("ranks only dual improvements, breaking equal net value by compliance reduction", () => {
  const [radioOnly, hardened] = evaluateAlternatives(twin, camera.id, [
    { ...wired, cost: [0, 0, 0] },
    { ...wired, cost: [0, 0, 0], effects: [...wired.effects,
      { type: "patch_cyber", assetId: camera.id, patch: { defaultCredentials: false } }] },
  ]).sort((a, b) => a.complianceReduction - b.complianceReduction);
  expect(hardened.complianceReduction).toBeGreaterThan(radioOnly.complianceReduction);
  const candidates: Candidate[] = [
    { ...wired, name: "Savings only", effects: [], cost: [-10000, -10000, -10000] },
    { ...wired, name: "Compliance only", cost: [1e8, 1e8, 1e8] },
    { ...wired, name: "Unpriced", cost: null },
    { ...wired, name: "Both" },
    { ...wired, name: "Cheap wired", cost: [0, 0, 0] },
  ];
  const ranked = evaluateAlternatives(twin, camera.id, candidates);
  expect(ranked.filter(({ qualifies }) => qualifies).map(({ candidate }) => candidate.name)).toEqual(["Cheap wired", "Both"]);
  expect(ranked.find(({ candidate }) => candidate.name === "Unpriced")?.net).toBeNull();

  // Reprice both variants to the same net value to exercise the secondary ordering.
  const target = 1;
  const toTie = (item: typeof radioOnly): Candidate => {
    const mode = 5 * (item.annualLossAvoided - target);
    return { ...item.candidate, cost: [mode, mode, mode] };
  };
  const tied = evaluateAlternatives(twin, camera.id, [toTie(radioOnly), toTie(hardened)]);
  expect(tied.map(({ net }) => net)).toEqual([target, target]);
  expect(tied[0].complianceReduction).toBe(hardened.complianceReduction);
});

it("keeps a cross-process move visible without pricing it as the same workflow", () => {
  const destination = SEED_TWIN.areas.find(({ id }) => id === "water_treatment")!;
  const profile: DeviceProfile = {
    device_type: "Bottle cap inspection camera", category: "camera", object_class: "networked_device",
    vendor: null, model: null, radios: ["wifi"], ports: ["RJ45 Ethernet"], storage: null,
    default_credentials_visible: true, default_credentials_note: null, cloud_connectivity: false,
    power: null, physical_kind: "ip_camera", capacity_or_size: null, material: "316L",
    food_grade: true, hazardous_area_rating: null, ip_rating: "IP69K", evidence: [], unknowns: [], confidence: 1,
  };
  const assessment: Assessment = {
    placement: { level: destination.typicalLevels[0], network_area: destination.name, conduit: null, why: "Lower exposure" },
    physical_placement: { area: destination.id, near_asset_id: null, position_hint: "",
      connections: [], physical_constraints: [] },
    never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 1,
  };
  const findings = evaluateTwin(twin).findings.filter(({ assetId }) => assetId === camera.id);
  const { rules, changes } = buildCandidates(twin, camera, profile, assessment, findings);
  const move = rules.find(({ effects }) => effects.some(({ type }) => type === "move_asset"));
  expect(move).toMatchObject({ cost: null, rationale: expect.stringContaining("same process") });
  expect(changes.map(({ id }) => id)).not.toContain("architect_placement");
  expect(changes.map(({ id }) => id)).toContain("disable_wifi");
});
