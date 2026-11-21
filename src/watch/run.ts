/** Runs one watch against a twin without applying any proposed change. */
import { randomUUID } from "node:crypto";
import { MODEL_IDS } from "@/gemini/models";
import { geminiClients } from "@/gemini/transport";
import type { Twin } from "@/twin/types";
import { groundReport } from "./groundReport";
import { collectEvidence, modelError, watchProgress } from "./progress";
import { assessThreats } from "./reassess";
import { triageCandidates, type TriagedCandidate } from "./triage";
import type { WatchEvent, WatchReport } from "./types";

export async function runWatch(
  twin: Twin,
  emit: (event: WatchEvent) => void = () => {},
  signal: AbortSignal = new AbortController().signal,
  runId: string = randomUUID(),
): Promise<WatchReport> {
  const progress = watchProgress(runId, emit);
  const { sources, candidates, risk, warnings } = await collectEvidence(twin, progress, signal);
  let reviewed = candidates;
  const complete = (headline: string, items: WatchReport["items"] = [], recommendations: WatchReport["recommendations"] = []): WatchReport => ({
    date: progress.date, runId, mode: "local", finishedAt: Date.now(), headline, items, recommendations,
    baselineScore: risk.score, sources, candidates: reviewed, stages: progress.stages, warnings,
  });

  const endTriage = progress.begin("triage");
  const skipAssessment = (reason: string, state: "skipped" | "failed" = "skipped") => {
    progress.begin("reassessment")(state, reason, MODEL_IDS.chief);
  };
  if (!process.env.GEMINI_API_KEY?.trim()) {
    endTriage("failed", "GEMINI_API_KEY is missing on the server.", MODEL_IDS.decisions);
    skipAssessment("Neon reassessment needs the server key.", "failed");
    return complete("Feed check complete · Gemini unavailable");
  }
  if (!candidates.length) {
    endTriage("skipped", "No inventory matches to triage", MODEL_IDS.decisions);
    skipAssessment("No candidates to reassess");
    return complete(sources.every(({ error }) => error) ? "Public feeds unavailable" : "No inventory matches in the last 14 days");
  }

  const { decisions, interactions } = geminiClients();
  const triageSignal = AbortSignal.any([signal, AbortSignal.timeout(22_000)]);
  let triaged: TriagedCandidate[];
  try {
    triaged = await triageCandidates(decisions, candidates, triageSignal);
    const count = (status: TriagedCandidate["disposition"]) => triaged.filter(({ disposition }) => disposition === status).length;
    endTriage("done", `${count("supported")} supported · ${count("uncertain")} uncertain · ${count("excluded")} excluded`, MODEL_IDS.decisions);
  } catch (error) {
    signal.throwIfAborted();
    endTriage("failed", modelError(MODEL_IDS.decisions, error, triageSignal), MODEL_IDS.decisions);
    warnings.push("Candidates escalated to Neon with Decisions triage unavailable.");
    triaged = candidates.map((candidate) => ({ ...candidate, disposition: "uncertain" }));
  }
  reviewed = triaged;

  const surviving = triaged.filter(({ disposition }) => disposition !== "excluded");
  if (!surviving.length) {
    skipAssessment("Decisions excluded all candidates");
    return complete("Decisions excluded all candidate matches");
  }

  const endAssessment = progress.begin("reassessment");
  const neonSignal = AbortSignal.any([signal, AbortSignal.timeout(45_000)]);
  let draft;
  try {
    ({ value: draft } = await assessThreats(interactions, surviving, twin, risk, neonSignal));
    endAssessment("done", `${draft.items.length} draft findings`, MODEL_IDS.chief);
  } catch (error) {
    signal.throwIfAborted();
    endAssessment("failed", modelError(MODEL_IDS.chief, error, neonSignal), MODEL_IDS.chief);
    return complete("Candidate matches available · reassessment incomplete");
  }

  const endRules = progress.begin("rules");
  const grounded = groundReport(draft, surviving, twin, risk.score, runId);
  warnings.push(...grounded.warnings);
  endRules("done", `${grounded.recommendations.length} proposal deltas measured`, "rules engine");
  return complete(grounded.headline, grounded.items, grounded.recommendations);
}
