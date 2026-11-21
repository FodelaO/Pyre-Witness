/** Runs one watch against a twin without applying any proposed change. */
import { randomUUID } from "node:crypto";
import { MODEL_IDS } from "@/gemini/models";
import { geminiClients } from "@/gemini/transport";
import type { Twin } from "@/twin/types";
import { groundReport } from "./groundReport";
import { collectEvidence, modelError, watchProgress, type WatchFeedSnapshot } from "./progress";
import { assessThreats } from "./reassess";
import { askDecisionsBatch, triageCandidates, type TriagedCandidate } from "./triage";
import type { Candidate, WatchEvent, WatchReport } from "./types";

const candidateKey = ({ threat, inventory }: Candidate) => JSON.stringify([threat.source, threat.id, inventory.assetId]);
const REASSESSMENT_TIMEOUT_MS = 85_000;

export async function runWatch(
  twin: Twin,
  emit: (event: WatchEvent) => void = () => {},
  signal: AbortSignal = new AbortController().signal,
  runId: string = randomUUID(),
  feeds?: WatchFeedSnapshot,
): Promise<WatchReport> {
  const progress = watchProgress(runId, emit);
  const { sources, candidates, unmatchedNews, risk, warnings } = await collectEvidence(twin, progress, signal, feeds);
  let reviewed = candidates;
  const complete = (headline: string, items: WatchReport["items"] = [], recommendations: WatchReport["recommendations"] = []): WatchReport => ({
    date: progress.date, runId, mode: "local", finishedAt: Date.now(), headline, items, recommendations,
    baselineScore: risk.score, sources, candidates: reviewed, unmatchedNews, stages: progress.stages, warnings,
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
  const triage = await triageCandidates(candidates, signal, (batch, deadline) => askDecisionsBatch(decisions, batch, deadline));
  const triaged = triage.reviewed;
  if (!triaged.length) {
    endTriage("skipped", "No strong inventory matches to triage", MODEL_IDS.decisions);
    skipAssessment("No shortlisted candidates to reassess");
    return complete("Inventory candidates available · below the triage threshold");
  }

  const resultsByCandidate = new Map(triaged.map((candidate) => [candidateKey(candidate), candidate]));
  reviewed = candidates.map((candidate) => resultsByCandidate.get(candidateKey(candidate)) ?? candidate);
  const count = (status: TriagedCandidate["disposition"]) => triaged.filter(({ disposition }) => disposition === status).length;
  const deferred = candidates.length - triaged.length;
  const triageState = !triage.warnings.length ? "done" : triage.warnings.length === triage.batches ? "failed" : "partial";
  endTriage(triageState, `${count("supported")} supported · ${count("uncertain")} uncertain · ${count("excluded")} excluded · ${deferred} outside shortlist`, MODEL_IDS.decisions);
  warnings.push(...triage.warnings);

  const surviving = triaged.filter(({ disposition }) => disposition !== "excluded");
  if (!surviving.length) {
    skipAssessment("Decisions excluded all candidates");
    return complete("Decisions excluded all candidate matches");
  }

  const endAssessment = progress.begin("reassessment");
  const neonSignal = AbortSignal.any([signal, AbortSignal.timeout(REASSESSMENT_TIMEOUT_MS)]);
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
  const headline = triageState === "partial" ? `Partial triage · ${grounded.headline}` : grounded.headline;
  return complete(headline, grounded.items, grounded.recommendations);
}
