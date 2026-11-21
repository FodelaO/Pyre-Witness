// Scores saved pairs with Run 5 definitions and writes a compact held-out report.
import path from "node:path";
import { CHALLENGE_METHOD, INPUT_NAMES, challengeResults, passedChallenge, sampleInputs } from "../benchmarkCases";
import { json, readJson, REPORT_ROOT, writeAtomic } from "../cache";
import { EXACT_METRICS, exactMcNemar } from "../fairComparison";
import { caseResult, type Answer, type CaseResult } from "../failures";
import { exactP, pairedPoints, ratio } from "../markdown";
import { metricCounts, summarize } from "../metrics";
import type { EvaluationReport } from "../report";
import type { PairedDifference } from "../statistics";
import { rescoreSystem } from "../systemScoring";
import { SIDES, type EvaluatedItem } from "../types";
import type { HeldoutManifest } from "./ledger";

const HEADLINES = {
  physicalAreaAccuracy: "Plant area accuracy",
  physicalKindAccuracy: "Equipment kind accuracy",
  purdueAccuracy: "Purdue level accuracy",
  gateAccuracy: "Device vs non-device accuracy",
  riskRecall: "Key-risk recall",
  neverPlaceViolation: "Forbidden-area recommendations",
  radiosRecall: "Radio recall",
  cloudAccuracy: "Cloud flag accuracy",
  categoryAccuracy: "Device category accuracy",
  deviceTypeMatch: "Device-type naming match",
  ruleConsistency: "Offline rules-engine pass rate",
};
type Headline = keyof typeof HEADLINES;
const METRICS = Object.keys(HEADLINES) as Headline[];
const TIMES = { p50: "Median time per capture", p95: "p95 time per capture" };

function exactTest(rows: readonly EvaluatedItem[], key: typeof EXACT_METRICS[number]) {
  const pairs = { n: 0, bothPositive: 0, baselineOnly: 0, systemOnly: 0, neither: 0 };
  for (const row of rows) {
    const baseline = metricCounts(row, "baseline")?.[key];
    const system = metricCounts(row, "system")?.[key];
    if (!baseline?.n || !system?.n) continue;
    pairs.n += 1;
    if (baseline.numerator && system.numerator) pairs.bothPositive += 1;
    else if (baseline.numerator) pairs.baselineOnly += 1;
    else if (system.numerator) pairs.systemOnly += 1;
    else pairs.neither += 1;
  }
  return { ...pairs, p: pairs.n ? exactMcNemar(pairs.baselineOnly, pairs.systemOnly) : null };
}

function itemReason({ expected }: CaseResult, answer: Answer | undefined, passed: boolean) {
  if (!answer) return "No saved attempt";
  if (answer.status === "error") return answer.error?.timeout ? "Timed out" : "Execution error";
  if (passed) return expected.isDevice ? "Matched applicable kind and placement labels" : "Handled non-device correctly";
  if (!expected.isDevice) {
    if (answer.objectAssessment?.cyberClaims.length) return "Reported cyber claims for a non-device";
    if (answer.objectAssessment?.safetyDrop && !answer.objectAssessment.safetyDrop.concerns.length) return "Omitted physical-safety concerns";
    return "Non-device handling missed";
  }
  if (answer.status === "rejected") return "Stopped a labeled device";
  if (answer.area !== null && expected.neverAreas.includes(answer.area)) return "Recommended a forbidden area";
  if (expected.physicalKind && answer.physicalKind !== expected.physicalKind) return "Equipment kind missed";
  if (expected.areas.length && (answer.area === null || !expected.areas.includes(answer.area))) return "Plant area missed";
  return "Purdue level missed";
}

export function scoreHeldout(raw: EvaluatedItem[]) {
  const rows = rescoreSystem(raw);
  const completed = rows.filter(({ observations }) => SIDES.every((side) => observations[side]));
  const shared = completed.filter(({ observations }) => SIDES.every((side) => observations[side]?.status !== "error"));
  // Keep both sides on the same naming eligibility rule used by fairComparison.
  const sharedNames = summarize(shared.filter((row) => SIDES.every((side) => metricCounts(row, side)?.deviceTypeMatch)));
  const answered = summarize(shared);
  const all = summarize(rows);
  const cases = rows.map(caseResult);
  const challenges = SIDES.map((side) =>
    challengeResults(cases.map((entry) => ({ ...entry, answers: { system: entry.answers[side] } }))));
  return {
    completed: completed.length,
    shared: shared.length,
    metrics: METRICS.map((key) => {
      const summary = key === "deviceTypeMatch" ? sharedNames : answered;
      return { key, baseline: summary.sides.baseline.metrics[key], system: summary.sides.system.metrics[key],
        difference: summary.paired.metrics[key] };
    }),
    exact: EXACT_METRICS.map((key) => ({ key, shared: exactTest(shared, key), all: exactTest(completed, key) })),
    timing: { baseline: all.sides.baseline.latencyMs, system: all.sides.system.latencyMs, difference: all.paired.latencyMs },
    riskDifferenceAll: summarize(completed).paired.metrics.riskRecall,
    attempts: SIDES.map((side) => {
      const { n, failures, timeouts, judgeFailures, judgePending, calls } = all.sides[side];
      return { side, n, failures, timeouts, judgeFailures, judgePending, calls };
    }),
    judge: {
      attempts: rows.filter(({ judge }) => judge).length,
      errors: rows.filter(({ judge }) => judge?.error).length,
      timeouts: rows.filter(({ judge }) => judge?.error?.timeout).length,
    },
    inputs: sampleInputs(rows.map(({ item }) => item)).map(({ key, n }, index) => ({
      key, n, baseline: challenges[0].buckets[index].rate, system: challenges[1].buckets[index].rate,
    })),
    items: cases.map((entry, index) => {
      const outcome = (side: typeof SIDES[number]) => {
        const answer = entry.answers[side];
        const passed = answer ? passedChallenge({ ...entry, answers: { system: answer } }) : null;
        return { status: answer?.status ?? "pending", passed, latencyMs: answer?.latencyMs ?? null,
          reason: itemReason(entry, answer, passed === true) };
      };
      return { id: entry.id, input: rows[index].item.input.kind, difficulty: entry.group === "links" ? null : entry.group,
        baseline: outcome("baseline"), system: outcome("system") };
    }),
  };
}

type Results = ReturnType<typeof scoreHeldout>;

function bootstrapResult(difference: PairedDifference, format: (difference: PairedDifference) => string) {
  const { n, interval } = difference;
  if (n < 2 || !interval) return `${format(difference)} · Insufficient pairs for inference`;
  const significance = interval[0] > 0 || interval[1] < 0 ? "Significant" : "Inconclusive";
  return `${format(difference)} · ${significance}`;
}

export async function writeReport(manifest: HeldoutManifest, rows: EvaluatedItem[], date: string) {
  const archived = await readJson<EvaluationReport>(path.join(REPORT_ROOT, "run-5", "latest.json"));
  const fair = archived?.label === "run-5" ? archived.fairComparison : undefined;
  const devSet = fair && archived ? {
    shared: fair.answered.n,
    selected: archived.dataset.selected,
    baselineConcurrency: fair.concurrency,
    systemConcurrency: archived.concurrency,
    pipelineFingerprint: archived.pipelineFingerprint,
    metrics: METRICS.map((key) => ({ key, ...fair.answered.metrics[key] })),
    timing: { baseline: archived.overall.sides.baseline.latencyMs, system: archived.overall.sides.system.latencyMs },
  } : null;
  const { datasetFingerprint, pipelineFingerprint, startedAt, label, available, concurrency, models, thinking, baseline } = manifest;
  const results = { version: 1, label, date, startedAt, datasetFingerprint, pipelineFingerprint, concurrency, models, thinking,
    baseline, available, selected: rows.length, ...scoreHeldout(rows), devSet };
  const output = path.join(process.cwd(), "eval", "heldout");
  await writeAtomic(path.join(output, "REPORT.md"), markdown(results));
  await writeAtomic(path.join(output, "results.json"), json(results));
}

type ReportData = Results & {
  label: string; date: string; startedAt: string; datasetFingerprint: string; pipelineFingerprint: string;
  concurrency: number; models: HeldoutManifest["models"]; thinking: HeldoutManifest["thinking"]; baseline: HeldoutManifest["baseline"];
  available: number; selected: number;
  devSet: {
    shared: number; selected: number; baselineConcurrency?: number; systemConcurrency?: number;
    metrics: Pick<Results["metrics"][number], "key" | "baseline" | "system">[];
    timing: Pick<Results["timing"], "baseline" | "system">;
  } | null;
};

function seconds(value: number | null, n: number) {
  return `${value === null ? "—" : `${(value / 1000).toFixed(2)} s`} (n=${n})`;
}

export function markdown(report: ReportData) {
  const { baseline, models, devSet, timing } = report;
  const rate = (metric: Results["metrics"][number]["baseline"]) =>
    `${ratio(metric)}${metric.n ? `, ${metric.numerator}/${metric.n}` : ""}`;
  const percentile = (percent: keyof typeof TIMES) => SIDES.map((side) => seconds(timing[side][percent], timing[side].n));
  const exact = (key: Headline) => report.exact.find((test) => test.key === key)?.shared;
  const latencyDelta = ({ value, interval, n }: PairedDifference) => value === null || !interval ? `— (pairs=${n})`
    : `${(value / 1000).toFixed(2)} s [${interval.map((end) => (end / 1000).toFixed(2)).join(", ")}] (pairs=${n})`;
  const judgment = (item: Results["items"][number]["baseline"]) =>
    item.passed === null ? "Pending" : item.passed ? "Pass" : "Fail";

  return [
    "# Pyre Witness held-out evaluation", "",
    `Run \`${report.label}\` began ${report.startedAt}. Latest saved receipt ${report.date}. Workers ${report.concurrency}.`, "",
    `Pipeline source SHA-256 \`${report.pipelineFingerprint}\`. Dataset SHA-256 \`${report.datasetFingerprint}\` covers labels, metadata and capture payloads. Product-link payloads record URLs. Each side fetches the live page through its own adapter.`, "",
    `Baseline uses \`${models.baseline}\`. Pyre Witness uses \`${models.gate}\`, \`${models.perception}\`, \`${models.reasoning}\` and \`${models.chief}\`. Blinded type judging uses \`${models.judge}\`. Thinking levels ${Object.entries(report.thinking).map(([role, level]) => `${role} ${level}`).join(", ")}.`, "",
    `Baseline contract \`${baseline.contract}\` **${baseline.status}**. Prompt SHA-256 \`${baseline.promptSha256}\`. Response schema SHA-256 \`${baseline.responseSchemaSha256}\`. Both sides use fresh predictions for the held-out captures. Resume reads receipts from this run only.`, "",
    ...baseline.archived.map(({ label, contracts, donorLabel, donorContract, differs, matches }) =>
      `- ${label} manifests list ${contracts.map((contract) => `\`${contract}\``).join(", ") || "no contract"}. Published donor ${donorLabel ?? "unavailable"}${donorContract ? ` (\`${donorContract}\`)` : ""}. Check ${differs ? "DIFFERS" : matches ? "matches" : "unverified"}.`), "",
    ...(baseline.plantContext.current !== baseline.plantContext.archived ? [
      `**Plant context differs.** The baseline plant description also includes the seed plant name, which changed from ${baseline.plantContext.archived} to ${baseline.plantContext.current}. Both held-out sides use the current seed.`, "",
    ] : []),
    `${report.selected} of ${report.available} captures selected. ${report.completed} have receipts from both sides and ${report.shared} were answered by both. A deliberate rejection is an answer. Sample sizes are small and significance calls are exploratory at the 5% level, without adjustment for multiple comparisons.`, "",
    "## Shared-answer scores", "",
    "Rates show Wilson 95% intervals. Risk and radio denominators count labeled tags or radios, which can be correlated within an item. A missing prediction counts as a miss where the metric allows it. Forbidden placements and offline rule checks require a recommendation. Rule consistency uses the stored offline placement verdict against the seed. The naming score requires applicable judgments for both returned names. Quality differences are Pyre Witness minus Hydrogen. Latency includes all measured attempts and excludes the type judge. Paired bootstrap resamples captures 2,000 times.", "",
    "| Metric | Single-call Hydrogen [95% CI] | Pyre Witness [95% CI] | Paired result |",
    "| --- | --- | --- | --- |",
    ...report.metrics.map(({ key, baseline, system, difference }) => {
      const test = exact(key);
      const comparison = test ? `${exactP(test.p)} (pairs=${test.n}) · ${test.p === null ? "Unavailable" : test.p < 0.05 ? "Significant" : "Inconclusive"}`
        : bootstrapResult(difference, pairedPoints);
      return `| ${HEADLINES[key]} | ${rate(baseline)} | ${rate(system)} | ${comparison} |`;
    }),
    ...(["p50", "p95"] as const).map((percent) =>
      `| ${TIMES[percent]} | ${percentile(percent).join(" | ")} | ${bootstrapResult(timing.difference[percent], latencyDelta)} |`), "",
    "### Run 5 paired tests", "",
    "Exact McNemar uses two-sided p-values. A positive outcome means a correct area or kind, or a forbidden placement for the safety test.", "",
    "| Metric | Scope | Pairs | Both positive | Hydrogen only | Pyre Witness only | Neither | p-value |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...report.exact.flatMap(({ key, shared, all }) => ([["Shared answers", shared], ["Completed pairs", all]] as const)
      .map(([scope, test]) => `| ${HEADLINES[key]} | ${scope} | ${test.n} | ${test.bothPositive} | ${test.baselineOnly} | ${test.systemOnly} | ${test.neither} | ${exactP(test.p)} |`)),
    "", `Key-risk recall difference on all completed pairs ${bootstrapResult(report.riskDifferenceAll, pairedPoints)}.`, "",
    "## Hardest inputs", "",
    `${CHALLENGE_METHOD.split(". Edge")[0]}. Buckets are disjoint. Each side's pass rate includes its saved execution errors. Pending attempts are excluded.`, "",
    "| Input bucket | Selected | Hydrogen pass rate [95% CI] | Pyre Witness pass rate [95% CI] |",
    "| --- | ---: | --- | --- |", ...report.inputs.map(({ key, n, baseline, system }) =>
      `| ${INPUT_NAMES[key]} | ${n} | ${rate(baseline)} | ${rate(system)} |`), "",
    "## Item results", "",
    "| ID | Input | Difficulty | Hydrogen | Pyre Witness | Reason |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.items.map(({ id, input, difficulty, baseline, system }) => {
      const reason = baseline.reason === system.reason ? baseline.reason
        : `Hydrogen — ${baseline.reason}. Pyre Witness — ${system.reason}.`;
      return `| \`${id}\` | ${input} | ${difficulty ?? "—"} | ${judgment(baseline)} | ${judgment(system)} | ${reason} |`;
    }), "",
    "## Execution and judge coverage", "",
    "| Side | Saved attempts | Pending | Errors | Timeouts | Missing judge answers | Judge pending | Gemini HTTP attempts | HTTP 429s |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.attempts.map(({ side, n, failures, timeouts, judgeFailures, judgePending, calls }) =>
      `| ${side === "baseline" ? "Hydrogen" : "Pyre Witness"} | ${n} | ${report.selected - n} | ${failures} | ${timeouts} | ${judgeFailures} | ${judgePending} | ${calls.total} | ${calls.rateLimited} |`),
    "", `Type judge saved ${report.judge.attempts} attempts, with ${report.judge.errors} errors and ${report.judge.timeouts} timeouts.`, "",
    "## Run 5 development-set reference", "",
    ...(devSet ? [
      `Run 5 had ${devSet.shared}/${devSet.selected} shared answers and used ${devSet.baselineConcurrency ?? "unknown"} baseline workers and ${devSet.systemConcurrency ?? "unknown"} system workers. The development and held-out sets use separate captures and run conditions. The columns are descriptive across sets. [Archived Run 5 report](../report/run-5/REPORT.md)`, "",
      "| Metric | Held-out Hydrogen | Held-out Pyre Witness | Run 5 Hydrogen | Run 5 Pyre Witness |",
      "| --- | --- | --- | --- | --- |",
      ...report.metrics.map(({ key, baseline, system }, index) =>
        `| ${HEADLINES[key]} | ${rate(baseline)} | ${rate(system)} | ${rate(devSet.metrics[index].baseline)} | ${rate(devSet.metrics[index].system)} |`),
      ...(["p50", "p95"] as const).map((percent) =>
        `| ${TIMES[percent]} | ${percentile(percent).join(" | ")} | ${SIDES.map((side) => seconds(devSet.timing[side][percent], devSet.timing[side].n)).join(" | ")} |`),
    ] : ["The archived Run 5 comparison was unavailable." ]), "",
  ].join("\n");
}
