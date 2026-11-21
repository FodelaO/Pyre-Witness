/** Coordinates browser runs, daily admission, crew activity and human-review proposals. */
"use client";

import { appendActivity } from "@/crew/feedStore";
import { useTwinStore } from "@/twin/store";
import { create } from "zustand";
import { watchFeedFields, watchFeedStatus, type WatchFeedCheck, type WatchFeedStatus } from "./feedStatus";
import type { LiveSourceResult } from "./liveTypes";
import { WATCH_SOURCES } from "./sources";
import { readWatchStream, WatchRateLimitError } from "./streamClient";
import { cueWatchMatches, publishReviewedWatchResolutions } from "./watchResolutions";
import type { Candidate, ManagedWatchProgress, ThreatItem, WatchEvent, WatchReport, WatchRunResult, WatchStage } from "./types";
import {
  LAST_WATCH_DAY, rememberWatchDecision, restoreWatchProposals, restoreWatchReport, saveWatchReport, watchDecision, writeWatchStorage,
} from "./watchCache";

export const watchDay = () => new Date().toISOString().slice(0, 10);
type Mode = WatchReport["mode"];

export interface WatchRunState {
  status: "idle" | "running" | "finished" | "error";
  sources: LiveSourceResult[];
  candidates: Candidate[];
  unmatchedNews?: ThreatItem[];
  stages: WatchStage[];
  working?: WatchStage["name"];
  report?: WatchReport;
  message?: string;
  cached?: boolean;
  checkedAt?: number;
  managedProgress?: ManagedWatchProgress;
}

interface WatchState {
  local: WatchRunState;
  review: WatchRunState;
  managed: WatchRunState;
  feedStatus: WatchFeedStatus;
  setFeedCheck: (check: WatchFeedCheck, now?: number) => void;
  runDaily: () => void;
  runNow: (mode?: Mode) => Promise<void>;
  runReview: (mode: Mode, force: boolean) => Promise<void>;
}

const empty: WatchRunState = { status: "idle", sources: [], candidates: [], stages: [] };

function finished({ report, cached, checkedAt }: WatchRunResult, message?: string): WatchRunState {
  return {
    status: "finished", sources: report.sources, candidates: report.candidates, unmatchedNews: report.unmatchedNews,
    stages: report.stages, report, message, cached, checkedAt,
    managedProgress: report.managed,
  };
}

function localReview(state: WatchState, review: WatchRunState) {
  const { status, sources, stages, checkedAt } = state.local;
  return { review, local: { ...review, status, sources, stages, checkedAt } };
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
  review: empty,
  managed: empty,
  feedStatus: "pending",
  setFeedCheck: (check, now) => {
    const status = watchFeedStatus(check, now);
    set((state) => ({ feedStatus: status, local: { ...state.local, ...watchFeedFields(check, status) } }));
  },
  runDaily: () => {
    const date = watchDay();
    if (lastAttempt === date) return;
    lastAttempt = date;
    if (get().managed.status === "idle") {
      const managed = restoreWatchReport(date, "managed");
      if (managed) set({ managed: finished({ report: managed, cached: true, checkedAt: managed.finishedAt }) });
    }
    void get().runReview("local", false);
  },
  runNow: (mode = "local") => get().runReview(mode, true),
  runReview: async (mode, force) => {
    const key = mode === "local" ? "review" : "managed";
    const before = get()[key];
    if (before.status === "running") return;
    if (mode === "local") {
      lastAttempt = watchDay();
      writeWatchStorage(LAST_WATCH_DAY, lastAttempt);
    }

    const replace = (run: WatchRunState) => set((state) => mode === "local" ? localReview(state, run) : { managed: run });
    const update = (patch: Partial<WatchRunState>) => replace({ ...get()[key], ...patch });
    const { twin, risk } = useTwinStore.getState();
    replace({ ...empty, report: before.report, cached: before.cached, checkedAt: before.checkedAt,
      status: "running", working: mode === "local" ? "feeds" : "managed" });
    function accept(result: WatchRunResult) {
      let { report } = result;
      let message = result.note;
      saveWatchReport(report);
      const store = useTwinStore.getState();
      if (report.recommendations.length > 0) {
        if (store.risk === risk) {
          if (result.cached) report = restoreWatchProposals(report);
          else store.proposeMitigations(report.recommendations);
        } else {
          message = message ?? "Twin changed during this run. Refresh before reviewing proposals.";
        }
      }
      return finished({ ...result, report }, message);
    }
    try {
      const result = await readWatchStream(mode, twin, (event) => {
        activity(event);
        const run = get()[key];
        switch (event.type) {
          case "working": update({ working: event.name }); break;
          case "source": update({ sources: [...run.sources, event.result] }); break;
          case "matches":
            update({ candidates: event.candidates, unmatchedNews: event.unmatchedNews });
            cueWatchMatches(event.candidates, event.runId, event.at);
            break;
          case "managed-progress": update({ managedProgress: event.progress }); break;
          case "stage": update({ stages: [...run.stages, event.stage] }); break;
          case "snapshot": replace({ ...accept(event), status: "running", working: "feeds", sources: [], stages: [] }); break;
        }
      }, force);
      const accepted = accept(result);
      replace(accepted);
      if (!result.cached && accepted.report && useTwinStore.getState().risk === risk) {
        publishReviewedWatchResolutions(accepted.report);
      }
    } catch (error) {
      update({
        status: error instanceof WatchRateLimitError ? "finished" : "error", working: undefined,
        message: error instanceof Error ? error.message : "Watch unavailable.",
      });
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
