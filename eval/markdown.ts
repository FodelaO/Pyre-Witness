/** Renders all measured denominators, intervals and failure evidence as Markdown. */
import { CHALLENGE_METHOD, INPUT_NAMES, onlyNegativeCredentialLabels } from "./benchmarkCases";
import { MODEL_ATTEMPTS } from "@/gemini/transport";
import { BASELINE_DEADLINE_MS } from "./baseline";
import { fairMetricName } from "./fairComparison";
import type { Answer, CaseResult } from "./failures";
import { HEADLINES, METRICS, METRIC_KEYS, NEGATIVE_METRICS, metricName, type Metric, type Summary } from "./metrics";
import type { EvaluationReport } from "./report";
import type { PairedDifference, Proportion } from "./statistics";
import { GROUPS, SIDES } from "./types";
import { FOCUS_METRICS, type VersionDelta } from "./versionDelta";
import { measured as measuredDelta, regressionText, versionDeltaTable } from "./versionDeltaFormat";

const SIDE = { baseline: "Baseline", system: "System" } as const;
const pct = (value: number) => `${(100 * value).toFixed(1)}%`;
const pp = (value: number) => {
  const points = 100 * value;
  return `${value > 0 ? "+" : ""}${points.toFixed(points !== 0 && Math.abs(points) < 0.05 ? 2 : 1)} pp`;
};
const ms = (value: number) => `${value.toFixed(0)} ms`;
const signedMs = (value: number) => `${value > 0 ? "+" : ""}${ms(value)}`;
const probability = (value: number) => value.toFixed(3);
export const exactP = (value: number | null) => value === null ? "unavailable" : `p=${value.toPrecision(3)}`;
const signedProbability = (value: number) => `${value > 0 ? "+" : ""}${probability(value)}`;
export const nested = (value: string) => value.replace(/\s+/g, " ").replace(/[\\|`*_\[\]<>]/g, "\\$&");
const textList = (values: readonly (string | number)[]) => values.length ? values.join(", ") : "none";
const showFlag = (value: boolean | null | undefined) => value === true ? "yes" : value === false ? "no" : "unknown";

export function ratio(metric: Proportion): string {
  return metric.value === null || !metric.interval ? `— (n=${metric.n})`
    : `${pct(metric.value)} [${metric.interval.map(pct).join("–")}] (n=${metric.n})`;
}

function delta(value: PairedDifference, format: (value: number) => string): string {
  return value.value === null || !value.interval ? `— (pairs=${value.n})`
    : `${format(value.value)} [${value.interval.map(format).join(", ")}] (pairs=${value.n})`;
}

export const pairedPoints = (value: PairedDifference) => delta(value, pp);

function metricsTable(summary: Summary, keys: readonly Metric[], objects?: boolean): string[] {
  const { sides, paired } = summary;
  return [
    "| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |",
    "| --- | ---: | ---: | ---: |",
    ...keys.map((key) => `| ${metricName(key, objects)} | ${ratio(sides.baseline.metrics[key])} | ${ratio(sides.system.metrics[key])} | ${delta(paired.metrics[key], pp)} |`),
    "",
  ];
}

function coverageTable(summary: Summary, objects?: boolean, incompleteSystemCounters = false): string[] {
  const rows = SIDES.map((side) => ({ side, ...summary.sides[side] }));
  return [
    `| System | Scored | Device / non-device | ${objects ? "False device / non-device label" : "False accept / reject"} | ${objects ? "No classification" : "No gate answer"} | Run errors / timeouts | Judge errors / pending | Filtered IDs |`,
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(({ side, n, gate, failures, timeouts, judgeFailures, judgePending, filteredUnknownTechniques }) =>
      `| ${SIDE[side]} | ${n} | ${gate.positives} / ${gate.negatives} | ${gate.falseAccepts} / ${gate.falseRejects} | ${gate.noDecision} | ${failures} / ${timeouts} | ${judgeFailures} / ${judgePending} | ${filteredUnknownTechniques} |`),
    "",
    "| Measure | Baseline | System | Paired difference [95% CI] |",
    "| --- | ---: | ---: | ---: |",
    ...(["p50", "p95"] as const).map((percentile) => {
      const values = rows.map(({ latencyMs }) => `${latencyMs[percentile] === null ? "—" : ms(latencyMs[percentile])} (n=${latencyMs.n})`);
      return `| End-to-end latency ${percentile} | ${values.join(" | ")} | ${delta(summary.paired.latencyMs[percentile], signedMs)} |`;
    }),
    `| Completed assessments, latency p50 / p95 | ${rows.map(({ completedLatencyMs: value }) => value.n
      ? `${ms(value.p50!)} / ${ms(value.p95!)} (n=${value.n})` : "— (n=0)").join(" | ")} | — |`,
    `| Recorded Gemini HTTP attempts, total / mean per capture${incompleteSystemCounters ? " (system counter incomplete)" : ""} | ${rows.map(({ calls }) => callsText(calls)).join(" | ")} | — |`,
    `| Recorded Gemini HTTP attempts per capture, p50 / p95 | ${rows.map(({ calls }) => calls.n ? `${calls.p50} / ${calls.p95} (n=${calls.n})` : "—").join(" | ")} | — |`,
    `| HTTP 429 responses | ${rows.map(({ calls }) => calls.n ? calls.rateLimited : "—").join(" | ")} | — |`,
    `| Mean device-type P(match) | ${rows.map(({ typeProbability: { value, n } }) => `${value === null ? "—" : probability(value)} (n=${n})`).join(" | ")} | ${delta(summary.paired.typeProbability, signedProbability)} |`,
    "",
  ];
}

const ACCURACY = ["gateAccuracy", "physicalKindAccuracy", "physicalAreaAccuracy", "purdueAccuracy"] as const;

function completedAccuracy(report: EvaluationReport) {
  return [
    "## Accuracy over all attempts and completed responses", "",
    "Completed responses include a deliberate usability stop. Each metric retains its labeled denominator.", "",
    "| Metric | Baseline all | Baseline completed | Pyre Witness all | Pyre Witness completed |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...ACCURACY.map((key) => {
      const values = SIDES.flatMap((side) => {
        const result = report.overall.sides[side];
        return [ratio(result.metrics[key]), ratio(result.completed.metrics[key])];
      });
      return `| ${metricName(key, report.objectAssessment)} | ${values.join(" | ")} |`;
    }), "",
  ];
}

function fairAccuracy(report: EvaluationReport) {
  const fair = report.fairComparison;
  if (!fair) return [];
  const area = fair.areaTest;
  const comparison = ["gateAccuracy", "categoryAccuracy", "deviceTypeMatch", "physicalKindAccuracy", "physicalAreaAccuracy",
    "purdueAccuracy", "riskRecall", "ruleConsistency"] as const;
  const ties = comparison.filter((key) => {
    const { baseline, system } = fair.answered.metrics[key];
    return baseline.value !== null && baseline.value === system.value;
  });
  const strongExamples = (["physicalKindAccuracy", "deviceTypeMatch", "riskRecall", "radiosRecall", "cloudAccuracy"] as const).flatMap((key) => {
    const { baseline, system } = fair.answered.metrics[key];
    return baseline.value !== null && system.value !== null && baseline.value > system.value
      ? [`${fairMetricName(key)} (${pct(baseline.value)} vs ${pct(system.value)})`] : [];
  });
  return [
    "## Paired results and all attempts", "",
    `Both sides answered on ${fair.answered.n}/${fair.all.n} captures. A deliberate usability stop is an answer. All-attempt accuracy includes missing predictions as misses. Output-dependent metrics use their eligible denominators for each side. The paired device-type score requires an available judgment for each returned type.`, "",
    "| Metric | Baseline paired [95% CI] | Pyre Witness paired [95% CI] | Baseline all [95% CI] | Pyre Witness all [95% CI] |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...METRIC_KEYS.map((key) => `| ${fairMetricName(key)} | ${[fair.answered, fair.all].flatMap(({ metrics }) => SIDES.map((side) => ratio(metrics[key][side]))).join(" | ")} |`),
    `| Rules-engine revision rate | N/A | ${ratio(fair.answered.revisions)} | N/A | ${ratio(fair.all.revisions)} |`, "",
    "### Exact paired tests and risk recall interval", "",
    "| Metric | Scope | Pairs | Both positive | Hydrogen only | Pyre Witness only | Neither | Exact McNemar (two-sided) |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...fair.exact.flatMap(({ key, answered, all }) => ([['Both answered', answered], ['All attempts', all]] as const).map(([label, test]) =>
      `| ${fairMetricName(key)} | ${label} | ${test.n} | ${test.bothCorrect} | ${test.baselineOnly} | ${test.systemOnly} | ${test.neither} | ${exactP(test.p)} |`)), "",
    "A positive outcome is a correct answer for area and kind, and a labeled forbidden placement for the safety test. The safety test uses pairs with two applicable recommendations.", "",
    `Key-risk recall difference (Pyre Witness minus Hydrogen), bootstrapped by capture with a 95% interval. Both answered ${pairedPoints(fair.riskDifference.answered)}. All attempts ${pairedPoints(fair.riskDifference.all)}.`, "",
    ...(area.p !== null && area.p >= 0.05 ? ["The paired area difference is inconclusive at the 5% level.", ""] : []),
    ...(ties.length ? [`The two sides tied on ${ties.map(fairMetricName).join(", ")}.`, ""] : []),
    ...(strongExamples.length ? [`Hydrogen led on ${strongExamples.join(", ")}.`, ""] : []),
    "Intervals are Wilson 95%. F1 transforms the Wilson bounds on Jaccard overlap. Tags, citations and connector counts can be correlated within a capture. An unsafe recommendation places the capture in an explicitly forbidden area from its labels. Rule consistency uses the recorded offline placement verdict, with the baseline verdict preserved from the fair run. The live revision rate counts archived revision starts among initial recommendations checked by the rules engine. The single-call baseline has no revision stage.", "",
  ];
}

export function markdownSummary(report: EvaluationReport): string {
  const fair = report.fairComparison;
  if (!fair) throw new Error("The six-line summary requires a fresh paired baseline.");
  const rate = ({ numerator, n, value }: Proportion) => value === null ? "unavailable" : `${pct(value)} (${numerator}/${n})`;
  const { baseline, system } = report.overall.sides;
  const pair = (key: Metric) => SIDES.map((side) => rate(fair.answered.metrics[key][side])).join(" vs ");
  const latency = (value: number | null) => value === null ? "unavailable" : `${(value / 1000).toFixed(1)} s`;
  const exact = (key: Metric) => fair.exact.find((test) => test.key === key)?.answered.p ?? null;
  const isRun4 = report.label === "run-4";
  const traces = report.pipelineEvidence?.requestTraces;
  const systemCost = traces?.shorterCounters ? `${traces.perCapture.toFixed(2)} recorded request traces per capture` : `${system.calls.mean?.toFixed(2) ?? "unavailable"} HTTP attempts per capture`;
  if (report.versionDelta) {
    const versions = report.versionDelta;
    const regressions = regressionText(versions);
    const connectivityTie = (["radiosRecall", "cloudAccuracy"] as const).every((key) => {
      const value = versions.rows.find((row) => row.key === key)?.answered.after;
      const reference = fair.answered.metrics[key].baseline;
      return value?.value != null && value.value === reference.value && value.n === reference.n;
    });
    return [
      `Run 5 recorded ${fair.all.n}/${report.dataset.selected} captures against the saved Hydrogen baseline, with ${fair.answered.n} answered by both and ${system.failures} system execution errors${regressions ? `, and regressed on ${regressions}` : ""}.`,
      `Plant-area accuracy for Hydrogen versus Pyre Witness was ${ratio(fair.answered.metrics.physicalAreaAccuracy.baseline)} versus ${ratio(fair.answered.metrics.physicalAreaAccuracy.system)} on shared answers (Wilson 95% intervals, exact McNemar ${exactP(fair.areaTest.p)}) and ${pairAllArea(fair)} across all attempts.`,
      `On the common answered captures from Runs 4 and 5, radio recall moved ${versionMovement(versions, "radiosRecall")} and cloud flag accuracy moved ${versionMovement(versions, "cloudAccuracy")}${connectivityTie ? ", matching Hydrogen’s observed rates on both metrics" : ""}.`,
      `On that same cohort, device category accuracy moved ${versionMovement(versions, "categoryAccuracy")} and blinded device-type naming agreement moved ${versionMovement(versions, "deviceTypeMatch")}.`,
      `Against Hydrogen on shared answers, key-risk recall was ${pair("riskRecall")} (Pyre Witness minus Hydrogen ${pairedPoints(fair.riskDifference.answered)}, paired bootstrap 95%) and forbidden placements were ${pair("neverPlaceViolation")} (exact McNemar ${exactP(exact("neverPlaceViolation"))}).`,
      `Across published Scout profiles, p50 latency moved ${versionMovement(versions, "scoutP50", "all")} and p95 moved ${versionMovement(versions, "scoutP95", "all")}, with Run 5 end-to-end p50 ${latency(system.latencyMs.p50)} and p95 ${latency(system.latencyMs.p95)} at ${report.concurrency} workers.`,
    ].join("\n") + "\n";
  }
  return [
    `${report.label?.replace(/^run-(\d+)$/, "Run $1") ?? "Pyre Witness"} and the ${report.label === "run-3" ? "fresh" : "saved fair"} single-call Hydrogen baseline recorded ${fair.all.n}/${report.dataset.selected} comparable captures, with ${fair.answered.n} answered by both and ${baseline.failures} baseline errors versus ${system.failures} Pyre Witness errors.`,
    `On captures both sides answered, plant-area accuracy was ${ratio(fair.answered.metrics.physicalAreaAccuracy.baseline)} for Hydrogen and ${ratio(fair.answered.metrics.physicalAreaAccuracy.system)} for Pyre Witness (Wilson 95% intervals, exact paired McNemar ${exactP(fair.areaTest.p)}).`,
    `Across all attempts, plant-area accuracy was ${ratio(fair.all.metrics.physicalAreaAccuracy.baseline)} for Hydrogen and ${ratio(fair.all.metrics.physicalAreaAccuracy.system)} for Pyre Witness (Wilson 95% intervals).`,
    `On shared answers, Hydrogen versus Pyre Witness scored ${pair("gateAccuracy")} for device versus non-device, ${pair("physicalKindAccuracy")} for equipment kind${isRun4 ? ` (exact paired ${exactP(exact("physicalKindAccuracy"))})` : ""}, and ${pair("purdueAccuracy")} for Purdue level.`,
    `On shared answers, key-risk recall was ${pair("riskRecall")}${isRun4 ? ` (system minus baseline ${pairedPoints(fair.riskDifference.answered)}, paired bootstrap 95%)` : ""}, placements in labeled forbidden areas were ${pair("neverPlaceViolation")}${isRun4 ? ` (exact paired ${exactP(exact("neverPlaceViolation"))})` : ""}, and Pyre Witness revised ${rate(fair.answered.revisions)} of its checked recommendations.`,
    `Hydrogen averaged ${baseline.calls.mean?.toFixed(2) ?? "unavailable"} HTTP attempts per capture at ${latency(baseline.latencyMs.p50)} median and ${latency(baseline.latencyMs.p95)} p95, and Pyre Witness averaged ${systemCost} at ${latency(system.latencyMs.p50)} median and ${latency(system.latencyMs.p95)} p95${traces?.shorterCounters ? " with incomplete HTTP telemetry" : ""}.`,
  ].join("\n") + "\n";
}

function pairAllArea(fair: NonNullable<EvaluationReport["fairComparison"]>) {
  return SIDES.map((side) => ratio(fair.all.metrics.physicalAreaAccuracy[side])).join(" versus ");
}

function versionMovement(delta: VersionDelta, key: string, scope: "answered" | "all" = "answered") {
  const row = delta.rows.find((entry) => entry.key === key);
  return row ? `from ${measuredDelta(row[scope].before, row.unit)} to ${measuredDelta(row[scope].after, row.unit)}` : "unavailable";
}

function versionComparison(report: EvaluationReport) {
  const delta = report.versionDelta;
  if (!delta) return [];
  return ["## Run 4 vs Run 5", "",
    `The table joins ${delta.n.all} captured inputs by fingerprint. Its common cohort comprises the ${delta.n.answered} inputs answered by both system versions and the saved Hydrogen baseline. Device-type naming uses jointly scorable judgments in the common cohort. Output-dependent denominators use the opportunities recorded for each version.`, "",
    "Scout latency comes from the published `perception.done.latencyMs` event and includes the Scout request, validation and post-processing. Missing events contribute no latency. Common p50 and p95 use the same inputs with both timings recorded. Run 4 used six workers and Run 5 used four. The timing difference reflects both collection conditions and pipeline changes.", "",
    ...FOCUS_METRICS.map((key) => {
      const row = delta.rows.find((entry) => entry.key === key)!;
      return `- **${row.label}** moved ${versionMovement(delta, key, row.unit === "ms" ? "all" : "answered")}.`;
    }), "",
    ...versionDeltaTable(delta), "",
    `Key-risk recall change from Run 4 to Run 5 with paired bootstrap 95% intervals. Common answers ${pairedPoints(delta.risk.answered)}. All attempts ${pairedPoints(delta.risk.all)}.`, "",
    "Run 4’s incomplete HTTP counters make its HTTP-cost deltas unavailable. The request-trace row uses the same event definition for both runs. This comparison uses the same development set and scoring definitions as the previous run.", "",
  ];
}

function runTimeline(report: EvaluationReport) {
  const rows = ["run-1", "run-2", "run-3", "run-4", "run-5"].map((label, index) => {
    const observed = report.timeline?.find((entry) => entry.label === label);
    return observed?.paired
      ? `| Run ${index + 1} | ${observed.paired}/${observed.selected} | ${observed.concurrency ?? "—"} | ${observed.latencyMs.p50 === null ? "—" : ms(observed.latencyMs.p50)} | ${observed.timeouts} | ${observed.failures} | ${observed.gateFailures} | ${index >= 2 ? observed.gateFallbacks : "—"} | ${observed.placements} |`
      : `| Run ${index + 1} | Pending | — | — | — | — | — | — | — |`;
  });
  const fair = report.fairComparison;
  const baseline = report.overall.sides.baseline;
  if (fair) rows.splice(3, 0,
    `| Fair Hydrogen baseline | ${baseline.n}/${fair.baselineAttempts} | ${fair.concurrency ?? "—"} | ${baseline.latencyMs.p50 === null ? "—" : ms(baseline.latencyMs.p50)} | ${baseline.timeouts} | ${baseline.failures} | — | — | ${baseline.metrics.placementCoverage.numerator} |`);
  return ["## Changes after failures", "",
    "| Run | Recorded captures | Workers | p50 to outcome | Timeouts | Execution errors | Gate stage errors | Gate fallbacks | Device placements |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |", ...rows, "",
    "Run 2 used compact prompts, Carbon low, an as-dropped rules check before reasoning and targeted revision. Run 3 measured gate failure isolation and retry with backoff.", "",
    ...(fair ? [`The fair baseline after Run 3 answered ${fair.baselineAnswers}/${fair.baselineAttempts}. It kept the original Hydrogen request and accepted otherwise valid answers that exceeded local length caps. Run 4 reuses these receipts.`, ""] : []),
    "Run 4 evaluates Scout’s function-first equipment-kind guide and a final risk list that combines Architect risks, rules-engine findings and Scout evidence on the same development set.", "",
    "Run 5 separates Scout’s capability evidence from enabled state, fills connectivity only from explicit evidence, and sorts merged risks before capping the list.", "",
  ];
}

function scoringChanges(report: EvaluationReport) {
  const audit = report.scoringAudit;
  if (!audit) return [];
  return ["## Scoring changes", "",
    `Run 3 before and after scores below use the same saved system receipts at fingerprint \`${audit.fingerprint}\` and the same fair baseline. The fair baseline response, offline type judgment and stored verdict are preserved. Each rate has a Wilson 95% interval.`, "",
    "| System metric | Cohort | Run 3 original | Run 3 re-scored | Run 4 |",
    "| --- | --- | ---: | ---: | ---: |",
    ...audit.metrics.flatMap(({ key, original, rescored, current }) => (["answered", "all"] as const).map((cohort) =>
      `| ${fairMetricName(key)} | ${cohort === "answered" ? "Both answered" : "All attempts"} | ${ratio(original[cohort])} | ${ratio(rescored[cohort])} | ${ratio(current[cohort])} |`)), "",
    ...audit.metrics.map(({ key, method }) => `- **${fairMetricName(key)}.** ${method}`), "",
  ];
}

function challenges(report: EvaluationReport) {
  if (!report.challenges) return [];
  const summaries = new Map(report.cases.map((entry) => [entry.id, entry]));
  return [
    "## Hardest inputs", "", CHALLENGE_METHOD, "",
    "| Input | Pyre Witness case pass rate [95% CI] |", "| --- | ---: |",
    ...report.challenges.buckets.map(({ key, rate }) => `| ${INPUT_NAMES[key]} | ${ratio(rate)} |`), "",
    ...[{ label: "Hardest correct", ids: report.challenges.passed }, { label: "Hardest misses", ids: report.challenges.missed }].flatMap(({ label, ids }) => [
      `### ${label}`, "",
      ...ids.map((id) => {
        const item = summaries.get(id)!;
        return `- **${nested(id)}**. ${nested(expectedText(item))} System response — ${nested(answerText(item.answers.system))}`;
      }), "",
    ]),
  ];
}

function modalityTable(report: EvaluationReport) {
  const result = report.modality;
  if (!result) return [];
  if (!result.paired) return ["## Photo vs one-line description", "", `Pending. ${result.eligible} labeled device photos qualify.`, ""];
  const scalar = ({ value, interval, n }: PairedDifference) => value === null || !interval ? "—"
    : `${value.toFixed(2)} [${interval.map((bound) => bound.toFixed(2)).join("–")}] (n=${n})`;
  return [
    "## Photo vs one-line description", "",
    `${result.paired}/${result.eligible} matched device photos${report.modalityFrom ? ` from ${report.modalityFrom}` : ""}. The text input consists of the labeled device type alone. Both variants use the same pipeline and drop point.`, "",
    "| Attribute | Photo [95% CI] | One line [95% CI] | Photo minus text [95% CI] |",
    "| --- | ---: | ---: | ---: |",
    ...[...result.metrics, { label: "As-dropped rules verdict returned", ...result.verdictReturned }]
      .map(({ label, photo, text, photoMinusText }) => `| ${label} | ${ratio(photo)} | ${ratio(text)} | ${delta(photoMinusText, pp)} |`),
    `| Evidence items per capture | ${scalar(result.evidenceItems.photo)} | ${scalar(result.evidenceItems.text)} | ${scalar(result.evidenceItems.photoMinusText)} |`, "",
    `The as-dropped pass or hold verdict agreed on ${result.verdictAgreement.numerator}/${result.verdictAgreement.n} pairs with two verdicts. Agreement ${ratio(result.verdictAgreement)}.`, "",
    `Photo errors ${result.errors.photo}, text errors ${result.errors.text}. The text ablation made ${result.textCalls} separate Gemini HTTP attempts.`, "",
    "Known radio lists, port lists and credential flags are checked against labels. Materials, ratings and evidence items count reported observations. The device label can already name a model or interface. Missing output contributes zero. Proportions use Wilson intervals. Differences and evidence means use paired bootstrap intervals.", "",
    ...(onlyNegativeCredentialLabels(report.cases) ? ["All known credential labels mark no visible defaults.", ""] : []),
  ];
}

export function expectedText({ expected, answers }: CaseResult): string {
  if (!expected.isDevice) return Object.values(answers).some((answer) => answer.objectAssessment)
    ? "Non-device. Evaluate physical and food-safety concerns if the capture is usable."
    : "Reject non-device or unreadable capture.";
  return [
    ["Accept device", expected.deviceType, expected.category, expected.physicalKind].filter(Boolean).join(" · "),
    expected.areas.length ? `areas ${textList(expected.areas)}` : null,
    expected.levels.length ? `Purdue ${textList(expected.levels)}` : null,
    expected.neverAreas.length ? `forbidden ${textList(expected.neverAreas)}` : null,
    expected.radios ? `radios ${textList(expected.radios)}` : null,
    expected.ports ? `ports ${textList(expected.ports)}` : null,
    expected.defaultCredentials !== undefined ? `visible defaults ${showFlag(expected.defaultCredentials)}` : null,
    expected.cloud !== undefined ? `cloud ${showFlag(expected.cloud)}` : null,
    expected.capacity ? `size ${expected.capacity}` : null,
    expected.riskTags.length ? `risks ${textList(expected.riskTags)}` : null,
  ].filter(Boolean).join(" / ");
}

export function answerText(answer: Answer | undefined): string {
  if (!answer) return "Not run.";
  const object = answer.objectAssessment;
  return [
    object ? [
      object.objectClass ?? (object.isDevice === true ? "Device" : object.isDevice === false ? "Non-device" : "No classification"),
      answer.accepted === true ? "Continued" : answer.accepted === false ? "Stopped" : "No gate answer",
    ].join(" · ") : answer.accepted === true ? "Accepted" : answer.accepted === false ? "Rejected" : "No gate answer",
    [answer.deviceType, answer.category, answer.physicalKind].filter(Boolean).join(" · "),
    answer.area ? (object?.objectClass === "passive_object" ? answer.area : `${answer.area} / Purdue ${answer.level ?? "unknown"}`) : null,
    answer.neverAreas.length ? `never ${textList(answer.neverAreas)}` : null,
    answer.radios ? `radios ${textList(answer.radios)}` : null,
    answer.ports ? `ports ${textList(answer.ports)}` : null,
    answer.deviceType ? `visible defaults ${showFlag(answer.defaultCredentials)} · cloud ${showFlag(answer.cloud)}` : null,
    answer.capacity ? `size ${answer.capacity}` : null,
    answer.riskTags.length ? `risks ${textList(answer.riskTags)}` : null,
    answer.techniques.length ? `ATT&CK ${textList(answer.techniques)}` : null,
    answer.filteredUnknownTechniques.length ? `filtered IDs ${textList(answer.filteredUnknownTechniques)}` : null,
    object?.safetyDrop?.concerns.length ? `as dropped ${textList(object.safetyDrop.concerns)}` : null,
    object?.cyberClaims.length ? `non-device cyber claims ${textList(object.cyberClaims)}` : null,
    object?.suppressedCyberClaims ? "Cyber claim filtered before assessment delivery" : null,
    answer.rulesPassed === false ? `blocked (${textList(answer.ruleFindings)})` : answer.rulesPassed ? "rule check passed" : null,
    answer.typeProbability === null ? null : `P(type match) ${probability(answer.typeProbability)}`,
    answer.error ? `${answer.error.stage} · ${answer.error.message}` : null,
  ].filter(Boolean).join(" / ");
}

function callsText(calls: Summary["sides"]["baseline"]["calls"]) {
  return calls.mean === null ? "—" : `${calls.total} / ${calls.mean.toFixed(2)} (n=${calls.n})`;
}

export function comparisonRows(comparison: Extract<EvaluationReport["comparison"], { state: "ready" }>) {
  const columns = [comparison.run1.baseline, comparison.run1.system, comparison.run2.baseline, comparison.run2.system];
  return [
    ...comparison.systemChanges.flatMap(({ key, change }, index) => key === "gateAccuracy" && comparison.policyChanged ? [] : [{
      label: METRICS[key], values: columns.map(({ metrics }) => ratio(metrics[index])), change: delta(change, pp),
    }]),
    ...(["p50", "p95"] as const).map((key) => ({
      label: `Latency ${key}`, values: columns.map(({ latencyMs }) => {
        const value = latencyMs[key];
        return value === null ? "—" : `${(value / 1000).toFixed(1)} s (n=${latencyMs.n})`;
      }), change: "—",
    })),
    { label: "HTTP attempts total / mean", values: columns.map(({ calls }) => callsText(calls)), change: "—" },
  ];
}

export function beforeAfterRows(comparison: Extract<EvaluationReport["comparison"], { state: "ready" }>) {
  const sides = [comparison.run1.system, comparison.run2.system];
  const seconds = (value: number | null) => value === null ? "—" : `${(value / 1000).toFixed(1)} s`;
  return [
    { label: "Latency p50 / p95", values: sides.map(({ latencyMs, completedLatencyMs: completed }) =>
      `${seconds(latencyMs.p50)} / ${seconds(latencyMs.p95)} (n=${latencyMs.n}) · ${completed.n
        ? `completed ${seconds(completed.p50)} / ${seconds(completed.p95)} (n=${completed.n})` : "zero completed assessments"}`) },
    { label: "Timeouts", values: sides.map(({ timeouts, n }) => `${timeouts}/${n}`) },
    { label: "Physical-area accuracy", values: sides.map(({ area, placements }) => `${ratio(area)} · ${placements} device placements returned`) },
    { label: "Non-device handling", values: sides.map(({ negatives }, index) => index === 0
      ? `${negatives.continued}/${negatives.n} admitted by old gate · ${negatives.placements} placed`
      : `${negatives.passive}/${negatives.n} classed passive · ${negatives.stopped} stopped · ${negatives.errors} errors · ${negatives.placements} placed · ${negatives.covered} with safety concerns · ${negatives.cyberClaims} with cyber claims`) },
  ];
}

function comparisonTable(report: EvaluationReport) {
  const { comparison } = report;
  return [
    "## Run 1 vs run 2", "",
    ...(comparison.state === "ready" ? [
      `${comparison.n} shared paired captures. Accuracy intervals are Wilson 95%.`, "",
      ...(comparison.baselineContractChanged ? ["The one-call baseline output constraints changed between runs.", ""] : []),
      ...(comparison.reasoningThinking.every(Boolean)
        ? [`Carbon thinking · Run 1 ${comparison.reasoningThinking[0]} · Run 2 ${comparison.reasoningThinking[1]}.`, ""] : []),
      ...(comparison.policyChanged ? [
        "Run 1 used full-context reasoning before rules evaluation. Run 2 uses compact prompts, an immediate as-dropped rules check, a targeted revision, and a usability gate for any object.", "",
        "| System measure | Run 1 before | Run 2 |",
        "| --- | --- | --- |",
        ...beforeAfterRows(comparison).map(({ label, values }) => `| ${label} | ${values.join(" | ")} |`),
        "", "The device metric compares classification in Run 2 and admission in Run 1. It has no cross-run delta.", "",
      ] : []),
      "### Matched measures", "",
      "| Measure | Run 1 baseline | Run 1 system | Run 2 baseline | Run 2 system | System change [95% CI] |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
      ...comparisonRows(comparison).map(({ label, values, change }) => `| ${label} | ${values.join(" | ")} | ${change} |`),
    ] : [comparison.state === "pending" ? "Run 2 measurements pending." : "The runs have no shared completed pairs." ]), "",
  ];
}

function negativeCases(report: EvaluationReport) {
  const cases = report.cases.filter(({ expected }) => !expected.isDevice);
  if (!report.objectAssessment || !cases.length) return [];
  return [
    "## Non-device cases", "",
    "| Capture | System class | System disposition | Baseline safety concerns | System safety concerns | Published system cyber claims |",
    "| --- | --- | --- | --- | --- | --- |",
    ...cases.map(({ id, answers }) => {
      const system = answers.system;
      const object = system?.objectAssessment;
      const concerns = (answer?: Answer) => nested(textList(answer?.objectAssessment?.safetyDrop?.concerns ?? []));
      return `| ${nested(id)} | ${object?.objectClass ?? (object?.isDevice === false ? "non-device" : object?.isDevice === true ? "device" : "—")} | ${system?.status ?? "—"} | ${concerns(answers.baseline)} | ${concerns(system)} | ${nested(textList(object?.cyberClaims ?? []))} |`;
    }),
    "",
  ];
}

function treatment(report: EvaluationReport) {
  const { models, thinking } = report;
  return [
    `Baseline uses one ${models.baseline} interaction at ${thinking.perception} thinking and a prose plant description${report.baselineContract ? ` (${report.baselineContract})` : ""}.`,
    `The system uses ${models.gate} for its gate, ${models.perception} for perception, ${models.reasoning} for reasoning and any revision, the rules engine, and ${models.chief} for briefing.`,
    `The type judge uses a separate ${models.judge} request with anonymized answers. A match requires P(yes) ≥ 0.5. Mean P(match) uses only returned judgments. Type-match accuracy counts missing predictions as incorrect and excludes missing judgments for returned predictions.`,
  ].join(" ");
}

export function markdownReport(report: EvaluationReport): string {
  const { dataset, overall } = report;
  const fair = report.fairComparison;
  const traces = report.pipelineEvidence?.requestTraces;
  const objects = report.objectAssessment;
  const paired = report.sides.length === 2;
  const isPartial = dataset.evaluated < dataset.selected;
  const coverage = SIDES.filter((side) => report.sides.includes(side))
    .map((side) => `${SIDE[side]} ${dataset.attempted[side]}`).join(" · ");
  return [
    "# Pyre Witness evaluation", "",
    `${report.date} · Run \`${report.label ?? report.runId}\` · ${dataset.evaluated} / ${dataset.selected} ${paired ? "paired captures" : "captures"} · ${dataset.available} available`,
    "",
    ...(report.versionDelta && regressionText(report.versionDelta) ? [`**Observed regressions.** ${regressionText(report.versionDelta)}.`, ""] : []),
    `Recorded attempts · ${coverage}. System collection ${(report.wallClockMs / 60_000).toFixed(1)} min${report.concurrency ? ` at ${report.concurrency} capture workers` : ""}.${fair ? "" : ` ${report.reused} reused artifacts.`}`,
    "",
    ...(isPartial ? ["Partial cohort. Faster cases may finish first. Metrics use completed pairs and include attempts that returned errors.", ""] : []),
    treatment(report), "",
    ...(report.baselineFrom ? [
      `All baseline receipts come from ${report.baselineFrom}, including its validation and provider failures. Capture fingerprints and the plant seed match. Baseline latency and call counts describe those original attempts. This run reused the baseline without new calls.`, "",
    ] : []),
    ...(fair ? [
      `${report.label === "run-3" ? "Fresh baseline" : "Saved fair baseline"} \`${fair.label}\` finished at ${fair.date}, using ${fair.concurrency} workers and ${(fair.wallClockMs / 60_000).toFixed(1)} min. It uses the byte-identical first-run system prompt and request schema, the original prose plant description and capture formatting. The local scorer accepts over-length strings and lists whose limits were absent from the request schema. It preserves the returned content.`, "",
      `The baseline uses Scout’s ${BASELINE_DEADLINE_MS / 1_000} s Hydrogen deadline, inclusive of retries and backoff, with up to ${MODEL_ATTEMPTS} HTTP attempts for transient connection failures, HTTP 429 or 5xx. The shared retry waits at least 250 ms then 500 ms, honors Retry-After and adds jitter. The evaluator also shares its cross-worker 429 cooldown. Every retry sends the same request. A completed model response ends inference. The separate product-page retrieval budget is 18 s.`, "",
      ...(report.label === "run-3" ? [`System results use saved Run 3 receipts at launch fingerprint \`${report.fingerprint}\`. Readable tags, explicit holds, exclusion of virtual areas from placements and the Chief verdict update arrived later. Only the baseline was collected afresh. Baseline collection fingerprint \`${fair.fingerprint}\`.`, ""]
        : [`System results use \`${report.label}\` at launch fingerprint \`${report.fingerprint}\`. Baseline output, offline type judgments and verdicts are reused from \`${fair.label}\` at fingerprint \`${fair.fingerprint}\`. This run made zero baseline model calls.`, ""]),
    ] : []),
    "All comparisons use one development set that informed the iterations. No held-out set has been evaluated.", "",
    ...(report.pipelineFingerprint ? [`Pipeline source SHA-256 at collection launch \`${report.pipelineFingerprint}\`.`, ""] : []),
    `System thinking levels · perception ${report.thinking.perception}, reasoning ${report.thinking.reasoning}, briefing ${report.thinking.chief}. Offline judge recorded ${report.judgeCalls.total} HTTP attempts across ${report.judgeCalls.n} judgment receipts.`,
    "", ...(report.fingerprint ? [`Source and dataset fingerprint \`${report.fingerprint}\`.`, ""] : []),
    ...dataset.warnings.flatMap((warning) => [`> ${warning}`, ""]),
    ...(fair ? fairAccuracy(report) : ["## Headline results", "", ...metricsTable(overall, objects ? [...HEADLINES, ...NEGATIVE_METRICS] : HEADLINES, objects)]),
    ...coverageTable(overall, objects, Boolean(traces?.shorterCounters)),
    ...(traces?.shorterCounters ? [
      `${report.label === "run-4" ? "A disk write failure interrupted the system and offline-judge HTTP counters. Run 4 resumed from its saved receipts. " : ""}On ${traces.shorterCounters} captures the independent trace records more requests than the HTTP counter. The system trace records ${traces.total} Gemini request entries over ${traces.n} saved captures (${traces.perCapture.toFixed(2)} per capture). Request traces include recorded provider calls and can include calls interrupted before an HTTP attempt. The quality scores and elapsed times use the saved outcomes.`, "",
    ] : []),
    ...(!fair ? completedAccuracy(report) : []),
    ...versionComparison(report),
    ...runTimeline(report),
    ...scoringChanges(report),
    ...(report.pipelineEvidence?.n ? ["## Deterministic pipeline evidence", "",
      `The receipts contain ${report.pipelineEvidence.visiblePaths} distinct displayed rules-engine paths across ${report.pipelineEvidence.n} captures (${report.pipelineEvidence.pathsPerCapture?.toFixed(2)} per capture) and ${report.pipelineEvidence.checks} completed checks (${report.pipelineEvidence.checksPerCapture?.toFixed(2)} per capture). The median was ${report.pipelineEvidence.medianCheckMs ?? "unavailable"} ms per check and ${report.pipelineEvidence.medianCheckedCaptureMs ?? "unavailable"} ms summed per checked capture. ${report.pipelineEvidence.distinctTriggeredRules} distinct rule IDs triggered. Individual rule invocations are untracked. Paths are deduplicated per capture across the as-dropped and final recommendation checks.`, ""] : []),
    ...comparisonTable(report),
    ...negativeCases(report),
    ...challenges(report),
    ...modalityTable(report),
    "## All metrics", "", ...metricsTable(overall, METRIC_KEYS, objects),
    "## Breakdown by difficulty", "",
    ...GROUPS.flatMap((group) => {
      const summary = report.breakdown[group];
      return [`### ${group === "links" ? "Product links" : group} (n=${summary.n})`, "",
        ...(summary.n ? [...metricsTable(summary, METRIC_KEYS, objects), ...coverageTable(summary, objects, Boolean(traces?.shorterCounters))] : ["No items in this group.", ""])];
    }),
    "## Where it still fails", "",
    ...(report.failures.length ? report.failures.flatMap((item) => [
      `### ${nested(item.id)} · ${nested(item.inputLabel)} · ${item.group}`, "",
      `- Expected — ${nested(expectedText(item))}`,
      ...SIDES.map((side) => `- ${SIDE[side]} — ${nested(answerText(item.answers[side]))}`),
      ...item.diagnoses.map((diagnosis) => `- ${SIDE[diagnosis.side]} ${diagnosis.category} — ${nested(diagnosis.detail)}`), "",
    ]) : ["No discrepancies were detected on the measured labels in this run.", ""]),
    "## Device type judgments", "",
    "| Item | Labeled type | Baseline P(match) | System P(match) |",
    "| --- | --- | ---: | ---: |",
    ...report.cases.filter(({ expected }) => expected.deviceType).map(({ id, expected, answers }) => {
      const scores = SIDES.map((side) => {
        const value = answers[side]?.typeProbability;
        return value === undefined || value === null ? "—" : probability(value);
      });
      return `| ${nested(id)} | ${nested(expected.deviceType!)} | ${scores.join(" | ")} |`;
    }),
    "", "## Scoring notes", "",
    ...(objects ? [
      "- Device accuracy uses the returned perception class, then a recognized gate class, then P(device) ≥ 0.5 when the gate supplies a binary answer. Passive maps to non-device. A usability stop and a device classification are separate. Missing classifications count as misses in accuracy. Class-specific error rates use answered labels.",
      "- Non-device cyber claims count any published structured radio, path, technique, cyber-risk, cloud or default-credential assertion on a labeled negative. A stopped capture supplies no claim. Stripped claims recorded by the Inspector are tracked separately. Free-text briefings and unpublished provider fields are outside this score.",
      "- Food-contact coverage uses the default Filler 3 drop on this twin. A physical rule, food-safety finding or explicitly local physical risk counts. All labeled negatives at this drop enter the denominator, including unusable captures. The original baseline declined assessments of non-devices, and its input described the plant without an explicit drop instruction.",
    ] : ["- Every attempted item contributes to gate accuracy, including cases with no gate answer. False accept and reject rates use only the corresponding answered labels. A gate rejection is a valid response and can be a classification error. Provider and stage errors are counted separately. Returned stages are scored even if a later stage fails."]),
    "- Labeled category, kind, area, Purdue level, flags, sizing and risk recall include missing predictions as misses. Placement coverage counts labeled devices with a recommendation. Never-place violation uses recommendations with at least one labeled forbidden area.",
    "- Rule consistency uses the saved offline verdict for each recommendation against the seed. An unresolved footprint or network reference counts as a rule-check failure. Blocking means severity 4 or 5.",
    "- Radio and port scores are micro-averaged over known lists. Ports use case, punctuation and common connector aliases. Size match uses normalized text and units without unit conversion. Risk tags are extracted from risk titles and descriptions with the same term patterns for both sides. A tag match does not verify the risk description.",
    `- ATT&CK validity checks distinct cited IDs per item against ICS ${report.attackIcsVersion}. It measures delivered citations. System IDs flagged and removed during grounding are recorded independently, including any that prompted revision.`,
    "- Wilson 95% intervals use the displayed denominators. For F1, the Wilson interval for Jaccard overlap is transformed to F1, so n is the total matched or unmatched labels. Label-level intervals are descriptive when several labels come from one capture.",
    "- Differences are system minus baseline on eligible paired items. The 95% percentile bootstrap recomputes each statistic on 2,000 resamples of matched items. Small groups yield unstable or degenerate intervals. Latency includes gate rejections and failed executions with a measured time, excludes the offline judge and rule scoring, and uses linear interpolation.",
    "- Both sides receive the same text or image bytes and the same product URL. Each side uses the project link fetcher for its own retrieval, so live pages can vary. Pipeline latency includes briefing when reached.",
    "- Gemini HTTP attempts include retries and interaction retrievals. The paired capture cost excludes the offline type judge, product-page requests and unfinished pairs. A failed or rejected capture can use fewer calls than a completed placement.",
    "- See `eval/dataset/SOURCES.md` for collection and provenance and `FAILURES.md` for case diagnoses.", "",
  ].join("\n");
}
