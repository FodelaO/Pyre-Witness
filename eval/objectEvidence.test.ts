/** Checks passive classification, usability stops, and the two negative-capture metrics. */
import { describe, expect, it } from "vitest";
import type { DeviceProfile } from "@/pipeline/types";
import { pressureProfile } from "@/pipeline/server/__fixtures__/placement";
import { SEED_TWIN } from "@/twin/seed";
import { summarize } from "./metrics";
import { observeObject } from "./objectEvidence";
import type { EvaluatedItem, RunArtifact } from "./types";

const artifact = (raw: unknown, accepted: boolean, profile: DeviceProfile | null = null): RunArtifact => ({
  status: accepted ? "ok" : "rejected", latencyMs: 20, raw, ruleCheck: null,
  prediction: { accepted, profile, recommendation: null, neverAreas: [], riskTags: [], techniques: [], filteredUnknownTechniques: [] },
});

const negative: EvaluatedItem["item"] = {
  id: "fixture-mug", group: "edge", input: { kind: "text", description: "Ceramic mug" },
  sourceUrl: "", license: "Fixture", notes: "",
  expected: { isDevice: false, areas: [], levels: [], neverAreas: [], riskTags: [] },
};

describe("scoring passive and unusable captures", () => {
  it("scores a continuing passive object correctly and counts its as-dropped warning", () => {
    const system = artifact([
      { type: "gate.done", gate: { answers: { object_class: { value: "electrical_equipment" } } } },
      { type: "selfcheck.done", phase: "as-dropped", result: {
        paths: [], findings: [{ kind: "compliance", ruleId: "FOOD-03", title: "Non-production item" }],
        disagreements: ["Model invented a cyber risk for a passive object."],
      } },
    ], true, { ...pressureProfile, object_class: "passive_object", radios: [], cloud_connectivity: null });
    const baseline = artifact(null, false);
    const objectAssessment = observeObject("system", system, false, SEED_TWIN);
    expect(objectAssessment).toMatchObject({ isDevice: false, classSource: "perception",
      suppressedCyberClaims: true, cyberClaims: [], safetyDrop: { area: "filler3", concerns: ["FOOD-03 Non-production item"] } });
    const { sides } = summarize([{ item: negative, observations: {
      system: { ...system, objectAssessment }, baseline: { ...baseline, objectAssessment: observeObject("baseline", baseline, false, SEED_TWIN) },
    } }]);
    expect(sides.system.metrics.gateAccuracy).toMatchObject({ value: 1, n: 1 });
    expect(sides.system.metrics.falseAcceptRate).toMatchObject({ value: 0, n: 1 });
    expect(sides.system.metrics.nonDeviceCyberClaims).toMatchObject({ value: 0, n: 1 });
    expect(sides.system.metrics.nonDevicePhysicalCoverage).toMatchObject({ value: 1, n: 1 });
    expect(sides.baseline.metrics.nonDevicePhysicalCoverage).toMatchObject({ value: 0, n: 1 });
  });

  it("distinguishes a usable radio claim from a stopped capture", () => {
    const stopped = artifact([{ type: "gate.done", gate: { answers: {
      is_device: { value: 0.11 }, object_class: { value: "unusable" },
    } } }], false);
    expect(observeObject("system", stopped, false, SEED_TWIN)).toMatchObject({
      isDevice: false, classSource: "gate probability", cyberClaims: [], safetyDrop: { concerns: [] },
    });
    const leaked = artifact([], true, { ...pressureProfile, object_class: "passive_object", radios: ["wifi"] });
    expect(observeObject("system", leaked, false, SEED_TWIN).cyberClaims).toContain("radios");
  });
});
