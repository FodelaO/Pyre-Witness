/** Compares the managed agent's public-feed report against local evidence and rules. */
import { MODEL_IDS } from "@/gemini/models";
import type { Twin } from "@/twin/types";
import { groundReport } from "./groundReport";
import { antigravityWatch, ManagedReportUnavailable } from "./managedAgent";
import { collectEvidence, modelError, watchProgress } from "./progress";
import { WATCH_SOURCES } from "./sources";
import type { TriagedCandidate } from "./triage";
import type { ManagedWatchProgress, WatchEvent, WatchReport } from "./types";

export async function runManagedWatch(twin: Twin, emit: (event: WatchEvent) => void, signal: AbortSignal, runId: string): Promise<WatchReport> {
  const progress = watchProgress(runId, emit);
  const { sources, inventory, candidates, unmatchedNews, risk, warnings } = await collectEvidence(twin, progress, signal);
  let managed: ManagedWatchProgress | undefined;
  const complete = (headline: string, items: WatchReport["items"] = [], recommendations: WatchReport["recommendations"] = []): WatchReport => ({
    date: progress.date, runId, mode: "managed", finishedAt: Date.now(), headline, items, recommendations,
    baselineScore: risk.score, sources, candidates, unmatchedNews, stages: progress.stages, warnings, managed,
  });

  const endManaged = progress.begin("managed");
  const started = performance.now();
  const markManaged = (phase: ManagedWatchProgress["phase"], environmentId?: string, feeds?: ManagedWatchProgress["feeds"]) => {
    managed = { phase, environmentId: environmentId || managed?.environmentId, ms: Math.round(performance.now() - started), feeds };
    progress.send({ type: "managed-progress", progress: managed });
  };
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    markManaged("failed");
    endManaged("failed", "GEMINI_API_KEY is missing on the server.", MODEL_IDS.managedAgent);
    return complete("Managed watch unavailable");
  }

  const agentSignal = AbortSignal.any([signal, AbortSignal.timeout(180_000)]);
  let artifact;
  try {
    artifact = await antigravityWatch(apiKey, twin, inventory, risk, progress.now, agentSignal, markManaged);
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof ManagedReportUnavailable) {
      endManaged("partial", error.message, MODEL_IDS.managedAgent);
      warnings.push(error.message);
      markManaged("done");
      return complete("Partial managed result · Local feed matches only");
    }
    markManaged("failed");
    endManaged("failed", modelError(MODEL_IDS.managedAgent, error, agentSignal), MODEL_IDS.managedAgent);
    return complete("Managed watch incomplete");
  }

  const partial = artifact.partial || sources.some(({ error }) => error);
  endManaged(partial ? "partial" : "done", `${artifact.draft.items.length} draft findings from Antigravity`, MODEL_IDS.managedAgent);
  warnings.push(...artifact.warnings);
  const feedNotes = artifact.feedResults.map(({ source, status, count }) =>
    `${WATCH_SOURCES[source].label} ${status === "failed" ? "failed" : status === "fetched" ? count ?? "count unavailable" : "status unavailable"}`);
  if (feedNotes.length) warnings.push(`Sandbox results · ${feedNotes.join(" · ")}. Source chips show local verification.`);
  const candidatesForReview: TriagedCandidate[] = candidates.map((candidate) => ({ ...candidate, disposition: "uncertain" }));
  const endRules = progress.begin("rules");
  const grounded = groundReport(artifact.draft, candidatesForReview, twin, risk.score, runId);
  warnings.push(...grounded.warnings);
  endRules(grounded.warnings.length ? "partial" : "done", `${grounded.recommendations.length} proposal deltas measured`, "rules engine");
  markManaged("done", undefined, artifact.feedResults);
  const headline = partial || grounded.warnings.length ? `Partial managed result · ${grounded.headline}` : grounded.headline;
  return complete(headline, grounded.items, grounded.recommendations);
}
