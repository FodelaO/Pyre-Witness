/** Checks director cues against representative pipeline events without running the pipeline. */
import { describe, expect, it } from "vitest";
import { MODEL_IDS } from "@/gemini/models";
import type { Assessment, DeviceProfile, PipelineEvent } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { areaById, areaCenter, nodePosition } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { AttackPath, RuleFinding } from "@/twin/types";
import { directCrew, INITIAL_DIRECTOR, type CrewIntent } from "./director";

const twin = SEED_TWIN;
const run = { runId: "director-test", at: 100 };
const assessment: Assessment = {
  placement: { level: 2, network_area: "Cell Pack", conduit: null, why: "Fixture" },
  physical_placement: { area: "packaging", near_asset_id: null, position_hint: "", connections: [], physical_constraints: [] },
  never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 0.91,
};
const profile: DeviceProfile = {
  device_type: "Pressure gauge", category: "sensor", vendor: null, model: null, radios: [], ports: [], storage: null,
  default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: null, power: null,
  physical_kind: "instrument", capacity_or_size: null, material: null, food_grade: null, hazardous_area_rating: null,
  ip_rating: null, confidence: 0.96, unknowns: [], evidence: [
    { claim: "Round enclosure", source: "shape", confidence: 0.61 },
    { claim: "Label reads 0–10 bar", source: "label", confidence: 0.98 },
    { claim: "Two ports", source: "port", confidence: 0.77 },
  ],
};

function cursor() {
  let state = INITIAL_DIRECTOR;
  return (event: PipelineEvent): CrewIntent | null => {
    const result = directCrew(state, event, twin);
    state = result.state;
    return result.intent;
  };
}

describe("crew director", () => {
  it("uses the gate model, actual confidence, strongest evidence and physical recommendation", () => {
    const next = cursor();
    expect(next({ ...run, type: "run.started", input: { kind: "photo", label: "Label" }, dropPoint: null }))
      .toMatchObject({ kind: "stand", activity: { at: run.at, kind: "pipeline" } });
    expect(next({ ...run, type: "gate.started", model: MODEL_IDS.decisions }))
      .toMatchObject({ cue: { status: "working", activity: { crew: "scout", engine: MODEL_IDS.decisions } } });
    expect(next({ ...run, type: "gate.done", model: MODEL_IDS.decisions, latencyMs: 87, gate: {
      answers: { is_device: { type: "noul", value: 0.97, confidence: 0.94 } }, proceed: true, reason: null,
    } })).toMatchObject({ cue: { status: "done", activity: { text: "Device? 0.97 · Gate passed", latencyMs: 87 } } });
    expect(next({ ...run, type: "perception.started", model: MODEL_IDS.perception }))
      .toMatchObject({ cue: { stops: [{ point: DEFAULT_DROP, area: DEFAULT_DROP.area }] } });
    expect(next({ ...run, type: "perception.done", model: MODEL_IDS.perception, latencyMs: 1250, profile }))
      .toMatchObject({ cue: { activity: { text: "Pressure gauge · Label reads 0–10 bar", latencyMs: 1250 } } });
    expect(next({ ...run, type: "reasoning.started", model: MODEL_IDS.reasoning, candidateArea: null }))
      .toMatchObject({ cue: { stops: [{ point: areaCenter(areaById(twin, "filler3")!), area: "filler3" }] } });
    expect(next({ ...run, type: "reasoning.done", model: MODEL_IDS.reasoning, latencyMs: 780, assessment }))
      .toMatchObject({ cue: { stops: [{ point: areaCenter(areaById(twin, "packaging")!), area: "packaging" }],
        activity: { crew: "architect", text: "Packaging · Purdue L2" } } });
  });

  it("visits each reported path node and the conduit enforcer before showing the check result", () => {
    const path: AttackPath = {
      id: "path-fixture", title: "Nearby RF -> HMI-F3 -> SCADA-03", entry: "parking_rf", target: "SCADA-03",
      steps: [{ from: "parking_rf", to: "HMI-F3", via: "rf", note: "" },
        { from: "HMI-F3", to: "SCADA-03", via: "network", note: "" }],
      severity: 4, likelihood: 2, impact: "", source: "rules",
    };
    const result = { passed: false, findings: [{ ruleId: "fixture", assetId: "HMI-F3", kind: "cyber",
      title: "Fixture", severity: 4, detail: "", references: [] } satisfies RuleFinding],
    paths: [path], disagreements: ["Placement rule applies"], revised: false };
    const next = cursor();
    next({ ...run, type: "run.started", input: { kind: "text", label: "Gauge" }, dropPoint: DEFAULT_DROP });
    next({ ...run, type: "reasoning.done", model: MODEL_IDS.reasoning, latencyMs: 520, assessment });
    expect(next({ ...run, type: "selfcheck.started", engine: "rules engine" }))
      .toMatchObject({ cue: { stops: [{ area: "packaging" }], activity: { crew: "inspector", engine: "rules engine" } } });
    expect(next({ ...run, type: "selfcheck.path", path })).toMatchObject({ cue: {
      activity: { text: `Path found: ${path.title}`, engine: "rules engine" },
      stops: ["parking_rf", "HMI-F3", "SW-OT", "SCADA-03"].map((id) => ({ point: nodePosition(twin, id) })),
      inspect: nodePosition(twin, "SCADA-03"),
    } });
    expect(next({ ...run, type: "selfcheck.done", latencyMs: 10, result }))
      .toMatchObject({ cue: { activity: { text: "1 finding", engine: "rules engine", latencyMs: 10 } } });
    expect(next({ ...run, type: "revision.started", model: MODEL_IDS.reasoning, reason: result.disagreements[0] }))
      .toMatchObject({ cue: { activity: { text: "Reconsidering · Placement rule applies" } } });
    expect(next({ ...run, type: "revision.done", model: MODEL_IDS.reasoning, latencyMs: 800, assessment }))
      .toMatchObject({ cue: { activity: { text: "Revised · Packaging · Purdue L2" } } });
    expect(next({ ...run, type: "summary.done", model: MODEL_IDS.chief, latencyMs: 300, text: "Place by the packaging line." }))
      .toMatchObject({ cue: { briefing: true, stops: [{ point: { x: twin.plant.building.x + twin.plant.building.w - 32 } }],
        activity: { crew: "chief", text: "Place by the packaging line.", engine: MODEL_IDS.chief } } });
    expect(next({ ...run, type: "run.completed", totalMs: 5000 })).toMatchObject({ kind: "complete" });
    expect(next({ ...run, type: "selfcheck.path", path })).toBeNull();
  });

  it("uses an explicit drop and candidate area and stops an errored run", () => {
    const next = cursor();
    const point = { x: 546, y: 234, area: "syrup_room" } as const;
    next({ ...run, type: "run.started", input: { kind: "text", label: "Gauge" }, dropPoint: point });
    expect(next({ ...run, type: "perception.started", model: MODEL_IDS.perception }))
      .toMatchObject({ cue: { stops: [{ point, area: "syrup_room" }] } });
    expect(next({ ...run, type: "reasoning.started", model: MODEL_IDS.reasoning, candidateArea: "blending" }))
      .toMatchObject({ cue: { stops: [{ area: "blending" }] } });
    expect(next({ ...run, runId: "different-run", type: "run.error", stage: "gate", message: "Rate limit" })).toBeNull();
    expect(next({ ...run, type: "run.error", stage: "selfcheck", message: "Rules check stopped" }))
      .toMatchObject({ kind: "error", cue: { status: "error", activity: { crew: "inspector", engine: "rules engine" } } });
    expect(next({ ...run, type: "summary.done", model: MODEL_IDS.chief, latencyMs: 10, text: "Late response" })).toBeNull();
  });

  it("shows link and briefing start events without attributing the link fetch to a model", () => {
    const next = cursor();
    const url = "https://example.com/pressure-gauge";
    next({ ...run, type: "run.started", input: { kind: "link", label: "Gauge" }, dropPoint: null });
    expect(next({ ...run, type: "link.started", url })).toMatchObject({ cue: {
      status: "working", activity: { crew: "scout", text: "Reading the product page…", engine: undefined },
    } });
    expect(next({ ...run, type: "summary.started", model: MODEL_IDS.chief })).toMatchObject({ cue: {
      status: "working", activity: { crew: "chief", text: "Writing the briefing…", engine: MODEL_IDS.chief },
    } });
  });
});
