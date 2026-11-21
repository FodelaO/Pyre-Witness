/** Records original pipeline events and observed feature runs for the current browser session. */
"use client";

import { create } from "zustand";
import type { ActivityEntry, CrewId } from "@/crew/types";
import { useRunStore, type RunState } from "@/pipeline/runStore";
import type { PipelineEvent, PipelineEventType, TranscriptEntry } from "@/pipeline/types";

export type TranscriptCrew = CrewId | "gate" | "system";
export type TranscriptOrigin = "model" | "rules" | "simulation" | "system";
export type AuxiliarySource = "simulation" | "watch" | "modeler" | "voice";
export type TranscriptStatus = "running" | "completed" | "error" | "interrupted";

export interface TranscriptObservation {
  at: number;
  crew: TranscriptCrew;
  title: string;
  origin: TranscriptOrigin;
  engine?: string;
  latencyMs?: number;
  text?: string;
  raw?: unknown;
}

interface RunMetadata {
  id: string;
  label: string;
  status: TranscriptStatus;
  startedAt: number;
  endedAt?: number;
  totalMs?: number;
}

export interface PipelineRun extends RunMetadata {
  source: "capture" | "reassess";
  events: readonly PipelineEvent[];
  transcript: readonly TranscriptEntry[];
}

export interface AuxiliaryRun extends RunMetadata {
  source: AuxiliarySource;
  observations: readonly TranscriptObservation[];
}

export type TranscriptRun = PipelineRun | AuxiliaryRun;

export interface OpenTranscript {
  crewId?: TranscriptCrew;
  runId?: string;
  entryId?: string;
  at?: number;
  eventType?: PipelineEventType;
  activity?: ActivityEntry;
}

type AuxiliaryUpdate = {
  id: string;
  source: AuxiliarySource;
  label: string;
  observation: TranscriptObservation;
  status?: TranscriptStatus;
};

interface TranscriptState {
  isOpen: boolean;
  openVersion: number;
  target: OpenTranscript;
  runs: readonly TranscriptRun[];
  open: (target?: OpenTranscript) => void;
  close: () => void;
  syncPipeline: (snapshot: Pick<RunState, "events" | "transcript">) => void;
  recordObservation: (update: AuxiliaryUpdate) => void;
}

const MAX_RUNS = 20;

export const isPipelineRun = (run: TranscriptRun): run is PipelineRun =>
  run.source === "capture" || run.source === "reassess";

function saveRun(runs: readonly TranscriptRun[], next: TranscriptRun): TranscriptRun[] {
  return [...runs.filter(({ id }) => id !== next.id), next]
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-MAX_RUNS);
}

export function createTranscriptStore() {
  return create<TranscriptState>((set) => ({
    isOpen: false,
    openVersion: 0,
    target: {},
    runs: [],
    open: (target = {}) => set((state) => ({ isOpen: true, target, openVersion: state.openVersion + 1 })),
    close: () => set({ isOpen: false }),

    syncPipeline: ({ events, transcript }) => {
      const first = events[0];
      if (!first) {
        set(({ runs }) => ({
          runs: runs.map((run) => isPipelineRun(run) && run.status === "running"
            ? { ...run, status: "interrupted" }
            : run),
        }));
        return;
      }
      const start = first.type === "run.started" ? first : undefined;
      // The placement verdict can close the run while Chief's provider record is still in flight.
      const terminal = events.findLast(({ type }) => type === "run.completed" || type === "run.error");
      const status = terminal?.type === "run.completed" ? "completed" : terminal ? "error" : "running";
      set(({ runs }) => {
        const prior = runs.find((run) => run.id === first.runId);
        if (prior && isPipelineRun(prior) && prior.events === events && prior.transcript === transcript) {
          return { runs };
        }
        const interrupted = runs.map((run) => isPipelineRun(run) && run.id !== first.runId && run.status === "running"
          ? { ...run, status: "interrupted" as const }
          : run);
        return {
          runs: saveRun(interrupted, {
            id: first.runId,
            label: start?.input.label || "Analysis",
            source: start?.mode === "reassess" ? "reassess" : "capture",
            status,
            startedAt: first.at,
            ...(terminal ? { endedAt: terminal.at } : {}),
            ...(terminal?.type === "run.completed" ? { totalMs: terminal.totalMs } : {}),
            events,
            transcript,
          }),
        };
      });
    },

    recordObservation: ({ id, source, label, observation, status = "running" }) => set(({ runs }) => {
      const prior = runs.find((run) => run.id === id);
      const previous = prior && !isPipelineRun(prior) ? prior : undefined;
      const startedAt = previous?.startedAt ?? observation.at;
      return {
        runs: saveRun(runs, {
          id, source, label, status, startedAt,
          ...(status !== "running" ? { endedAt: observation.at, totalMs: observation.at - startedAt } : {}),
          observations: [...(previous?.observations ?? []), observation],
        }),
      };
    }),
  }));
}

export const useTranscriptStore = createTranscriptStore();

// Subscribe when the client module loads so completed runs survive a closed drawer.
if (typeof window !== "undefined") {
  const sync = useTranscriptStore.getState().syncPipeline;
  sync(useRunStore.getState());
  useRunStore.subscribe((next, previous) => {
    if (next.events !== previous.events || next.transcript !== previous.transcript) sync(next);
  });
}
