/** Scores labeled items and compares systems on matched item samples. Pure and network-free. */
import { isKnownTechnique } from "@/data/attack-ics";
import {
  combineCounts, jaccardToF1, mean, pairedBootstrap, proportion, quantile,
  type Count, type PairedDifference, type Pair, type Proportion,
} from "./statistics";
import { SIDES, type EvaluatedItem, type ProviderCalls, type Side } from "./types";

export const METRICS = {
  gateAccuracy: "Device gate accuracy",
  falseAcceptRate: "False accept rate",
  falseRejectRate: "False reject rate",
  categoryAccuracy: "Device category accuracy",
  physicalKindAccuracy: "Physical-kind accuracy",
  deviceTypeMatch: "Device type match (Decisions)",
  radiosPrecision: "Radio precision",
  radiosRecall: "Radio recall",
  radiosF1: "Radio F1",
  portsF1: "Port F1",
  defaultCredentialsAccuracy: "Visible default credentials accuracy",
  cloudAccuracy: "Cloud flag accuracy",
  physicalAreaAccuracy: "Physical-area accuracy",
  purdueAccuracy: "Purdue-level accuracy",
  neverPlaceViolation: "Never-place violation rate",
  riskRecall: "Expected risk-tag recall",
  techniqueValidity: "Valid ATT&CK citations",
  techniqueHallucination: "Invalid ATT&CK citations",
  ruleConsistency: "Rule consistency",
  placementCoverage: "Placement coverage",
  capacityMatch: "Product capacity or size match",
  failureRate: "Execution failure rate",
  nonDeviceCyberClaims: "Non-devices with invented cyber claims",
  nonDevicePhysicalCoverage: "Non-device physical-safety coverage",
} as const;

export type Metric = keyof typeof METRICS;
export const METRIC_KEYS = Object.keys(METRICS) as Metric[];
export const HEADLINES = ["gateAccuracy", "physicalKindAccuracy", "physicalAreaAccuracy", "ruleConsistency", "riskRecall"] as const satisfies Metric[];
export const NEGATIVE_METRICS = ["nonDeviceCyberClaims", "nonDevicePhysicalCoverage"] as const satisfies Metric[];
export const metricName = (key: Metric, objectAssessment?: boolean) => {
  if (!objectAssessment) return METRICS[key];
  if (key === "gateAccuracy") return "Device vs non-device accuracy";
  if (key === "falseAcceptRate") return "Non-devices classified as devices";
  if (key === "falseRejectRate") return "Devices classified as non-devices";
  return METRICS[key];
};

const asCount = (correct: boolean): Count => ({ numerator: Number(correct), n: 1 });
const exact = <T>(expected: T | undefined, predicted: T | null | undefined) => expected === undefined ? null : asCount(predicted === expected);
const comparable = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
export const mapForMetric = (key: Metric) => key === "radiosF1" || key === "portsF1" ? jaccardToF1 : undefined;

export function normalizedPort(value: string) {
  const name = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    ethernet: "rj45", ethernetrj45: "rj45", rj45ethernet: "rj45", "8p8c": "rj45",
    usbtypea: "usba", usbtypeb: "usbb", usbtypec: "usbc",
    sdcard: "sd", microsdcard: "microsd", tfcard: "microsd",
  };
  return aliases[name] ?? name;
}

export function normalizedSize(value: string) {
  return value.toLowerCase().normalize("NFKC").replace(/(\d)[,\s](?=\d{3}\b)/g, "$1")
    .replace(/\b(?:liters?|litres?)\b/g, "l").replace(/\b(?:millimeters?|millimetres?)\b/g, "mm")
    .replace(/\b(?:gallons?|gal\.)/g, "gal").replace(/×/g, "x").replace(/\s/g, "");
}

export function labelMatches(expected: readonly string[], predicted: readonly string[], normalize: (value: string) => string) {
  const truth = new Set(expected.map(normalize).filter(Boolean));
  const answers = new Set(predicted.map(normalize).filter(Boolean));
  const matches = [...truth].filter((label) => answers.has(label)).length;
  return { matches, expected: truth.size, predicted: answers.size, union: truth.size + answers.size - matches };
}

export function metricCounts(row: EvaluatedItem, side: Side): Record<Metric, Count | null> | null {
  const observation = row.observations[side];
  if (!observation) return null;

  const { expected } = row.item;
  const result = observation.prediction;
  const profile = result?.profile;
  const objects = observation.objectAssessment;
  const gate = objects ? objects.isDevice : result?.accepted;
  const area = result?.recommendation?.physical_placement.area;
  const level = result?.recommendation?.placement.level;
  const tagHits = expected.riskTags.filter((tag) => result?.riskTags.includes(tag)).length;
  const techniques = result?.techniques ?? [];
  const validIds = techniques.filter(isKnownTechnique).length;
  const radios = expected.radios && labelMatches(expected.radios, profile?.radios ?? [], (radio) => radio.toLowerCase().trim());
  const ports = expected.ports && labelMatches(expected.ports, profile?.ports ?? [], normalizedPort);
  const probability = row.judge?.answers[side]?.probability;
  const size = profile?.capacity_or_size;

  return {
    gateAccuracy: asCount(gate === expected.isDevice),
    falseAcceptRate: !expected.isDevice && comparable(gate) ? asCount(gate) : null,
    falseRejectRate: expected.isDevice && comparable(gate) ? asCount(!gate) : null,
    categoryAccuracy: exact(expected.category, profile?.category),
    physicalKindAccuracy: exact(expected.physicalKind, profile?.physical_kind),
    deviceTypeMatch: expected.deviceType && (probability !== undefined || !profile?.device_type)
      ? asCount(probability !== undefined && probability >= 0.5) : null,
    radiosPrecision: radios ? { numerator: radios.matches, n: radios.predicted } : null,
    radiosRecall: radios ? { numerator: radios.matches, n: radios.expected } : null,
    radiosF1: radios ? { numerator: radios.matches, n: radios.union } : null,
    portsF1: ports ? { numerator: ports.matches, n: ports.union } : null,
    defaultCredentialsAccuracy: exact(expected.defaultCredentials, profile?.default_credentials_visible),
    cloudAccuracy: exact(expected.cloud, profile?.cloud_connectivity),
    physicalAreaAccuracy: expected.areas.length ? asCount(area !== undefined && expected.areas.includes(area)) : null,
    purdueAccuracy: expected.levels.length ? asCount(level !== undefined && expected.levels.includes(level)) : null,
    neverPlaceViolation: expected.neverAreas.length && area !== undefined ? asCount(expected.neverAreas.includes(area)) : null,
    riskRecall: expected.riskTags.length ? { numerator: tagHits, n: expected.riskTags.length } : null,
    techniqueValidity: techniques.length ? { numerator: validIds, n: techniques.length } : null,
    techniqueHallucination: techniques.length ? { numerator: techniques.length - validIds, n: techniques.length } : null,
    ruleConsistency: result?.recommendation ? asCount(observation.ruleCheck?.passed === true) : null,
    placementCoverage: expected.isDevice ? asCount(Boolean(result?.recommendation)) : null,
    capacityMatch: expected.capacity ? asCount(typeof size === "string" && normalizedSize(size) === normalizedSize(expected.capacity)) : null,
    failureRate: asCount(observation.status === "error"),
    nonDeviceCyberClaims: !expected.isDevice && objects ? asCount(objects.cyberClaims.length > 0) : null,
    nonDevicePhysicalCoverage: !expected.isDevice && objects?.safetyDrop ? asCount(objects.safetyDrop.concerns.length > 0) : null,
  };
}

interface ScalarSummary { n: number; value: number | null }

export function summarizeCalls(calls: readonly (ProviderCalls | undefined)[]) {
  const recorded = calls.filter(comparable);
  const attempts = recorded.map(({ attempts }) => attempts);
  return {
    n: recorded.length,
    total: attempts.reduce((sum, count) => sum + count, 0),
    rateLimited: recorded.reduce((sum, { rateLimited }) => sum + rateLimited, 0),
    mean: mean(attempts),
    p50: quantile(attempts, 0.5),
    p95: quantile(attempts, 0.95),
  };
}

function metricPairs<T>(rows: readonly EvaluatedItem[], value: (row: EvaluatedItem, side: Side) => T | null | undefined): Pair<T>[] {
  return rows.flatMap((row) => {
    const baseline = value(row, "baseline");
    const system = value(row, "system");
    return comparable(baseline) && comparable(system) ? [{ baseline, system }] : [];
  });
}

function summarizeSide(rows: readonly EvaluatedItem[], side: Side) {
  const attempted = rows.filter((row) => row.observations[side]);
  const observations = attempted.map((row) => row.observations[side]!);
  const latencies = observations.map(({ latencyMs }) => latencyMs).filter(comparable);
  const completedLatencies = observations.filter(({ status }) => status === "ok").map(({ latencyMs }) => latencyMs).filter(comparable);
  const probabilities = attempted.map((row) => row.judge?.answers[side]?.probability).filter(comparable);
  const scored = attempted.map((row) => ({ counts: metricCounts(row, side)!, completed: row.observations[side]!.status !== "error" }));
  const metricsFor = (entries: typeof scored) => Object.fromEntries(METRIC_KEYS.map((key) => [
    key, proportion(entries.map(({ counts }) => counts[key]).filter(comparable), mapForMetric(key)),
  ])) as Record<Metric, Proportion>;
  const metrics = metricsFor(scored);
  const completed = scored.filter((entry) => entry.completed);
  return {
    n: attempted.length,
    metrics,
    completed: { n: completed.length, metrics: metricsFor(completed) },
    gate: {
      positives: attempted.filter(({ item }) => item.expected.isDevice).length,
      negatives: attempted.filter(({ item }) => !item.expected.isDevice).length,
      falseAccepts: metrics.falseAcceptRate.numerator,
      falseRejects: metrics.falseRejectRate.numerator,
      noDecision: observations.filter(({ prediction, objectAssessment }) =>
        !comparable(objectAssessment ? objectAssessment.isDevice : prediction?.accepted)).length,
    },
    failures: observations.filter(({ status }) => status === "error").length,
    timeouts: observations.filter(({ error }) => error?.timeout).length,
    gateRejections: observations.filter(({ status }) => status === "rejected").length,
    judgeFailures: attempted.filter(({ item, observations, judge }) =>
      item.expected.deviceType && observations[side]?.prediction?.profile?.device_type && judge && !judge.answers[side]).length,
    judgePending: attempted.filter(({ item, observations, judge }) =>
      item.expected.deviceType && observations[side]?.prediction?.profile?.device_type && !judge).length,
    filteredUnknownTechniques: observations.reduce((sum, { prediction }) => sum + (prediction?.filteredUnknownTechniques.length ?? 0), 0),
    latencyMs: { n: latencies.length, p50: quantile(latencies, 0.5), p95: quantile(latencies, 0.95) },
    completedLatencyMs: { n: completedLatencies.length, p50: quantile(completedLatencies, 0.5), p95: quantile(completedLatencies, 0.95) },
    calls: summarizeCalls(observations.map(({ providerCalls }) => providerCalls)),
    negatives: summarizeNegatives(attempted, side),
    typeProbability: { n: probabilities.length, value: mean(probabilities) } satisfies ScalarSummary,
  };
}

function summarizeNegatives(rows: readonly EvaluatedItem[], side: Side) {
  const negatives = rows.filter(({ item }) => !item.expected.isDevice).map(({ observations }) => observations[side]!);
  return {
    n: negatives.length,
    continued: negatives.filter(({ prediction }) => prediction?.accepted === true).length,
    stopped: negatives.filter(({ prediction }) => prediction?.accepted === false).length,
    errors: negatives.filter(({ status }) => status === "error").length,
    passive: negatives.filter(({ objectAssessment }) => objectAssessment?.objectClass === "passive_object").length,
    placements: negatives.filter(({ prediction }) => prediction?.recommendation).length,
    covered: negatives.filter(({ objectAssessment }) => objectAssessment?.safetyDrop?.concerns.length).length,
    cyberClaims: negatives.filter(({ objectAssessment }) => objectAssessment?.cyberClaims.length).length,
    suppressed: negatives.filter(({ objectAssessment }) => objectAssessment?.suppressedCyberClaims).length,
  };
}

export function summarize(rows: readonly EvaluatedItem[]) {
  const paired = rows.map((row) => ({ baseline: metricCounts(row, "baseline"), system: metricCounts(row, "system") }));
  const metrics = Object.fromEntries(METRIC_KEYS.map((key) => {
    const pairs = paired.flatMap(({ baseline, system }) => {
      const first = baseline?.[key];
      const second = system?.[key];
      return comparable(first) && comparable(second) && (first.n || second.n) ? [{ baseline: first, system: second }] : [];
    });
    const map = mapForMetric(key);
    return [key, pairedBootstrap(pairs, (counts) => {
      const { numerator, n } = combineCounts(counts);
      return n ? (map ? map(numerator / n) : numerator / n) : null;
    })];
  })) as Record<Metric, PairedDifference>;
  const latency = metricPairs(rows, (row, side) => row.observations[side]?.latencyMs);
  const probabilities = metricPairs(rows, (row, side) => row.judge?.answers[side]?.probability);
  return {
    n: rows.length,
    sides: Object.fromEntries(SIDES.map((side) => [side, summarizeSide(rows, side)])) as Record<Side, ReturnType<typeof summarizeSide>>,
    paired: {
      metrics,
      latencyMs: {
        p50: pairedBootstrap(latency, (values) => quantile(values, 0.5)),
        p95: pairedBootstrap(latency, (values) => quantile(values, 0.95)),
      },
      typeProbability: pairedBootstrap(probabilities, mean),
    },
  };
}

export type Summary = ReturnType<typeof summarize>;
