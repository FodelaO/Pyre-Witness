/** Compares the two labeled runs over their shared, completed capture IDs. */
import { digest } from "./cache";
import { HEADLINES, mapForMetric, metricCounts, summarize } from "./metrics";
import { combineCounts, pairedBootstrap, type Count } from "./statistics";
import { SIDES, type EvaluatedItem } from "./types";

function productionChange(before: EvaluatedItem[], after: EvaluatedItem[], policyChanged: boolean) {
  const earlier = before.map((row) => metricCounts(row, "system"));
  const later = after.map((row) => metricCounts(row, "system"));
  return HEADLINES.map((key) => {
    if (key === "gateAccuracy" && policyChanged) return { key, change: { n: 0, value: null, interval: null } };
    const pairs = earlier.flatMap((row, index) => {
      const baseline = row?.[key];
      const system = later[index]?.[key];
      return baseline?.n && system?.n ? [{ baseline, system }] : [];
    });
    const transform = mapForMetric(key);
    const value = (counts: Count[]) => {
      const { numerator, n } = combineCounts(counts);
      return n ? transform?.(numerator / n) ?? numerator / n : null;
    };
    return { key, change: pairedBootstrap(pairs, value) };
  });
}

type ComparisonInput = { completed: EvaluatedItem[];
  manifest: { sides: readonly string[]; baselineContract?: string; thinking?: Record<string, string>; objectAssessment?: boolean } };
type MissingComparison = { state: "pending" | "no-overlap" };

export type RunComparison = MissingComparison | {
  state: "ready";
  n: number;
  baselineContractChanged: boolean;
  policyChanged: boolean;
  reasoningThinking: [string | null, string | null];
  run1: ReturnType<typeof comparisonSide>;
  run2: ReturnType<typeof comparisonSide>;
  systemChanges: ReturnType<typeof productionChange>;
};

function comparisonSide(rows: EvaluatedItem[]) {
  const { sides } = summarize(rows);
  const project = ({ metrics, latencyMs, completedLatencyMs, calls, negatives, timeouts, n }: typeof sides.baseline) => ({
    metrics: HEADLINES.map((key) => metrics[key]), latencyMs, completedLatencyMs, calls, negatives, timeouts, n,
    area: metrics.physicalAreaAccuracy, placements: metrics.placementCoverage.numerator,
  });
  return { baseline: project(sides.baseline), system: project(sides.system) };
}

export function compareRuns(run1: ComparisonInput | null, run2: ComparisonInput | null): RunComparison {
  if (!run1 || !run2 || run1.manifest.sides.length !== 2 || run2.manifest.sides.length !== 2) return { state: "pending" };
  const later = new Map(run2.completed.map((row) => [row.item.id, row]));
  const run1Matched: EvaluatedItem[] = [];
  const run2Matched: EvaluatedItem[] = [];
  for (const earlier of run1.completed) {
    const current = later.get(earlier.item.id);
    if (current && digest(earlier.item) === digest(current.item)
      && SIDES.every((side) => !earlier.captureFingerprints?.[side] || !current.captureFingerprints?.[side]
        || earlier.captureFingerprints[side] === current.captureFingerprints[side])) {
      run1Matched.push(earlier);
      run2Matched.push(current);
    }
  }
  if (!run1Matched.length) return { state: "no-overlap" };
  const policyChanged = Boolean(run1.manifest.objectAssessment) !== Boolean(run2.manifest.objectAssessment);
  return { state: "ready", n: run1Matched.length, policyChanged,
    baselineContractChanged: (run1.manifest.baselineContract ?? "original-output-v1") !== (run2.manifest.baselineContract ?? "original-output-v1"),
    reasoningThinking: [run1.manifest.thinking?.reasoning ?? null, run2.manifest.thinking?.reasoning ?? null],
    run1: comparisonSide(run1Matched), run2: comparisonSide(run2Matched),
    systemChanges: productionChange(run1Matched, run2Matched, policyChanged) };
}
