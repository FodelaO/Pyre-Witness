/** Covers retry admission for restored watch reports. */
import { describe, expect, it } from "vitest";
import type { WatchRunState } from "@/watch/watchStore";
import type { WatchStage } from "@/watch/types";
import { shouldRetryRestoredWatch } from "./watchFreshness";

const idle: WatchRunState = { status: "idle", sources: [], candidates: [], stages: [] };

function restored(name: WatchStage["name"], state: WatchStage["state"], detail = ""): WatchRunState {
  const stages = [{ name, state, detail, ms: 0 }];
  return {
    ...idle, status: "finished", stages,
    report: {
      date: "2026-11-21", finishedAt: 1, runId: "cached", mode: "local", headline: "", baselineScore: 0,
      candidates: [], items: [], recommendations: [], sources: [], stages, warnings: [],
    },
  };
}

describe("watch freshness at mount", () => {
  it("retries restored key and model errors", () => {
    expect(shouldRetryRestoredWatch(idle, restored("triage", "failed", "GEMINI_API_KEY is missing"))).toBe(true);
    expect(shouldRetryRestoredWatch(idle, restored("reassessment", "failed"))).toBe(true);
    expect(shouldRetryRestoredWatch(idle, restored("triage", "partial"))).toBe(true);
  });

  it("leaves successful, skipped, and feed-only reports on the daily schedule", () => {
    expect(shouldRetryRestoredWatch(idle, restored("triage", "done"))).toBe(false);
    expect(shouldRetryRestoredWatch(idle, restored("triage", "skipped"))).toBe(false);
    expect(shouldRetryRestoredWatch(idle, restored("feeds", "failed"))).toBe(false);
  });

  it("does not retry an unchanged report on remount or a fresh run in progress", () => {
    const failed = restored("reassessment", "failed");
    expect(shouldRetryRestoredWatch(failed, failed)).toBe(false);
    expect(shouldRetryRestoredWatch(idle, { ...idle, status: "running" })).toBe(false);
  });
});
