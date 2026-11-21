/** Compares system versions on the same capture receipts and a common answered cohort. */
import { fairMetricName } from "./fairComparison";
import { mapForMetric, METRIC_KEYS, metricCounts, summarizeCalls, type Metric } from "./metrics";
import { rulesRevision, scoutStageMs, summarizePipelineEvidence } from "./pipelineEvidence";
import { combineCounts, mean, pairedBootstrap, proportion, quantile, type Count, type Proportion } from "./statistics";
import type { EvaluatedItem } from "./types";

type Rows = readonly EvaluatedItem[];
type CapturePair = { before: EvaluatedItem; after: EvaluatedItem };
type Counts = NonNullable<ReturnType<typeof metricCounts>>;
type CountPair = { before: Counts; after: Counts };
export type Measure = { value: number | null; n: number };
export type MeasureDelta = { before: Measure; after: Measure; change: number | null };
export type DeltaUnit = "rate" | "ms" | "number";
type Direction = "higher" | "lower" | "neutral";
type Scope = "all" | "answered";

export interface DeltaRow {
  key: string;
  label: string;
  unit: DeltaUnit;
  direction: Direction;
  all: MeasureDelta;
  answered: MeasureDelta;
}

const lowerRates = new Set<Metric>([
  "falseAcceptRate", "falseRejectRate", "neverPlaceViolation", "techniqueHallucination", "failureRate", "nonDeviceCyberClaims",
]);
export const FOCUS_RATES = ["radiosRecall", "cloudAccuracy", "categoryAccuracy", "deviceTypeMatch"] as const;
export const FOCUS_METRICS = [...FOCUS_RATES, "scoutP50", "scoutP95"] as const;
const sample = (value: number | null | undefined, n: number): Measure => ({ value: value ?? null, n });
const event = (value: boolean | null): Count[] => value === null ? [] : [{ numerator: Number(value), n: 1 }];

function change(before: Measure, after: Measure): MeasureDelta {
  return { before, after, change: before.value === null || after.value === null ? null : after.value - before.value };
}

function match(before: Rows, after: Rows): CapturePair[] {
  const byId = new Map(before.map((row) => [row.item.id, row]));
  return after.flatMap((current) => {
    const previous = byId.get(current.item.id);
    if (!previous?.observations.system || !current.observations.system) return [];
    const fingerprint = previous.captureFingerprints?.system;
    if (!fingerprint || fingerprint !== current.captureFingerprints?.system) {
      throw new Error(`Capture fingerprint differs between versions for ${current.item.id}.`);
    }
    return [{ before: previous, after: current }];
  });
}

function successful(row: EvaluatedItem): boolean {
  return Boolean(row.observations.baseline && row.observations.baseline.status !== "error"
    && row.observations.system && row.observations.system.status !== "error");
}

function rate(pairs: readonly CountPair[], key: Metric): MeasureDelta {
  const reduce = (side: keyof CountPair): Proportion => proportion(pairs.flatMap((pair) => {
    const count = pair[side][key];
    return count ? [count] : [];
  }), mapForMetric(key));
  return change(reduce("before"), reduce("after"));
}

function riskDelta(pairs: readonly CountPair[]) {
  return pairedBootstrap(pairs.flatMap(({ before, after }) => before.riskRecall?.n && after.riskRecall?.n
    ? [{ baseline: before.riskRecall, system: after.riskRecall }] : []), (counts) => {
    const { numerator, n } = combineCounts(counts);
    return n ? numerator / n : null;
  });
}

function measured(pairs: readonly CapturePair[], pick: (row: EvaluatedItem) => number | null | undefined,
  statistic: (numbers: number[]) => number | null, common: boolean): MeasureDelta {
  const values = pairs.map(({ before, after }) => ({ before: pick(before), after: pick(after) }))
    .filter(({ before, after }) => !common || (before != null && after != null));
  const estimate = (side: "before" | "after") => {
    const amounts = values.flatMap((value) => value[side] ?? []);
    return sample(statistic(amounts), amounts.length);
  };
  return change(estimate("before"), estimate("after"));
}

function scoutTime(row: EvaluatedItem) {
  return scoutStageMs(row.observations.system);
}

function wallTime(row: EvaluatedItem) {
  return row.observations.system?.latencyMs;
}

function completedTime(row: EvaluatedItem) {
  return row.observations.system?.status === "ok" ? wallTime(row) : null;
}

function pickRows(pairs: readonly CapturePair[], side: "before" | "after") {
  return pairs.map((pair) => pair[side]);
}

function diagnosticSamples(rows: Rows) {
  const evidence = summarizePipelineEvidence(rows);
  const calls = summarizeCalls(rows.map(({ observations }) => observations.system?.providerCalls));
  const completeCounters = evidence.n > 0 && calls.n === evidence.n && !evidence.requestTraces?.shorterCounters;
  return {
    requests: sample(evidence.requestTraces?.perCapture, evidence.requestTraces?.n ?? 0),
    httpMean: sample(completeCounters ? calls.mean : null, completeCounters ? calls.n : 0),
    httpP50: sample(completeCounters ? calls.p50 : null, completeCounters ? calls.n : 0),
    httpP95: sample(completeCounters ? calls.p95 : null, completeCounters ? calls.n : 0),
    http429: sample(completeCounters ? calls.rateLimited : null, completeCounters ? calls.n : 0),
    paths: sample(evidence.pathsPerCapture, evidence.n),
    checks: sample(evidence.checksPerCapture, evidence.n),
    checkMedian: sample(evidence.medianCheckMs, evidence.checks),
    captureCheckMedian: sample(evidence.medianCheckedCaptureMs, evidence.checkedCaptures),
    revisionRate: proportion(rows.flatMap(({ observations }) => event(rulesRevision(observations.system)))),
    timeoutRate: proportion(rows.flatMap(({ observations }) => event(Boolean(observations.system?.error?.timeout)))),
    gateFallbackRate: proportion(rows.flatMap(({ observations }) => event(Boolean(observations.system?.gateFallback)))),
  };
}

const DIAGNOSTICS = [
  ["revisionRate", "Rules-engine revision rate", "rate", "neutral"],
  ["timeoutRate", "Execution timeout rate", "rate", "lower"],
  ["gateFallbackRate", "Gate fallback rate", "rate", "neutral"],
  ["requests", "Gemini request traces per capture", "number", "lower"],
  ["httpMean", "Gemini HTTP attempts per capture", "number", "lower"],
  ["httpP50", "Gemini HTTP attempts per capture, p50", "number", "lower"],
  ["httpP95", "Gemini HTTP attempts per capture, p95", "number", "lower"],
  ["http429", "HTTP 429 responses", "number", "lower"],
  ["paths", "Displayed rule paths per capture", "number", "neutral"],
  ["checks", "Deterministic rule checks per capture", "number", "neutral"],
  ["checkMedian", "Rules-engine latency p50 per check", "ms", "lower"],
  ["captureCheckMedian", "Rules-engine total latency p50 per checked capture", "ms", "lower"],
] as const;

const LATENCIES = [
  ["scoutP50", "Scout latency p50", scoutTime, 0.50], ["scoutP95", "Scout latency p95", scoutTime, 0.95],
  ["totalP50", "End-to-end latency p50", wallTime, 0.50], ["totalP95", "End-to-end latency p95", wallTime, 0.95],
  ["assessmentP50", "Completed assessment latency p50", completedTime, 0.50],
  ["assessmentP95", "Completed assessment latency p95", completedTime, 0.95],
] as const;

export function compareSystemVersions(before: Rows, after: Rows) {
  const all = match(before, after);
  const answered = all.filter((pair) => successful(pair.before) && successful(pair.after));
  const count = (pairs: readonly CapturePair[]) => pairs.map(({ before: a, after: b }) => ({ before: metricCounts(a, "system")!, after: metricCounts(b, "system")! }));
  const allCounts = count(all);
  const answerCounts = count(answered);
  const rates: DeltaRow[] = METRIC_KEYS.map((key) => ({
    key, label: fairMetricName(key), unit: "rate", direction: lowerRates.has(key) ? "lower" : "higher",
    all: rate(allCounts, key),
    answered: rate(key === "deviceTypeMatch" ? answerCounts.filter((pair) => pair.before[key] && pair.after[key]) : answerCounts, key),
  }));
  const allBefore = diagnosticSamples(pickRows(all, "before"));
  const allAfter = diagnosticSamples(pickRows(all, "after"));
  const answerBefore = diagnosticSamples(pickRows(answered, "before"));
  const answerAfter = diagnosticSamples(pickRows(answered, "after"));
  const diagnostics: DeltaRow[] = DIAGNOSTICS.map(([key, label, unit, direction]) => ({
    key, label, unit, direction, all: change(allBefore[key], allAfter[key]), answered: change(answerBefore[key], answerAfter[key]),
  }));
  const latencies: DeltaRow[] = LATENCIES.map(([key, label, select, percentile]) => ({
    key, label, unit: "ms", direction: "lower",
    all: measured(all, select, (values) => quantile(values, percentile), false),
    answered: measured(answered, select, (values) => quantile(values, percentile), true),
  }));
  const judge = (row: EvaluatedItem) => row.judge?.answers.system?.probability;
  const namingConfidence: DeltaRow = { key: "typeProbability", label: "Mean device-type P(match)", unit: "number", direction: "higher",
    all: measured(all, judge, mean, false), answered: measured(answered, judge, mean, true) };
  return {
    n: { all: all.length, answered: answered.length },
    rows: [...rates, ...latencies, namingConfidence, ...diagnostics],
    risk: { all: riskDelta(allCounts), answered: riskDelta(answerCounts) },
  };
}

export type VersionDelta = ReturnType<typeof compareSystemVersions>;

function magnitude(row: DeltaRow, scope: Scope) {
  const value = row[scope].change;
  if (value === null || row.direction === "neutral") return 0;
  return (row.direction === "higher" ? -value : value);
}

export function regressionHighlights(delta: VersionDelta) {
  const losses: { row: DeltaRow; scope: Scope }[] = delta.rows.flatMap((row) => {
    const scope: Scope = magnitude(row, "answered") > 0 ? "answered" : "all";
    return magnitude(row, scope) > 1e-9 ? [{ row, scope }] : [];
  });
  const priority = losses.filter(({ row }) => FOCUS_METRICS.some((key) => key === row.key));
  const other = losses.filter(({ row }) => row.unit === "rate" && !FOCUS_RATES.some((key) => key === row.key))
    .sort((left, right) => magnitude(right.row, right.scope) - magnitude(left.row, left.scope));
  const diagnostics = losses.filter((loss) => !priority.includes(loss) && !other.includes(loss));
  return [...priority, ...other, ...diagnostics];
}
