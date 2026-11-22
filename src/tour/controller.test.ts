/** Exercises manual demo progress against the same stores used by the app. */
import { afterEach, expect, it, vi } from "vitest";
import { monitorEscalations } from "@/escalation/monitor";
import { useEscalationStore } from "@/escalation/store";
import { clearTestAlert, runTestAlert } from "@/escalation/testScenario";
import { useRunStore } from "@/pipeline/runStore";
import type { Assessment } from "@/pipeline/types";
import { useTwinStore } from "@/twin/store";
import { useWatchStore } from "@/watch/watchStore";
import type { WatchReport } from "@/watch/types";
import { actForChief } from "@/voice/chiefActions";
import { tourController } from "./controller";

let stopMonitor: (() => void) | undefined;

afterEach(() => {
  tourController.stop();
  stopMonitor?.();
  stopMonitor = undefined;
  useEscalationStore.setState({ records: [] });
  useRunStore.getState().reset();
  useTwinStore.getState().reset();
  useWatchStore.setState(useWatchStore.getInitialState());
});

const assessment: Assessment = {
  placement: { level: 0, network_area: "field", conduit: null, why: "" },
  physical_placement: { area: "filler3", near_asset_id: null, position_hint: "", connections: [], physical_constraints: [] },
  never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 1,
};

it("detects a manually completed capture with an asset and nudges placement", async () => {
  const { ingest, setPlacedAsset } = useRunStore.getState();
  const { addAsset, twin } = useTwinStore.getState();
  expect(tourController.start()).toBe(true);
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({
    stepId: "capture", status: "ready", done: false, completedSteps: [],
  }));

  const run = { runId: "manual-demo-capture", at: Date.now() };
  const device = { ...twin.assets[0], id: "DEV-1901", origin: "added" as const };
  ingest({ ...run, type: "run.started", input: { kind: "text", label: "Device" }, dropPoint: null });
  ingest({ ...run, type: "reasoning.done", model: "fixture", latencyMs: 15, assessment });
  addAsset(device);
  setPlacedAsset(device.id);
  expect(tourController.status().done).toBe(false);
  ingest({ ...run, type: "run.completed", totalMs: 15 });

  await vi.waitFor(() => expect(actForChief({ name: "demo_status" }, null)).toMatchObject({ output: {
    stepId: "placement", title: "See the placement risks", done: false, completedSteps: ["capture"],
    suggestedNextAction: "Find the captured device in the twin.",
  } }));
  expect(tourController.previous()).toBe(true);
  expect(tourController.status()).toMatchObject({ stepId: "capture", done: true });
  expect(tourController.skip()).toBe(true);
  expect(tourController.status().stepId).toBe("placement");
});

it("nudges after manual review, To-do approval, and firing and clearing the simulated alert", async () => {
  const report: WatchReport = {
    date: "2026-11-21", runId: "old", mode: "local", finishedAt: Date.now() - 10_000,
    headline: "Review complete", baselineScore: 0, sources: [], candidates: [], items: [],
    warnings: [], stages: [], recommendations: [],
  };
  const putReview = (report: WatchReport, cached = false) => useWatchStore.setState(({ review }) => ({
    review: { ...review, status: "finished", report, cached },
  }));
  putReview(report);
  tourController.start();
  tourController.goTo("threat-watch");
  await vi.waitFor(() => expect(tourController.status().status).toBe("ready"));
  expect(tourController.status().done).toBe(false);

  const fresh = { ...report, runId: "fresh", finishedAt: Date.now() };
  putReview(fresh, true);
  expect(tourController.status().done).toBe(false);
  putReview(fresh);
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({
    stepId: "approve-todo", status: "ready", completedSteps: ["threat-watch"],
  }));

  const { proposeMitigations, decideMitigation } = useTwinStore.getState();
  proposeMitigations([{
    id: "demo-todo", kind: "physical", title: "Lock the port", description: "Fit a port lock",
    proposedBy: "fixture", status: "proposed", riskDelta: -1, targets: ["HMI-F3"],
    effects: [{ type: "add_protection", assetId: "HMI-F3", protection: "port-lock" }],
  }]);
  expect(tourController.status().done).toBe(false);
  decideMitigation("demo-todo", "approved");
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({
    stepId: "test-alert", status: "ready", completedSteps: ["threat-watch", "approve-todo"],
  }));

  stopMonitor = monitorEscalations();
  expect(runTestAlert()).toBe(true);
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({
    stepId: "clear-test", status: "ready", done: false,
    completedSteps: ["threat-watch", "approve-todo", "test-alert"],
  }));
  clearTestAlert();
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({
    stepId: "proof", status: "ready", done: false,
    completedSteps: ["threat-watch", "approve-todo", "test-alert", "clear-test"],
  }));
});

it("reports a skipped step honestly instead of cueing the following step", async () => {
  expect(actForChief({ name: "start_demo" }, null)).toHaveProperty("output.accepted", true);
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({ stepId: "capture", status: "ready" }));
  expect(actForChief({ name: "next_demo_step" }, null)).toHaveProperty("output.accepted", true);
  // No capture UI exists in this test environment, so the visible action cannot run and the step is skipped.
  await vi.waitFor(() => expect(actForChief({ name: "demo_status" }, null)).toMatchObject({ output: {
    stepId: "capture", status: "skipped", done: false, completedSteps: [], skipReason: expect.any(String),
    suggestedNextAction: "This step was skipped. Complete it manually, or press Next to move on.",
  } }), { timeout: 8000 });
  expect(actForChief({ name: "next_demo_step" }, null)).toMatchObject({ output: { accepted: true } });
  await vi.waitFor(() => expect(tourController.status()).toMatchObject({ stepId: "placement", done: false }));
});
