/**
 * State of the current analysis run (browser). The API client calls ingest() for every server
 * event; ingest() reduces it into this store AND forwards it on the pipeline bus.
 */
import { create } from "zustand";
import { pipelineBus } from "./bus";
import type { Assessment, DeviceProfile, GateResult, PipelineEvent, PipelineStage, SelfCheckResult } from "./types";

export interface RunState {
  status: "idle" | "running" | "done" | "error";
  runId: string | null;
  /** Stage currently in progress, for progress UI. */
  stage: PipelineStage | null;
  events: PipelineEvent[];
  gate: GateResult | null;
  profile: DeviceProfile | null;
  assessment: Assessment | null;
  selfCheck: SelfCheckResult | null;
  summary: string | null;
  error: { stage: string; message: string } | null;
  /** Id of the asset this run placed on the twin, once placed. */
  placedAssetId: string | null;

  ingest: (event: PipelineEvent) => void;
  setPlacedAsset: (id: string | null) => void;
  reset: () => void;
}

const EMPTY = {
  status: "idle" as const,
  runId: null,
  stage: null,
  events: [],
  gate: null,
  profile: null,
  assessment: null,
  selfCheck: null,
  summary: null,
  error: null,
  placedAssetId: null,
};

export const useRunStore = create<RunState>((set, get) => ({
  ...EMPTY,

  ingest: (event) => {
    const base = { events: [...get().events, event] };
    switch (event.type) {
      case "run.started":
        set({ ...EMPTY, status: "running", runId: event.runId, events: [event] });
        break;
      case "link.fetched":
        set({ ...base, stage: "link" });
        break;
      case "gate.started":
        set({ ...base, stage: "gate" });
        break;
      case "gate.done":
        set({ ...base, gate: event.gate });
        break;
      case "perception.started":
        set({ ...base, stage: "perception" });
        break;
      case "perception.done":
        set({ ...base, profile: event.profile });
        break;
      case "reasoning.started":
        set({ ...base, stage: "reasoning" });
        break;
      case "reasoning.done":
        set({ ...base, assessment: event.assessment });
        break;
      case "selfcheck.started":
        set({ ...base, stage: "selfcheck" });
        break;
      case "selfcheck.done":
        set({ ...base, selfCheck: event.result });
        break;
      case "revision.started":
        set({ ...base, stage: "revision" });
        break;
      case "revision.done":
        set({ ...base, assessment: event.assessment });
        break;
      case "summary.done":
        set({ ...base, stage: "summary", summary: event.text });
        break;
      case "run.completed":
        set({ ...base, status: "done", stage: null });
        break;
      case "run.error":
        set({ ...base, status: "error", stage: null, error: { stage: event.stage, message: event.message } });
        break;
      default:
        set(base);
    }
    pipelineBus.emit(event);
  },

  setPlacedAsset: (id) => set({ placedAssetId: id }),

  reset: () => set({ ...EMPTY }),
}));
