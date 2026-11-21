/** Exercises the inspector context across removal, tag reuse and a second assessment. */
import { afterEach, expect, it } from "vitest";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import { useRunStore } from "@/pipeline/runStore";
import { officeAssessment, pressureProfile } from "@/pipeline/server/__fixtures__/placement";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { useTwinStore } from "@/twin/store";
import { captureContext } from "./captureContext";

afterEach(() => {
  useTwinStore.getState().reset();
  useRunStore.getState().reset();
});

it("waits for the replacement PLC's own assessment", () => {
  const id = "PLC-901";
  const first: DeviceProfile = { ...pressureProfile, physical_kind: "plc_cabinet", object_class: "networked_device", model: "S7-300" };
  const second = { ...first, model: "MicroLogix 1100" };
  const assessment: Assessment = { ...officeAssessment, mitigations: [], risks: [], attack_paths: [] };
  function place(runId: string, profile: DeviceProfile) {
    const run = useRunStore.getState();
    run.ingest({ type: "run.started", runId, at: 1, dropPoint: DEFAULT_DROP, input: { kind: "photo", label: "PLC" } });
    run.ingest({ type: "perception.done", runId, at: 2, profile, model: "fixture", latencyMs: 1 });
    const store = useTwinStore.getState();
    store.addAsset(assetFromProfile(profile, store.twin, id, DEFAULT_DROP));
    run.setPlacedAsset(id);
  }
  place("first", first);
  useRunStore.getState().ingest({ type: "reasoning.done", runId: "first", at: 3, assessment, model: "fixture", latencyMs: 1 });
  expect(captureContext(id)).toEqual({ profile: first, assessment });
  useTwinStore.getState().removeAsset(id);
  expect(captureContext(id)).toBeUndefined();
  place("second", second);
  expect(captureContext(id)).toBeUndefined();
  const replacement = { ...assessment, confidence: 0.75 };
  useRunStore.getState().ingest({ type: "reasoning.done", runId: "second", at: 3, assessment: replacement, model: "fixture", latencyMs: 1 });
  expect(captureContext(id)).toEqual({ profile: second, assessment: replacement });
  place("third", first);
  expect(captureContext(id)).toBeUndefined();
});
