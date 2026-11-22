/** Verifies function validation, evidence lookup, and authorization of the sole voice move. */
import { afterEach, describe, expect, it } from "vitest";
import { capturedAssetId } from "@/pipeline/assetFromProfile";
import { useRunStore } from "@/pipeline/runStore";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import { evaluateTwin } from "@/rules/engine";
import { tourController } from "@/tour/controller";
import { TOUR_STEP_IDS } from "@/tour/stepIds";
import { chiefSetup } from "@/app/api/voice/session/setup";
import { areaCenter } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { actForChief, useChiefPath } from "./chiefActions";
import type { VoiceSnapshot } from "./context";
import { dispatchVoiceTool, type VoiceToolCall } from "./toolDispatch";

const runId = "voice-unit-capture";
const assetId = capturedAssetId(runId);
const office = SEED_TWIN.areas.find((area) => area.id === "corporate_office")!;
const utility = SEED_TWIN.areas.find((area) => area.id === "utilities")!;
const device: Asset = {
  id: assetId, name: "Temperature display", origin: "added", status: "ok", criticality: 1,
  physical: { area: utility.id, ...areaCenter(utility), kind: "instrument", rotation: 0, connections: [] },
  network: { level: 0, area: utility.name, conduit: null },
};

const profile: DeviceProfile = {
  device_type: device.name, category: "instrument", vendor: null, model: null, radios: [], ports: [],
  storage: null, default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: false,
  power: null, physical_kind: "instrument", capacity_or_size: null, material: null, food_grade: null,
  hazardous_area_rating: null, ip_rating: null, evidence: [], unknowns: [], confidence: 1,
};

const assessment: Assessment = {
  placement: { level: 4, network_area: office.name, conduit: null, why: "Isolated display in the office" },
  physical_placement: { area: office.id, near_asset_id: null, position_hint: "Office", connections: [], physical_constraints: [] },
  never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 1,
};

const snapshot: VoiceSnapshot = {
  twin: { ...SEED_TWIN, assets: [...SEED_TWIN.assets, device] }, risk: evaluateTwin(SEED_TWIN), selectedId: null, view: "floor",
  run: {
    runId, placedAssetId: assetId, status: "done", profile, assessment,
    selfCheck: { passed: true, revised: false, disagreements: [], findings: [], paths: [] },
  },
};

const move: VoiceToolCall = { name: "move_device_to_recommended" };

afterEach(() => {
  tourController.stop();
  useRunStore.getState().reset();
  useTwinStore.getState().reset();
  useChiefPath.setState({ pathId: null });
});

describe("Chief tool dispatch", () => {
  it("uses the same controller for all six demo tools and rejects invalid jumps", async () => {
    const declarations = chiefSetup.tools[0].functionDeclarations;
    expect(declarations.find(({ name }) => name === "go_to_demo_step")?.parameters?.properties.stepId.enum)
      .toEqual(TOUR_STEP_IDS);
    const tool = (name: string, args?: VoiceToolCall["args"]) => actForChief({ name, args }, null);
    expect(tool("demo_status")).toMatchObject({ output: { status: "inactive", stepId: null, done: false } });
    expect(tool("start_demo")).toMatchObject({ output: { accepted: true, stepId: "capture" } });
    expect(tool("start_demo")).toMatchObject({ output: { accepted: false, stepId: "capture" } });
    expect(tool("go_to_demo_step", { stepId: "not-a-step" })).toHaveProperty("error");
    expect(tool("go_to_demo_step", { stepId: "proof", extra: 1 })).toHaveProperty("error");
    expect(tool("go_to_demo_step", { stepId: "proof" })).toMatchObject({ output: { accepted: true, stepId: "proof" } });
    expect(tool("previous_demo_step")).toMatchObject({ output: { accepted: true, stepId: "clear-test" } });
    expect(tool("go_to_demo_step", { stepId: "proof" })).toHaveProperty("output.accepted", true);
    await Promise.resolve();
    expect(tool("demo_status")).toMatchObject({ output: {
      status: "ready", stepId: "proof", title: "Held-out proof vs one call", done: false,
      suggestedNextAction: "Read the held-out comparison.",
    } });
    expect(tool("next_demo_step")).toMatchObject({ output: { accepted: true, stepId: "proof", status: "running" } });
    expect(tool("stop_demo")).toMatchObject({ output: { accepted: true, status: "inactive" } });
    expect(tourController.status().stepId).toBeNull();
  });
  it("selects known assets and only accepts the three existing views", () => {
    expect(dispatchVoiceTool({ name: "select_asset", args: { id: assetId } }, snapshot, runId).command)
      .toEqual({ type: "select", assetId });
    expect(dispatchVoiceTool({ name: "select_asset", args: { id: "made-up" } }, snapshot, runId).command).toBeUndefined();
    expect(dispatchVoiceTool({ name: "show_view", args: { view: "split" } }, snapshot, runId).command)
      .toEqual({ type: "view", view: "split" });
    expect(dispatchVoiceTool({ name: "show_view", args: { view: "other" } }, snapshot, runId).command).toBeUndefined();
  });

  it("highlights existing rules paths and explains only known rule evidence", () => {
    const path = snapshot.risk.paths[0];
    expect(dispatchVoiceTool({ name: "highlight_path", args: { pathId: path.id } }, snapshot, runId))
      .toMatchObject({ command: { type: "highlight", pathId: path.id }, response: { output: { simulated: true } } });
    const finding = snapshot.risk.findings[0];
    expect(dispatchVoiceTool({ name: "explain_finding", args: { ruleId: finding.ruleId } }, snapshot, runId).response)
      .toMatchObject({ output: { current: expect.arrayContaining([expect.objectContaining({ ruleId: finding.ruleId })]) } });
    expect(dispatchVoiceTool({ name: "explain_finding", args: { ruleId: "made-up" } }, snapshot, runId).response)
      .toHaveProperty("error");
  });

  it("rejects stale, unchecked, arbitrary-asset, and mitigation requests", () => {
    expect(dispatchVoiceTool(move, snapshot, "stale-run").command).toBeUndefined();
    expect(dispatchVoiceTool(move, { ...snapshot, run: { ...snapshot.run, selfCheck: null } }, runId).command).toBeUndefined();
    expect(dispatchVoiceTool({ ...move, args: { assetId: "PLC-F3" } }, snapshot, runId).command).toBeUndefined();
    expect(dispatchVoiceTool({ name: "apply_mitigation", args: { id: "M1" } }, snapshot, runId).response)
      .toHaveProperty("error", expect.stringContaining("results panel"));
    expect(dispatchVoiceTool(move, snapshot, runId).command).toEqual({ type: "move", assetId });
  });

  it("moves the checked capture through the shared helper and updates the actual twin", () => {
    useTwinStore.getState().setTwin(snapshot.twin);
    useRunStore.setState(snapshot.run);
    expect(actForChief(move, runId)).toMatchObject({ output: { assetId, area: office.id, level: 4 } });
    expect(useTwinStore.getState().twin.assets.find(({ id }) => id === assetId)?.physical.area).toBe(office.id);
    expect(useTwinStore.getState().selectedId).toBe(assetId);
  });
});
