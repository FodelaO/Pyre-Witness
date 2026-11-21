/** Coordinates browser runs, daily admission, crew activity and human-review proposals. */
"use client";

import { appendActivity } from "@/crew/feedStore";
import { useTwinStore } from "@/twin/store";
import { create } from "zustand";
import { WATCH_SOURCES } from "./sources";
import { readWatchStream } from "./streamClient";
import type { Candidate, ManagedWatchProgress, SourceResult, ThreatItem, WatchEvent, WatchReport, WatchStage } from "./types";
import {
  LAST_WATCH_DAY, readWatchStorage, rememberWatchDecision, restoreWatchReport, saveWatchReport, watchDecision, writeWatchStorage,
} from "./watchCache";

export const watchDay = () => new Date().toISOString().slice(0, 10);
type Mode = WatchReport["mode"];

export interface WatchRunState {
  status: "idle" | "running" | "finished" | "error";
  sources: SourceResult[];
  candidates: Candidate[];
  unmatchedNews?: ThreatItem[];
  stages: WatchStage[];
  working?: WatchStage["name"];
  report?: WatchReport;
  message?: string;
  managedProgress?: ManagedWatchProgress;
}

interface WatchState {
  local: WatchRunState;
  managed: WatchRunState;
  runDaily: () => void;
  runNow: (mode?: Mode) => Promise<void>;
}

const empty: WatchRunState = { status: "idle", sources: [], candidates: [], stages: [] };

function finished(report: WatchReport, message?: string): WatchRunState {
  return {
    status: "finished", sources: report.sources, candidates: report.candidates, unmatchedNews: report.unmatchedNews,
    stages: report.stages, report, message,
    managedProgress: report.managed,
  };
}

function activity(event: WatchEvent): void {
  const base = { at: event.at, runId: event.runId, crew: "chief" as const, kind: "watch" as const };
  if (event.type === "started") appendActivity({ ...base, text: "Threat watch started" });
  if (event.type === "source") {
    const { source, count, error, ms } = event.result;
    appendActivity({ ...base, text: `${WATCH_SOURCES[source].label} · ${error ?? `${count} recent items`}`, latencyMs: ms });
  }
  if (event.type === "stage" && event.stage.name !== "feeds") {
    const { detail, model, ms } = event.stage;
    appendActivity({ ...base, text: detail, engine: model, latencyMs: ms });
  }
}

let lastAttempt: string | undefined;

export const useWatchStore = create<WatchState>((set, get) => ({
  local: empty,
  managed: empty,
  runDaily: () => {
    const date = watchDay();
    if (lastAttempt === date) return;
    if (get().managed.status === "idle") {
      const managed = restoreWatchReport(date, "managed");
      if (managed) set({ managed: finished(managed) });
    }
    if (readWatchStorage(LAST_WATCH_DAY) === date) {
      lastAttempt = date;
      const report = restoreWatchReport(date, "local");
      if (report) set({ local: finished(report) });
      return;
    }
    void get().runNow();
  },
  runNow: async (mode = "local") => {
    if (get()[mode].status === "running") return;
    if (mode === "local") {
      lastAttempt = watchDay();
      writeWatchStorage(LAST_WATCH_DAY, lastAttempt);
    }

    const update = (patch: Partial<WatchRunState>) => set((state) => ({ [mode]: { ...state[mode], ...patch } }));
    const { twin, risk } = useTwinStore.getState();
    set({ [mode]: { ...empty, status: "running", working: mode === "local" ? "feeds" : "managed" } });
    try {
      const report = await readWatchStream(mode, twin, (event) => {
        activity(event);
        const run = get()[mode];
        switch (event.type) {
          case "working": update({ working: event.name }); break;
          case "source": update({ sources: [...run.sources, event.result] }); break;
          case "matches": update({ candidates: event.candidates, unmatchedNews: event.unmatchedNews }); break;
          case "managed-progress": update({ managedProgress: event.progress }); break;
          case "stage": update({ stages: [...run.stages, event.stage] }); break;
        }
      });

      let message: string | undefined;
      const store = useTwinStore.getState();
      if (report.recommendations.length > 0) {
        if (store.risk === risk) {
          store.proposeMitigations(report.recommendations);
        } else {
          message = "Twin changed during this run. Refresh before reviewing proposals.";
        }
      }
      saveWatchReport(report);
      set({ [mode]: finished(report, message) });
    } catch (error) {
      update({ status: "error", working: undefined, message: error instanceof Error ? error.message : "Watch unavailable." });
    }
  },
}));

useTwinStore.subscribe(({ mitigations }, previous) => {
  if (mitigations === previous.mitigations) return;
  const recorded = new Set(previous.mitigations.filter(watchDecision).map(({ id }) => id));
  for (const item of mitigations) {
    if (watchDecision(item) && !recorded.has(item.id)) rememberWatchDecision(item);
  }
});
