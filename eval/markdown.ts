/** Renders all measured denominators, intervals and failure evidence as Markdown. */
import type { Answer, CaseResult } from "./failures";
import { HEADLINES, METRICS, METRIC_KEYS, type Metric, type Summary } from "./metrics";
import type { EvaluationReport } from "./report";
import type { PairedDifference, Proportion } from "./statistics";
import { GROUPS, SIDES } from "./types";

const SIDE = { baseline: "Baseline", system: "System" } as const;
const pct = (value: number) => `${(100 * value).toFixed(1)}%`;
const pp = (value: number) => `${value > 0 ? "+" : ""}${(100 * value).toFixed(1)} pp`;
const ms = (value: number) => `${value.toFixed(0)} ms`;
const signedMs = (value: number) => `${value > 0 ? "+" : ""}${ms(value)}`;
const probability = (value: number) => value.toFixed(3);
const signedProbability = (value: number) => `${value > 0 ? "+" : ""}${probability(value)}`;
const nested = (value: string) => value.replace(/\s+/g, " ").replace(/[\\|`*_\[\]<>]/g, "\\$&");
const textList = (values: readonly (string | number)[]) => values.length ? values.join(", ") : "none";
const showFlag = (value: boolean | null | undefined) => value === true ? "yes" : value === false ? "no" : "unknown";

function ratio(metric: Proportion): string {
  return metric.value === null || !metric.interval ? `— (n=${metric.n})`
    : `${pct(metric.value)} [${metric.interval.map(pct).join("–")}] (n=${metric.n})`;
}

function delta(value: PairedDifference, format: (value: number) => string): string {
  return value.value === null || !value.interval ? `— (pairs=${value.n})`
    : `${format(value.value)} [${value.interval.map(format).join(", ")}] (pairs=${value.n})`;
}

function metricsTable(summary: Summary, keys: readonly Metric[]): string[] {
  const { sides, paired } = summary;
  return [
    "| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |",
    "| --- | ---: | ---: | ---: |",
    ...keys.map((key) => `| ${METRICS[key]} | ${ratio(sides.baseline.metrics[key])} | ${ratio(sides.system.metrics[key])} | ${delta(paired.metrics[key], pp)} |`),
    "",
  ];
}

function coverageTable(summary: Summary): string[] {
  const rows = SIDES.map((side) => ({ side, ...summary.sides[side] }));
  return [
    "| System | Attempted | Device / non-device | False accept / reject | No gate answer | Run errors / timeouts | Type judge errors | Filtered IDs |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(({ side, n, gate, failures, timeouts, judgeFailures, filteredUnknownTechniques }) =>
      `| ${SIDE[side]} | ${n} | ${gate.positives} / ${gate.negatives} | ${gate.falseAccepts} / ${gate.falseRejects} | ${gate.noDecision} | ${failures} / ${timeouts} | ${judgeFailures} | ${filteredUnknownTechniques} |`),
    "",
    "| Measure | Baseline | System | Paired difference [95% CI] |",
    "| --- | ---: | ---: | ---: |",
    ...(["p50", "p95"] as const).map((percentile) => {
      const values = rows.map(({ latencyMs }) => `${latencyMs[percentile] === null ? "—" : ms(latencyMs[percentile])} (n=${latencyMs.n})`);
      return `| End-to-end latency ${percentile} | ${values.join(" | ")} | ${delta(summary.paired.latencyMs[percentile], signedMs)} |`;
    }),
    `| Mean device-type P(match) | ${rows.map(({ typeProbability: { value, n } }) => `${value === null ? "—" : probability(value)} (n=${n})`).join(" | ")} | ${delta(summary.paired.typeProbability, signedProbability)} |`,
    "",
  ];
}

export function expectedText({ expected }: CaseResult): string {
  if (!expected.isDevice) return "Reject non-device or unreadable capture.";
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

function answerText(answer: Answer | undefined): string {
  if (!answer) return "Not run.";
  return [
    answer.accepted === true ? "Accepted" : answer.accepted === false ? "Rejected" : "No gate answer",
    [answer.deviceType, answer.category, answer.physicalKind].filter(Boolean).join(" · "),
    answer.area ? `${answer.area} / Purdue ${answer.level ?? "unknown"}` : null,
    answer.neverAreas.length ? `never ${textList(answer.neverAreas)}` : null,
    answer.radios ? `radios ${textList(answer.radios)}` : null,
    answer.ports ? `ports ${textList(answer.ports)}` : null,
    answer.deviceType ? `visible defaults ${showFlag(answer.defaultCredentials)} · cloud ${showFlag(answer.cloud)}` : null,
    answer.capacity ? `size ${answer.capacity}` : null,
    answer.riskTags.length ? `risks ${textList(answer.riskTags)}` : null,
    answer.techniques.length ? `ATT&CK ${textList(answer.techniques)}` : null,
    answer.filteredUnknownTechniques.length ? `filtered IDs ${textList(answer.filteredUnknownTechniques)}` : null,
    answer.rulesPassed === false ? `blocked (${textList(answer.ruleFindings)})` : answer.rulesPassed ? "rule check passed" : null,
    answer.typeProbability === null ? null : `P(type match) ${probability(answer.typeProbability)}`,
    answer.error ? `${answer.error.stage} · ${answer.error.message}` : null,
  ].filter(Boolean).join(" / ");
}

function treatment(report: EvaluationReport) {
  const { models, thinking } = report;
  return [
    `Baseline uses one ${models.baseline} interaction at ${thinking.perception} thinking and a prose plant description.`,
    `The system uses ${models.gate} for its gate, ${models.perception} for perception, ${models.reasoning} for reasoning and any revision, the rules engine, and ${models.chief} for briefing.`,
    `The type judge uses a separate ${models.judge} request with anonymized answers. A match requires P(yes) ≥ 0.5. Mean P(match) uses only returned judgments. Type-match accuracy counts missing predictions as incorrect and excludes missing judgments for returned predictions.`,
  ].join(" ");
}

export function markdownReport(report: EvaluationReport): string {
  const { dataset, overall } = report;
  const selection = dataset.selected === dataset.available ? "All available items were selected."
    : "The limit selects IDs in a fixed round robin across negatives, clean, messy, edge, and product links.";
  return [
    "# Pyre Witness evaluation", "",
    `${report.date} · Run \`${report.runId}\` · ${dataset.selected} of ${dataset.available} items · ${report.sides.map((side) => SIDE[side]).join(" and ")} · ${report.reused} cached artifacts`,
    "", selection, "", treatment(report), "",
    ...dataset.warnings.flatMap((warning) => [`> ${warning}`, ""]),
    "## Headline results", "", ...metricsTable(overall, HEADLINES), ...coverageTable(overall),
    "## All metrics", "", ...metricsTable(overall, METRIC_KEYS),
    "## Breakdown by difficulty", "",
    ...GROUPS.flatMap((group) => {
      const summary = report.breakdown[group];
      return [`### ${group === "links" ? "Product links" : group} (n=${summary.n})`, "",
        ...(summary.n ? [...metricsTable(summary, METRIC_KEYS), ...coverageTable(summary)] : ["No items in this group.", ""])];
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
    "- Every attempted item contributes to gate accuracy, including cases with no gate answer. False accept and reject rates use only the corresponding answered labels. A gate rejection is a valid response and can be a classification error. Provider and stage errors are counted separately. Returned stages are scored even if a later stage fails.",
    "- Labeled category, kind, area, Purdue level, flags, sizing and risk recall include missing predictions as misses. Placement coverage counts labeled devices with a recommendation. Never-place violation uses recommendations with at least one labeled forbidden area.",
    "- Rule consistency runs both recommendations through the same asset and placement helpers and `evaluatePlacement` against the same seed. An unresolved footprint or network reference counts as a rule-check failure. Blocking means severity 4 or 5.",
    "- Radio and port scores are micro-averaged over known lists. Ports use case, punctuation and common connector aliases. Size match uses normalized text and units without unit conversion. Risk tags are extracted from risk titles and descriptions with the same term patterns for both sides. A tag match does not verify the risk description.",
    `- ATT&CK validity checks distinct cited IDs per item against ICS ${report.attackIcsVersion}. It measures delivered citations. System IDs flagged and removed during grounding are recorded independently, including any that prompted revision.`,
    "- Wilson 95% intervals use the displayed denominators. For F1, the Wilson interval for Jaccard overlap is transformed to F1, so n is the total matched or unmatched labels. Label-level intervals are descriptive when several labels come from one capture.",
    "- Differences are system minus baseline on eligible paired items. The 95% percentile bootstrap recomputes each statistic on 2,000 resamples of matched items. Small groups yield unstable or degenerate intervals. Latency includes gate rejections and failed executions with a measured time, excludes the offline judge and rule scoring, and uses linear interpolation.",
    "- Both sides receive the same text or image bytes and the same product URL. Each side uses the project link fetcher for its own retrieval, so live pages can vary. The pipeline latency includes its briefing stage.",
    "- See `eval/dataset/SOURCES.md` for collection and provenance.", "",
  ].join("\n");
}
