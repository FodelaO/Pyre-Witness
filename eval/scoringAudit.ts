/** Measures scorer drift on the same archived system receipts. */
import { metricCounts } from "./metrics";
import { proportion } from "./statistics";
import { SIDES, type EvaluatedItem } from "./types";

const TARGETS = ["physicalKindAccuracy", "riskRecall", "techniqueValidity", "techniqueHallucination"] as const;
type Target = typeof TARGETS[number];
export type ScoringMethods = Record<Target, string>;

function score(rows: readonly EvaluatedItem[], key: Target) {
  const calculated = rows.flatMap((row) => {
    const count = metricCounts(row, "system")?.[key];
    if (!count) return [];
    const answered = SIDES.every((side) => row.observations[side] && row.observations[side].status !== "error");
    return [{ count, answered }];
  });
  return { all: proportion(calculated.map(({ count }) => count)),
    answered: proportion(calculated.flatMap(({ count, answered }) => answered ? [count] : [])) };
}

export function auditScoring(
  fingerprint: string, original: readonly EvaluatedItem[], rescored: readonly EvaluatedItem[], current: readonly EvaluatedItem[], methods: ScoringMethods,
) {
  return { fingerprint, metrics: TARGETS.map((key) => ({
    key, method: methods[key], original: score(original, key), rescored: score(rescored, key), current: score(current, key),
  })) };
}

export type ScoringAudit = ReturnType<typeof auditScoring>;
