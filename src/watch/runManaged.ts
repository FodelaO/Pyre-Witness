/** Compares the managed agent's public-feed report against local evidence and rules. */
import { MODEL_IDS } from "@/gemini/models";
import type { Twin } from "@/twin/types";
import { groundReport } from "./groundReport";
import { antigravityWatch } from "./managedAgent";
import { collectEvidence, modelError, watchProgress } from "./progress";
import { WATCH_SOURCES } from "./sources";
import type { TriagedCandidate } from "./triage";
import type { WatchEvent, WatchReport } from "./types";

export async function runManagedWatch(twin: Twin, emit: (event: WatchEvent) => void, signal: AbortSignal, runId: string): Promise<WatchReport> {
  const progress = watchProgress(runId, emit);
  const { sources, inventory, candidates, risk, warnings } = await collectEvidence(twin, progress, signal);
  const complete = (headline: string, items: WatchReport["items"] = [], recommendations: WatchReport["recommendations"] = []): WatchReport => ({
    date: progress.date, runId, mode: "managed", finishedAt: Date.now(), headline, items, recommendations,
    baselineScore: risk.score, sources, candidates, stages: progress.stages, warnings,
  });

  const endManaged = progress.begin("managed");
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    endManaged("failed", "GEMINI_API_KEY is missing on the server.", MODEL_IDS.managedAgent);
    return complete("Managed watch unavailable");
  }

  const agentSignal = AbortSignal.any([signal, AbortSignal.timeout(180_000)]);
  let draft;
  try {
    draft = await antigravityWatch(apiKey, twin, inventory, risk, progress.now, agentSignal);
    endManaged("done", `${draft.items.length} draft findings from Antigravity`, MODEL_IDS.managedAgent);
  } catch (error) {
    signal.throwIfAborted();
    endManaged("failed", modelError(MODEL_IDS.managedAgent, error, agentSignal), MODEL_IDS.managedAgent);
    return complete("Managed watch incomplete");
  }

  const feedNotes = draft.feedResults.map(({ source, status, count }) =>
    `${WATCH_SOURCES[source].label} ${status === "failed" ? "failed" : count}`);
  warnings.push(`Sandbox results · ${feedNotes.join(" · ")}. Source chips show local verification.`);
  const candidatesForReview: TriagedCandidate[] = candidates.map((candidate) => ({ ...candidate, disposition: "uncertain" }));
  const endRules = progress.begin("rules");
  const grounded = groundReport(draft, candidatesForReview, twin, risk.score, runId);
  warnings.push(...grounded.warnings);
  endRules("done", `${grounded.recommendations.length} proposal deltas measured`, "rules engine");
  return complete(grounded.headline, grounded.items, grounded.recommendations);
}
