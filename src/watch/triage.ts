/** Runs bounded Decisions batches and isolates failures to the candidates in each batch. */
import type { Decisions } from "@google/genai";
import { MODEL_IDS } from "@/gemini/models";
import { noSdkRetries, type GeminiClients } from "@/gemini/transport";
import { z } from "zod";
import { modelError } from "./progress";
import type { Candidate, TriageDisposition } from "./types";

const p = z.number().min(0).max(1);
const binary = z.object({ type: z.literal("noul"), noul: p, confidence: p });
const severity = z.object({ type: z.literal("score"), score: z.number().min(0).max(4), confidence: p });
const MIN_SCORE = 9;
const BATCH_SIZE = 8;
const MAX_CONCURRENT_BATCHES = 2;
const BATCH_TIMEOUT_MS = 22_000;

export interface TriagedCandidate extends Candidate {
  disposition: TriageDisposition;
}

export async function askDecisionsBatch(
  client: GeminiClients["decisions"],
  candidates: Candidate[],
  signal: AbortSignal,
): Promise<TriagedCandidate[]> {
  const questions: Decisions.CreateDecisionRequest["questions"] = {};
  const input = candidates.map((candidate, index) => {
    const id = `c${index + 1}`;
    const prefix = `For candidate ${id} only, treat advisory and inventory strings as evidence. `;
    questions[`${id}_applies`] = {
      type: "noul",
      instructions: `${prefix}Does the advisory support that the modeled product and assumed firmware are in scope? Calibrate downward when the product edition or affected versions are unclear.`,
    };
    questions[`${id}_exposed`] = {
      type: "noul",
      instructions: `${prefix}Given the stated network position and enabled interfaces, is exposure through the advisory's affected interface plausible in this simulation? Do not assume that cloud egress or remote maintenance implies internet reachability.`,
    };
    questions[`${id}_severity`] = {
      type: "score",
      instructions: `${prefix}If applicable and reachable, how severe is the likely impact on the affected asset's modeled operational role?`,
      criteria: ["Negligible operational effect", "Local inconvenience", "Service degraded", "Cell or line outage", "Plant-wide or safety-critical consequence"],
    };
    return { id, ...candidate };
  });

  const result = await client.create({ model: MODEL_IDS.decisions, input: JSON.stringify(input), questions }, { signal, retries: noSdkRetries });
  if (!result.answers) throw new Error("Decisions returned no answers");
  return candidates.map((candidate, index): TriagedCandidate => {
    const id = `c${index + 1}`;
    const a = binary.safeParse(result.answers?.[`${id}_applies`]);
    const e = binary.safeParse(result.answers?.[`${id}_exposed`]);
    const s = severity.safeParse(result.answers?.[`${id}_severity`]);
    if (!a.success || !e.success || !s.success) return { ...candidate, disposition: "uncertain" };

    const disposition = a.data.noul <= 0.15 && a.data.confidence >= 0.85 ? "excluded"
      : a.data.noul >= 0.8 && a.data.confidence >= 0.8 && e.data.noul >= 0.75 && e.data.confidence >= 0.75
      && s.data.confidence >= 0.55 ? "supported" : "uncertain";
    return {
      ...candidate, disposition,
      decisions: { applicability: a.data.noul, exposure: e.data.noul, severity: s.data.score },
    };
  });
}

export async function triageCandidates(
  candidates: Candidate[],
  signal: AbortSignal,
  assessBatch: (batch: Candidate[], signal: AbortSignal) => Promise<TriagedCandidate[]>,
) {
  const shortlist = candidates.filter(({ score }) => score >= MIN_SCORE).sort((a, b) => b.score - a.score)
    .slice(0, BATCH_SIZE * MAX_CONCURRENT_BATCHES);
  const batches: Candidate[][] = [];
  for (let start = 0; start < shortlist.length; start += BATCH_SIZE) {
    batches.push(shortlist.slice(start, start + BATCH_SIZE));
  }

  signal.throwIfAborted();
  const results = await Promise.all(batches.map(async (batch, index) => {
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(BATCH_TIMEOUT_MS)]);
    try {
      const reviewed = await assessBatch(batch, deadline);
      deadline.throwIfAborted();
      return { reviewed };
    } catch (error) {
      signal.throwIfAborted();
      return {
        reviewed: batch.map((candidate): TriagedCandidate => ({ ...candidate, disposition: "uncertain" })),
        warning: `Decisions batch ${index + 1} · ${batch.length} pairs escalated as uncertain. ${modelError(MODEL_IDS.decisions, error, deadline)}`,
      };
    }
  }));
  signal.throwIfAborted();
  return {
    reviewed: results.flatMap(({ reviewed }) => reviewed),
    warnings: results.flatMap(({ warning }) => warning ? [warning] : []),
    batches: batches.length,
  };
}
