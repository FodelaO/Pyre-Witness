/** Scores candidate effects against the same plant baseline and gates recommendations. */
import { COMPLIANCE } from "@/data/compliance";
import { plantExposure } from "@/econ/model";
import { complianceReferences } from "@/rules/compliance";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import type { RuleFinding, Twin } from "@/twin/types";
import type { Candidate } from "./types";

const COST_YEARS = 5;
const clauseReferences = COMPLIANCE.map(({ id }) => ({ id, label: complianceReferences(id)[0] }));

export function findingClauseIds(finding: Pick<RuleFinding, "references">): string[] {
  return clauseReferences
    .filter(({ id, label }) => finding.references.includes(id) || finding.references.includes(label))
    .map(({ id }) => id);
}

function measure(twin: Twin, assetId: string) {
  const risk = evaluateTwin(twin);
  const clauses = new Set<string>();
  let gaps = 0;
  for (const finding of risk.findings) {
    if (finding.assetId !== assetId) continue;
    const ids = findingClauseIds(finding);
    if (finding.kind === "compliance" || ids.length > 0) gaps += 1;
    ids.forEach((id) => clauses.add(id));
  }
  return { riskScore: risk.score, gaps, clauses, annualLoss: plantExposure(twin, risk).totalAnnualised };
}

export function evaluateAlternatives(twin: Twin, assetId: string, candidates: Candidate[]) {
  if (!candidates.length) return [];
  const current = measure(twin, assetId);
  return candidates.map((candidate) => {
    const next = measure(applyEffects(twin, candidate.effects), assetId);
    const annualLossAvoided = current.annualLoss - next.annualLoss;
    const net = candidate.cost === null ? null : annualLossAvoided - candidate.cost[1] / COST_YEARS;
    const complianceReduction = current.gaps - next.gaps;
    return {
      candidate,
      riskScore: next.riskScore,
      riskDelta: next.riskScore - current.riskScore,
      complianceGaps: next.gaps,
      complianceReduction,
      removedClauses: [...current.clauses].filter((id) => !next.clauses.has(id)),
      annualLoss: next.annualLoss,
      annualLossAvoided,
      net,
      qualifies: net !== null && net > 0 && complianceReduction > 0,
    };
  }).sort((a, b) => Number(b.qualifies) - Number(a.qualifies)
    || (b.net ?? -Infinity) - (a.net ?? -Infinity)
    || b.complianceReduction - a.complianceReduction);
}

export type EvaluatedCandidate = ReturnType<typeof evaluateAlternatives>[number];
