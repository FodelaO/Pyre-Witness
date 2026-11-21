/** Verifies model reference validation, lifecycle ownership and measured proposal deltas. */
import { expect, it } from "vitest";
import { techniqueById } from "@/data/attack-ics";
import { modelAssessmentSchema } from "@/gemini/schemas";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import { officeAssessment, pressureProfile } from "./__fixtures__/placement";
import { groundAssessment } from "./groundAssessment";
import { analyzeRequestSchema } from "./requests";

const candidate = assetFromProfile(pressureProfile, SEED_TWIN, "NEW-TEST", { x: 1420, y: 150, area: "utilities" });
const target = SEED_TWIN.assets[0].id;
const entry = SEED_TWIN.entryPoints[0].id;
const path = {
  id: "caller-id", source: "rules", causedBy: target,
  title: "Potential exposure", entry, target, severity: 2, likelihood: 1,
  impact: "Inspection needed",
  steps: [
    { from: entry, to: candidate.id, via: "physical", note: "Unverified access", technique: { id: "T0000", name: "Unsupported" } },
    { from: candidate.id, to: target, via: "physical", note: "Unverified adjacency" },
  ],
};

it("drops unknown or disconnected paths and canonicalizes known technique IDs", () => {
  const model = modelAssessmentSchema.parse({
    ...officeAssessment,
    physical_placement: {
      ...officeAssessment.physical_placement, near_asset_id: candidate.id,
      connections: [{ to: target, medium: "network" }, { to: "missing", medium: "network" }],
    },
    attack_paths: [
      path,
      { ...path, target: "missing" },
    ],
    risks: [{
      id: "caller-id", title: "Verify media policy", severity: 2, likelihood: 1, kind: "cyber",
      description: "Port requires review", mitigation: "Confirm site policy", technique: { id: "t0847", name: "Wrong name" },
    }],
  });
  expect(model.attack_paths[0]).not.toHaveProperty("source");
  expect(model.attack_paths[0]).not.toHaveProperty("causedBy");
  const { assessment, disagreements } = groundAssessment(SEED_TWIN, candidate, model, "run");
  expect(assessment.attack_paths).toHaveLength(1);
  expect(assessment.attack_paths[0]).toMatchObject({ id: "run:path:1", source: "model", causedBy: candidate.id });
  expect(assessment.attack_paths[0].steps[0].technique).toBeUndefined();
  expect(assessment.risks[0]).toMatchObject({
    id: "run:risk:1", technique: { id: "T0847", name: techniqueById("T0847")?.name },
  });
  expect(assessment.physical_placement).toMatchObject({
    near_asset_id: null, connections: [{ to: target, medium: "network" }],
  });
  expect(disagreements).toEqual(expect.arrayContaining([
    expect.stringContaining("unknown ATT&CK for ICS technique T0000"),
    expect.stringContaining("referencing unknown nodes"),
    expect.stringContaining("Removed placement anchor"),
    expect.stringContaining("Removed connection"),
  ]));
  const disconnectedPath = { ...path, steps: [path.steps[0], { ...path.steps[1], from: entry }] };
  const disconnected = modelAssessmentSchema.parse({ ...officeAssessment, attack_paths: [disconnectedPath] });
  const rejected = groundAssessment(SEED_TWIN, candidate, disconnected, "run");
  expect(rejected.assessment.attack_paths).toHaveLength(0);
  expect(rejected.disagreements).toEqual([expect.stringContaining("unknown ATT&CK"), expect.stringContaining("must connect known nodes")]);
});

it("measures grounded effects independently against the current candidate without changing the twin", () => {
  const proposal = {
    id: "caller-id", status: "approved", proposedBy: "caller", riskDelta: -100,
    title: "Remove unqualified equipment", kind: "physical", description: "Clear the inspection hold",
    targets: ["missing"],
  };
  const model = modelAssessmentSchema.parse({
    ...officeAssessment,
    mitigations: [
      { ...proposal, effects: [{ type: "remove_asset", assetId: candidate.id }, { type: "remove_asset", assetId: target }] },
      { ...proposal, effects: [{ type: "add_protection", assetId: candidate.id, protection: "port-lock" }] },
      { ...proposal, effects: [{ type: "add_protection", assetId: "missing", protection: "port-lock" }] },
    ],
  });
  for (const field of ["id", "status", "proposedBy", "riskDelta"]) {
    expect(model.mitigations[0]).not.toHaveProperty(field);
  }
  const { assessment, disagreements } = groundAssessment(SEED_TWIN, candidate, model, "run");
  const current = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, candidate] };
  const before = evaluateTwin(current).score;
  expect(assessment.mitigations).toHaveLength(2);
  assessment.mitigations.forEach((item, index) => {
    expect(item).toMatchObject({
      id: `run:mitigation:${index + 1}`, status: "proposed", proposedBy: "architect", targets: [candidate.id],
    });
    expect(item.riskDelta).toBeCloseTo(evaluateTwin(applyEffects(current, item.effects)).score - before, 2);
  });
  expect(assessment.mitigations[0].riskDelta).toBeLessThan(0);
  expect(assessment.mitigations[0].effects).toEqual([{ type: "remove_asset", assetId: candidate.id }]);
  expect(disagreements).toEqual(expect.arrayContaining([
    expect.stringContaining("Removed inapplicable remove_asset"),
    expect.stringContaining("Removed inapplicable add_protection"),
  ]));
  expect(SEED_TWIN.assets.some(({ id }) => id === candidate.id)).toBe(false);
  expect(candidate.protections).toBeUndefined();
  const protectedTwin = applyEffects(current, assessment.mitigations[1].effects);
  const request = analyzeRequestSchema.parse({ input: { kind: "text", description: "Gauge" }, twin: protectedTwin });
  expect(request.twin.assets.find(({ id }) => id === candidate.id)?.protections).toEqual(["port-lock"]);
});

it("resolves an isolated placement's room ID to the same room's display name", () => {
  const model = {
    ...officeAssessment,
    placement: { ...officeAssessment.placement, network_area: "corporate_office" },
  };
  const { assessment, disagreements } = groundAssessment(SEED_TWIN, candidate, model, "run");
  expect(assessment.placement.network_area).toBe("Corporate office");
  expect(disagreements).toEqual([]);
});

it("strips passive cyber claims and preserves physical guidance and isolation", () => {
  const mug = assetFromProfile({
    ...pressureProfile, device_type: "Ceramic mug", object_class: "passive_object", material: "ceramic",
  }, SEED_TWIN, candidate.id, { x: 700, y: 640, area: "filler3" });
  const model = modelAssessmentSchema.parse({
    ...officeAssessment,
    placement: { ...officeAssessment.placement, network_area: "Enterprise", conduit: "C-ENT-DMZ", why: "Place on Purdue Level 4." },
    physical_placement: {
      ...officeAssessment.physical_placement, connections: [{ to: target, medium: "network" }],
    },
    risks: [
      { title: "Network exposure", kind: "cyber", severity: 3, likelihood: 1, description: "Exposure", mitigation: "Isolate", technique: null },
      { title: "Fragments", kind: "physical", severity: 4, likelihood: 1, description: "Brittle material", mitigation: "Store in office",
        technique: { id: "T0847", name: "Unrelated technique" } },
    ],
    attack_paths: [path],
    mitigations: [{
      title: "Keep the mug out of production", kind: "physical", description: "Store the mug in an office", targets: [mug.id],
      effects: [
        { type: "disable_radio", assetId: mug.id, radio: "wifi" },
        { type: "move_asset", assetId: mug.id, area: "crew_office", level: 3, networkArea: "AI crew office", conduit: null },
        { type: "move_asset", assetId: mug.id, area: "corporate_office", level: 4, networkArea: "Enterprise", conduit: "C-ENT-DMZ" },
      ],
    }],
  });
  const { assessment, disagreements } = groundAssessment(SEED_TWIN, mug, model, "run", { passive: true });
  expect(assessment).toMatchObject({
    placement: { level: 0, network_area: "Corporate office", conduit: null, why: expect.stringContaining("Corporate office") },
    physical_placement: { connections: [] },
    attack_paths: [],
    risks: [{ title: "Fragments", technique: null }],
    mitigations: [{ effects: [{ type: "move_asset", level: 0, networkArea: "Corporate office", conduit: null }] }],
  });
  expect(assessment.placement.why).not.toContain("Purdue");
  expect(disagreements).toEqual([
    "Model invented a cyber risk for a passive object.",
    "Removed inapplicable move_asset effect from mitigation 1.",
    "Removed a network-level placement rationale for a passive object.",
  ]);
});
