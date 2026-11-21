/** Coordinates browser runs, daily admission, crew activity and human-review proposals. */
"use client";

import { appendActivity } from "@/crew/feedStore";
import { useTwinStore } from "@/twin/store";
import { create } from "zustand";
import { WATCH_SOURCES } from "./sources";
import { readWatchStream } from "./streamClient";
import type { Candidate, SourceResult, WatchEvent, WatchReport, WatchStage } from "./types";

const LAST_DAY = "pyre-witness:watch:last-day";
const LAST_REPORT = "pyre-witness:watch:last-report";
export const watchDay = () => new Date().toISOString().slice(0, 10);
type Mode = WatchReport["mode"];

export interface WatchRunState {
  status: "idle" | "running" | "finished" | "error";
  sources: SourceResult[];
  candidates: Candidate[];
  stages: WatchStage[];
  working?: WatchStage["name"];
  report?: WatchReport;
  message?: string;
}

interface WatchState {
  local: WatchRunState;
  managed: WatchRunState;
  runDaily: () => void;
  runNow: (mode?: Mode) => Promise<void>;
}

const empty: WatchRunState = { status: "idle", sources: [], candidates: [], stages: [] };

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ }
}

function savedReport(date: string): WatchReport | undefined {
  try {
    const report: WatchReport = JSON.parse(readStorage(LAST_REPORT) ?? "null");
    if (report?.date === date && report.mode === "local" && Array.isArray(report.stages)
      && Array.isArray(report.items) && Array.isArray(report.sources) && Array.isArray(report.candidates)) {
      return { ...report, recommendations: [] };
    }
  } catch { /* A missing or outdated display cache is safe to discard. */ }
}

function finished(report: WatchReport, message?: string): WatchRunState {
  return { status: "finished", sources: report.sources, candidates: report.candidates, stages: report.stages, report, message };
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
    if (readStorage(LAST_DAY) === date) {
      lastAttempt = date;
      const report = savedReport(date);
      if (report) set({ local: finished(report) });
      return;
    }
    void get().runNow();
  },
  runNow: async (mode = "local") => {
    if (get()[mode].status === "running") return;
    if (mode === "local") {
      lastAttempt = watchDay();
      writeStorage(LAST_DAY, lastAttempt);
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
          case "matches": update({ candidates: event.candidates }); break;
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
      if (mode === "local") writeStorage(LAST_REPORT, JSON.stringify({ ...report, recommendations: [] }));
      set({ [mode]: finished(report, message) });
    } catch (error) {
      update({ status: "error", working: undefined, message: error instanceof Error ? error.message : "Watch unavailable." });
    }
  },
}));
