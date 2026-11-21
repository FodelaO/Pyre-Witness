/** Requests calibrated advisory applicability, exposure and severity in one Decisions batch. */
import type { Decisions } from "@google/genai";
import { MODEL_IDS } from "@/gemini/models";
import type { GeminiClients } from "@/gemini/transport";
import { z } from "zod";
import type { Candidate, TriageDisposition } from "./types";

const p = z.number().min(0).max(1);
const binary = z.object({ type: z.literal("noul"), noul: p, confidence: p });
const severity = z.object({ type: z.literal("score"), score: z.number().min(0).max(4), confidence: p });

export interface TriagedCandidate extends Candidate {
  disposition: TriageDisposition;
}

export async function triageCandidates(
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

  const result = await client.create({ model: MODEL_IDS.decisions, input: JSON.stringify(input), questions }, { signal });
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
