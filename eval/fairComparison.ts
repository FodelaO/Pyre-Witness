/** Pairs the original system receipts with a fresh, unchanged one-call baseline. */
import { diagnoseBaseline } from "./baselineDiagnosis";
import { BASELINE_CONTRACT } from "./baselineContract";
import { mapForMetric, METRIC_KEYS, metricCounts, metricName, type Metric } from "./metrics";
import { rulesRevision } from "./pipelineEvidence";
import type { readRunSnapshot } from "./runSnapshot";
import { combineCounts, pairedBootstrap, proportion, type Proportion } from "./statistics";
import { SIDES, type EvaluatedItem, type JudgeArtifact, type Side } from "./types";

type Snapshot = NonNullable<Awaited<ReturnType<typeof readRunSnapshot>>>;
type Cohort = { n: number; metrics: Record<Metric, Record<Side, Proportion>>; revisions: Proportion };
export const EXACT_METRICS = ["physicalAreaAccuracy", "physicalKindAccuracy", "neverPlaceViolation"] as const;

export const fairMetricName = (key: Metric) => key === "neverPlaceViolation"
  ? "Unsafe recommendations in labeled forbidden areas"
  : metricName(key, true);

function mergedJudge(baseline?: JudgeArtifact, system?: JudgeArtifact): JudgeArtifact | undefined {
  if (!baseline && !system) return undefined;
  const answers = { baseline: baseline?.answers.baseline, system: system?.answers.system };
  return { answers, latencyMs: null, raw: null };
}

export function joinBaseline(system: Snapshot, baseline: Snapshot): EvaluatedItem[] {
  if (!system.manifest.sides.includes("system") || baseline.manifest.sides.join() !== "baseline"
    || baseline.manifest.baselineContract !== BASELINE_CONTRACT
    || system.manifest.datasetFingerprint !== baseline.manifest.datasetFingerprint
    || system.manifest.itemIds.join() !== baseline.manifest.itemIds.join()) {
    throw new Error("The system and fresh baseline must use the same labeled captures and the original baseline contract.");
  }
  const byId = new Map(baseline.completed.map((row) => [row.item.id, row]));
  return system.completed.flatMap((archived) => {
    const fresh = byId.get(archived.item.id);
    if (!fresh) return [];
    const originalInput = archived.captureFingerprints?.system;
    if (!originalInput || originalInput !== fresh.captureFingerprints?.baseline) {
      throw new Error(`Original and fresh capture fingerprints differ for ${archived.item.id}.`);
    }
    return [{ ...archived, captureFingerprints: { baseline: originalInput, system: originalInput },
      observations: { baseline: fresh.observations.baseline, system: archived.observations.system },
      judge: mergedJudge(fresh.judge, archived.judge) }];
  });
}

function reviewRevisions(rows: readonly EvaluatedItem[]): Proportion {
  return proportion(rows.flatMap(({ observations: { system } }) => {
    const revised = rulesRevision(system);
    return revised === null ? [] : [{ numerator: Number(revised), n: 1 }];
  }));
}

function cohort(rows: readonly EvaluatedItem[], paired: boolean): Cohort {
  const counts = rows.map((row) => ({ baseline: metricCounts(row, "baseline"), system: metricCounts(row, "system") }));
  const metrics = Object.fromEntries(METRIC_KEYS.map((key) => [key, Object.fromEntries(SIDES.map((side) => [side,
    proportion(counts.flatMap((item) => {
      if (paired && key === "deviceTypeMatch" && (!item.baseline?.[key] || !item.system?.[key])) return [];
      const count = item[side]?.[key];
      return count ? [count] : [];
    }), mapForMetric(key)),
  ]))])) as Cohort["metrics"];
  return { n: rows.length, metrics, revisions: reviewRevisions(rows) };
}

export function exactMcNemar(baselineOnly: number, systemOnly: number) {
  const discordant = baselineOnly + systemOnly;
  let probability = 2 ** -discordant;
  let tail = probability;
  for (let successes = 1; successes <= Math.min(baselineOnly, systemOnly); successes += 1) {
    probability *= (discordant - successes + 1) / successes;
    tail += probability;
  }
  return Math.min(1, 2 * tail);
}

function exactFor(rows: readonly EvaluatedItem[], key: typeof EXACT_METRICS[number]) {
  const pairs = { n: 0, bothCorrect: 0, baselineOnly: 0, systemOnly: 0, neither: 0 };
  for (const row of rows) {
    const [baselineScore, systemScore] = SIDES.map((side) => metricCounts(row, side)?.[key]);
    if (!baselineScore?.n || !systemScore?.n) continue;
    const first = Boolean(baselineScore.numerator);
    const second = Boolean(systemScore.numerator);
    pairs.n += 1;
    pairs[first ? (second ? "bothCorrect" : "baselineOnly") : (second ? "systemOnly" : "neither")] += 1;
  }
  return { ...pairs, p: pairs.n ? exactMcNemar(pairs.baselineOnly, pairs.systemOnly) : null };
}

function riskDifference(rows: readonly EvaluatedItem[]) {
  return pairedBootstrap(rows.flatMap((row) => {
    const baseline = metricCounts(row, "baseline")?.riskRecall;
    const system = metricCounts(row, "system")?.riskRecall;
    return baseline?.n && system?.n ? [{ baseline, system }] : [];
  }), (sample) => {
    const { numerator, n } = combineCounts(sample);
    return n ? numerator / n : null;
  });
}

export function compareBaseline(baseline: Snapshot, historical: Snapshot, rows: readonly EvaluatedItem[]) {
  const answered = rows.filter(({ observations }) => SIDES.every((side) => observations[side] && observations[side].status !== "error"));
  const exact = EXACT_METRICS.map((key) => ({ key, answered: exactFor(answered, key), all: exactFor(rows, key) }));
  return {
    label: baseline.manifest.label ?? baseline.id,
    fingerprint: baseline.manifest.fingerprint,
    concurrency: baseline.manifest.concurrency,
    date: new Date(baseline.lastArtifactMs).toISOString(),
    wallClockMs: baseline.lastArtifactMs - Date.parse(baseline.manifest.startedAt),
    baselineAttempts: baseline.attempts.baseline,
    baselineAnswers: baseline.completed.filter(({ observations }) => observations.baseline?.status !== "error").length,
    historical: diagnoseBaseline(historical.completed),
    all: cohort(rows, false),
    answered: cohort(answered, true),
    areaTest: exact[0].answered,
    exact,
    riskDifference: { answered: riskDifference(answered), all: riskDifference(rows) },
  };
}

export type FairComparison = ReturnType<typeof compareBaseline>;
