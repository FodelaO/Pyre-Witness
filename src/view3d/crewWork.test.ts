/** Checks that 3D work consumes received events and preserves the checked placement and hop order. */
import { describe, expect, it } from "vitest";
import { timeWalk } from "@/crew/walkTiming";
import type { Assessment, PipelineEvent } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { SEED_TWIN } from "@/twin/seed";
import type { AttackPath } from "@/twin/types";
import { displayedTrace, evidencePreview, readWorkRun } from "./crewWork";
import { architectureParts, inspectionParts } from "./crewWorkGeometry";
import { transformPoint } from "./gl/mat4";
import { DEFAULT_PALETTE } from "./palette";
import { sceneFromTwin } from "./scene";

const run = { runId: "work-test", at: 1_000 };
const start = { ...run, type: "run.started", input: { kind: "photo", label: "Pressure gauge" }, dropPoint: DEFAULT_DROP } as const;
const path: AttackPath = {
  id: "observed", entry: "parking_rf", target: "SCADA-03", title: "Recorded rules path", severity: 4, likelihood: 2,
  impact: "", source: "rules", steps: [
    { from: "parking_rf", to: "HMI-F3", via: "rf", note: "" },
    { from: "HMI-F3", to: "SCADA-03", via: "network", note: "" },
  ],
};
const assessment: Assessment = {
  placement: { level: 2, network_area: "Packaging", conduit: null, why: "Reviewed room" },
  physical_placement: { area: "packaging", near_asset_id: null, position_hint: "", connections: [], physical_constraints: [] },
  never_place: [], risks: [], attack_paths: [path], compliance: [], mitigations: [], confidence: 0.8,
};

describe("recorded 3D work", () => {
  it("opens Scout's source plate only while perception is reading the current run", () => {
    expect(readWorkRun([])).toMatchObject({ start: null, reading: false });
    const reading: PipelineEvent = { ...run, type: "perception.started", model: "gemini-4-hydrogen" };
    const error: PipelineEvent = { ...run, type: "run.error", stage: "perception", message: "Source unavailable" };
    expect(readWorkRun([start, reading])).toMatchObject({ start, reading: true, evidence: false });
    expect(readWorkRun([start, reading, error]).reading).toBe(false);
    expect(readWorkRun([start, { ...reading, runId: "older" }]).reading).toBe(false);
  });

  it("uses explicit selfcheck paths and preserves phase-specific assessment and verdict", () => {
    const work = readWorkRun([
      start,
      { ...run, type: "selfcheck.path", path, phase: "as-dropped" },
      { ...run, type: "reasoning.done", assessment, latencyMs: 1000, model: "gemini-4-carbon" },
      { ...run, type: "selfcheck.path", path, phase: "recommendation" },
      { ...run, type: "selfcheck.done", phase: "recommendation", latencyMs: 3,
        result: { passed: true, findings: [], paths: [path], disagreements: [], revised: false } },
    ]);
    expect(displayedTrace(work, { kind: "trace", phase: "as-dropped", id: path.id })).toEqual({ path, assessment: null });
    expect(displayedTrace(work, { kind: "trace", phase: "recommendation", id: path.id })).toEqual({ path, assessment });
    expect(displayedTrace(work, { kind: "trace", phase: "post-revision", id: path.id })).toBeUndefined();
    expect(work.checks.get("recommendation")?.event.result.passed).toBe(true);
  });

  it("keeps Chief writing through pipeline completion and admits the actual late briefing", () => {
    const writing: PipelineEvent = { ...run, type: "summary.started", model: "gemini-4-neon" };
    const complete: PipelineEvent = { ...run, type: "run.completed", totalMs: 2000 };
    const briefing: PipelineEvent = { ...run, type: "summary.done", model: "gemini-4-neon", latencyMs: 500, text: "Review the location." };
    const events = [start, writing, complete];
    expect(readWorkRun(events)).toMatchObject({ writing: true, briefing: null });
    expect(readWorkRun([...events, briefing])).toMatchObject({ writing: false, briefing });
    expect(readWorkRun([...events, briefing, { ...start, runId: "next" }])).toMatchObject({ writing: false, briefing: null });
    expect(readWorkRun([...events, { ...run, type: "run.error", stage: "summary", message: "Canceled" }, briefing]).briefing).toBeNull();
  });

  it("shows observed label text and groups all observed ports and radios", () => {
    expect(evidencePreview([
      { kind: "shape", text: "Round face" }, { kind: "label", text: "0–10 bar" },
      { kind: "radio", text: "wifi" }, { kind: "port", text: "USB" },
      { kind: "port", text: "USB" }, { kind: "port", text: "RJ45" },
    ])).toEqual([{ kind: "label", text: "0–10 bar" }, { kind: "port", text: "USB, RJ45" }, { kind: "radio", text: "wifi" }]);
    expect(evidencePreview([])).toEqual([]);
  });

  it("builds ranking plates and a world-space arrow only from the Architect's data", () => {
    expect(architectureParts(undefined, SEED_TWIN, DEFAULT_PALETTE)).toEqual([]);
    const plates = architectureParts({ kind: "ranked", areas: ["filler3", "packaging"] }, SEED_TWIN, DEFAULT_PALETTE);
    expect(plates.filter((part) => part.prim === "quad")).toHaveLength(10);
    const to = { x: DEFAULT_DROP.x + 60, y: DEFAULT_DROP.y + 60 };
    const parts = architectureParts({ kind: "proposal", from: DEFAULT_DROP, to, area: "packaging" }, SEED_TWIN, DEFAULT_PALETTE);
    const head = parts.find((part) => part.prim === "cone");
    expect(head && transformPoint(head.m, [0, 1, 0])).toEqual([to.x / 10, 1.2, to.y / 10]);
    const held = architectureParts({ kind: "proposal", from: DEFAULT_DROP, to, area: "packaging" }, SEED_TWIN, DEFAULT_PALETTE, undefined, true);
    expect(held).toHaveLength(5);
    expect(held.every((part) => part.prim === "quad" && part.color === DEFAULT_PALETTE.attention)).toBe(true);
  });

  it("draws the real hops in order, uses the checked device location and respects reduced motion", () => {
    const scene = sceneFromTwin(SEED_TWIN, "material");
    const visual = {
      effect: { kind: "trace", id: path.id, phase: "recommendation" } as const, at: 1500,
      walk: timeWalk([{ x: 0, y: 0 }, { x: 400, y: 0 }], 1500, false, 1100),
    };
    const checked = { x: 810, y: 550 };
    const trace = inspectionParts(path, visual, scene, DEFAULT_PALETTE, 1000, true, checked, "HMI-F3");
    expect(trace.parts).toHaveLength(56);
    expect(trace.parts[28].param).toBeGreaterThan(trace.parts[26].param);
    expect(trace.parts[28].pivot).toEqual([0.5, 0]);
    expect(transformPoint(trace.parts[28].m, [0, 0, 0])[0]).toBe(checked.x / 10);
    expect(trace.until).toBeCloseTo(1.65);
    const still = inspectionParts(path, visual, scene, DEFAULT_PALETTE, 1000, false);
    expect(still.parts.every((part) => part.pivot[0] === -1000)).toBe(true);
  });
});
