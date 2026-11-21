// Checks held-out side ordering, shared scoring, and receipt-only report rendering.
import { describe, expect, test } from "vitest";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import type { EvaluatedItem, JudgeArtifact, Observation, RunArtifact } from "../types";
import { judgeInput, sideOrder } from "./pairing";
import { markdown, scoreHeldout } from "./report";

const expected = { isDevice: true, deviceType: "router", physicalKind: "wifi_ap", areas: ["corporate_office"],
  levels: [4], neverAreas: ["nh3_hazard"], riskTags: ["wireless"] } as const;

function row(id: string): EvaluatedItem {
  return { item: {
    id, group: "clean", input: { kind: "text", description: "An access point." }, sourceUrl: "", license: "Test", notes: "",
    expected: { ...expected, areas: [...expected.areas], levels: [...expected.levels], neverAreas: [...expected.neverAreas],
      riskTags: [...expected.riskTags] },
  }, observations: {} };
}

function answered(area: "corporate_office" | "nh3_hazard", radioRisk: boolean): Observation {
  return {
    status: "ok", latencyMs: radioRisk ? 200 : 100, ruleCheck: { passed: radioRisk, detail: [] },
    prediction: { accepted: true, profile: { device_type: "access point", physical_kind: "wifi_ap" } as DeviceProfile,
      recommendation: {
        placement: { level: 4, network_area: "office", conduit: null, why: "test" },
        physical_placement: { area, near_asset_id: null, position_hint: "test", connections: [], physical_constraints: [] },
      }, neverAreas: [], riskTags: radioRisk ? ["wireless"] : [], techniques: [], filteredUnknownTechniques: [] },
  };
}

const judge: JudgeArtifact = { raw: null, latencyMs: 10,
  answers: { baseline: { probability: 0.7, confidence: 0.9 }, system: { probability: 0.3, confidence: 0.9 } } };

describe("held-out runner", () => {
  test("alternates blinded candidates and omits absent names", () => {
    const item = row("order");
    item.observations = { baseline: answered("nh3_hazard", false), system: answered("corporate_office", true) };
    expect(sideOrder(0)).toEqual(["baseline", "system"]);
    expect(sideOrder(1)).toEqual(["system", "baseline"]);
    expect(judgeInput(item, 1)).toEqual({ expected: "router", predictions: [
      ["system", "access point"], ["baseline", "access point"],
    ] });
    expect(judgeInput(row("pending"), 0)).toBeNull();
  });

  test("separates shared quality, incomplete pairs, naming coverage and all-attempt timing", () => {
    const first = row("first");
    first.observations = { baseline: answered("nh3_hazard", false), system: answered("corporate_office", true) };
    first.judge = judge;
    const second = row("second");
    second.observations = first.observations;
    const third = row("third");
    third.observations.baseline = { status: "error", latencyMs: 300, prediction: null, ruleCheck: null,
      error: { stage: "baseline", message: "Private raw detail", timeout: true } };
    const result = scoreHeldout([first, second, third]);
    expect(result).toMatchObject({ completed: 2, shared: 2, timing: { baseline: { n: 3, p50: 100 }, system: { n: 2, p50: 200 } } });
    expect(result.metrics.find(({ key }) => key === "deviceTypeMatch")).toMatchObject({
      baseline: { n: 1, numerator: 1 }, system: { n: 1, numerator: 0 },
    });
    expect(result.metrics.find(({ key }) => key === "riskRecall")).toMatchObject({
      difference: { n: 2, value: 1, interval: [1, 1] },
    });
    expect(result.exact.find(({ key }) => key === "neverPlaceViolation")?.shared).toMatchObject({ n: 2, baselineOnly: 2, p: 0.5 });
    expect(result.inputs.find(({ key }) => key === "text")).toMatchObject({
      n: 3, baseline: { numerator: 0, n: 3 }, system: { numerator: 2, n: 2 },
    });
    expect(result.items[2]).toMatchObject({ baseline: { passed: false, reason: "Timed out" }, system: { passed: null } });
    expect(JSON.stringify(result)).not.toContain("Private raw detail");
  });

  test("scores the displayed system risk list and recommendation", () => {
    const capture = row("final-assessment");
    const initial = answered("nh3_hazard", false);
    const final = answered("corporate_office", true).prediction!.recommendation!;
    const assessment: Assessment = { ...final, never_place: [], risks: [{
      id: "wireless", kind: "cyber", title: "Wireless exposure", description: "Review Wi-Fi access.",
      mitigation: "Isolate wireless clients.", severity: 2, likelihood: 2, technique: null,
    }], attack_paths: [], mitigations: [], compliance: [], confidence: 0.5 };
    const system: RunArtifact = { ...initial, raw: [{ type: "summary.started", assessment }] };
    capture.observations = { baseline: initial, system };
    const result = scoreHeldout([capture]);
    expect(result.metrics.find(({ key }) => key === "riskRecall")?.system).toMatchObject({ n: 1, numerator: 1 });
    expect(result.items[0].system.passed).toBe(true);
  });

  test("labels single-pair inference as insufficient and renders pending rows", () => {
    const item = row("one");
    item.observations = { baseline: answered("nh3_hazard", false), system: answered("corporate_office", true) };
    const result = scoreHeldout([item, row("pending")]);
    const report = markdown({
      ...result, label: "test", date: "now", startedAt: "then", pipelineFingerprint: "pipeline", datasetFingerprint: "dataset",
      baseline: { status: "DIFFERS", contract: "test", promptSha256: "hash", responseSchemaSha256: "hash", plantContext: { archived: "Old", current: "New" }, archived: [] },
      models: { baseline: "a", perception: "a", gate: "b", judge: "b", reasoning: "c", chief: "d" }, thinking: {},
      available: 2, selected: 2, concurrency: 1, devSet: null,
    });
    expect(report).toContain("**DIFFERS**");
    expect(report).toContain("**Plant context differs.**");
    expect(report).toContain("Insufficient pairs for inference");
    expect(report).toContain("| `pending` | text | clean | Pending | Pending | No saved attempt |");
  });
});
