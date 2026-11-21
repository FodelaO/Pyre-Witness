/** Regression coverage for four-answer ordering and the final placement gate. */
import { describe, expect, it } from "vitest";
import type { Assessment, DeviceProfile, PipelineEvent, RiskItem, SelfCheckResult } from "@/pipeline/types";
import { prioritizeLens, showsRisk } from "./panelLens";
import { displayedRiskChange, riskDelta } from "./riskNumber";
import { captureWithDataImpact, placementChecks } from "./runEvidence";

const base = { runId: "capture", at: 0 };
const started = { ...base, type: "run.started", input: { kind: "text", label: "Test device" }, dropPoint: null } as const;
const proposed = { ...base, type: "reasoning.done", model: "test", latencyMs: 1, assessment: {} as Assessment } as const;
const revised = { ...base, type: "revision.done", model: "test", latencyMs: 1, assessment: {} as Assessment } as const;
const emptyResult = { findings: [], paths: [], disagreements: [], revised: false };
const check = (phase: "as-dropped" | "recommendation" | "post-revision", result: SelfCheckResult): PipelineEvent =>
  ({ ...base, type: "selfcheck.done", latencyMs: 1, phase, result });

describe("capture answers", () => {
  it("keeps all risks while prioritizing the active lens", () => {
    const item = (kind: RiskItem["kind"]): RiskItem => ({
      id: kind, kind, title: kind, severity: 3, likelihood: 2, technique: null, description: "", mitigation: "",
    });
    const risks = [item("cyber"), item("physical"), item("compliance")];
    expect(prioritizeLens("material", risks, showsRisk).map(({ kind }) => kind)).toEqual(["physical", "compliance", "cyber"]);
    expect(prioritizeLens("data", risks, showsRisk).map(({ kind }) => kind)).toEqual(["cyber", "compliance", "physical"]);
  });

  it("requires the check of the latest recommendation after a revision", () => {
    const initial = { ...emptyResult, passed: true };
    const blocked = { ...emptyResult, passed: false, revised: true };
    const events = [started, check("as-dropped", initial), proposed, check("recommendation", initial), revised];
    expect(placementChecks(events)).toEqual({ dropped: initial, recommendation: null });
    expect(placementChecks([...events, check("post-revision", blocked)]).recommendation).toBe(blocked);
  });

  it("detects deterministic data findings on new captures and leaves passive objects and reassessments alone", () => {
    const cyber = { ...emptyResult, passed: false, findings: [{
      ruleId: "RF-01", kind: "cyber" as const, severity: 4 as const, assetId: "unit", title: "Radio finding", detail: "", references: [],
    }] };
    const events = [started, check("as-dropped", cyber)];
    const run = { runId: "capture", events, profile: null, assessment: null };
    expect(captureWithDataImpact(run)).toBe("capture");
    expect(captureWithDataImpact({ ...run, profile: { object_class: "passive_object" } as DeviceProfile })).toBeNull();
    expect(captureWithDataImpact({ ...run, events: [{ ...started, mode: "reassess" }, events[1]] })).toBeNull();
  });

  it("uses the displayed whole scores for the plant delta and keeps projected points signed", () => {
    expect(riskDelta(displayedRiskChange(48.72, 46))).toBe("+3");
    expect(riskDelta(displayedRiskChange(46.43, 46))).toBe("0");
    expect(riskDelta(-19.89)).toBe("−20");
    expect(riskDelta(-0.3)).toBe("0");
  });
});
