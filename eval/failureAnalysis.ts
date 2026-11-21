/** Groups observed system failures and pairs representative cases with changes the owner can test. */
import { DIAGNOSIS_CATEGORIES, type CaseResult, type DiagnosisCategory } from "./failures";
import { answerText, expectedText, nested } from "./markdown";
import { metricCounts } from "./metrics";
import type { EvaluationReport } from "./report";
import type { EvaluatedItem } from "./types";

const recommendations: Record<DiagnosisCategory, string> = {
  "perception miss": "Give perception an evidence-backed category and physical-kind decision for each device. Separate supported radio capability from active radio use in the evidence, and use physical connector names when visible or documented.",
  "wrong zone": "Shortlist rooms and Purdue levels by device function before ranking risk. Check the final room and level together against plant constraints and use an explicit hold when there is no compatible placement.",
  "rule conflict": "Pre-filter candidate placements using the same footprint resolution and blocking rules as the Inspector. When a final check blocks the placement, try another feasible candidate or surface a hold with the blocking rule.",
  "hallucinated technique": "Constrain citations to catalog IDs or null. Derive the display name from the catalog and keep a counter for IDs rejected before delivery.",
  "gate error": "Test a hold or request for another photo when readability is low and Decisions confidently selects the other route. Measure false rejects on real devices and usable spec sheets before changing the gate threshold.",
  "object classification": "Compare Scout's returned class against the gate's observed-object evidence. Add the photographed counterexamples to a held-out classification set and test the boundary between passive objects and equipment.",
  "invented cyber claim": "Check all public structured events for passive objects, including Scout and as-dropped rules. Strip unsupported device claims before emission and retain a separate suppression counter.",
  "physical-safety omission": "For an identifiable passive object, surface the as-dropped food-contact finding before providing a recommended room. For genuinely unusable input, retain the request for a clearer capture and keep that case visible in coverage.",
  "timeout": "Measure Carbon's initial and revision stages separately. Reduce repeated context and set a revision budget that leaves time to deliver the existing placement with any unresolved Inspector blocker.",
  "risk omission": "Require one evidence-backed tag per applicable risk and validate tags with the same vocabulary used by the labeled set. Review matched excerpts for cases where the lexical scorer missed equivalent wording.",
  "product link retrieval": "Log whether DNS, connection, download deadline or text extraction prevented assessment. Validate the capture budget against the named vendor pages and keep the pasted-specification fallback.",
  "execution error": "Record structured-response error paths and provider status by stage. Keep the completed device profile and placement available when only the final briefing fails.",
};

function examples(cases: CaseResult[], category: DiagnosisCategory) {
  const remaining = [...cases];
  const selected: CaseResult[] = [];
  const groups = new Set<string>();
  while (remaining.length && selected.length < 3) {
    const uniqueGroup = remaining.findIndex(({ group }) => !groups.has(group));
    const [item] = remaining.splice(Math.max(0, uniqueGroup), 1);
    groups.add(item.group);
    selected.push(item);
  }
  return selected.flatMap((item) => [
    `- **${nested(item.id)}** (${item.group}). ${nested(item.diagnoses.filter((diagnosis) => diagnosis.side === "system" && diagnosis.category === category).map(({ detail }) => detail).join(" "))}`,
    `  - Expected — ${nested(expectedText(item))}${!item.expected.isDevice && item.labelNote ? ` ${nested(item.labelNote)}` : ""}`,
    `  - Baseline — ${nested(answerText(item.answers.baseline))}`,
    `  - Pyre Witness — ${nested(answerText(item.answers.system))}`,
  ]);
}

const comparisonChecks = {
  gateAccuracy: "Device vs non-device",
  physicalKindAccuracy: "Equipment kind",
  physicalAreaAccuracy: "Physical area",
  purdueAccuracy: "Purdue level",
  ruleConsistency: "Rule consistency",
  riskRecall: "Expected risk tags",
} as const;

function baselineWins(rows: readonly EvaluatedItem[]) {
  return (Object.entries(comparisonChecks) as [keyof typeof comparisonChecks, string][]).map(([key, label]) => {
    const eligible = rows.flatMap((row) => {
      const baseline = metricCounts(row, "baseline")?.[key];
      const system = metricCounts(row, "system")?.[key];
      return baseline?.n && system?.n ? [{ id: row.item.id, baseline: baseline.numerator, system: system.numerator }] : [];
    });
    return { label, n: eligible.length, wins: eligible.filter(({ baseline, system }) => baseline > system),
      losses: eligible.filter(({ baseline, system }) => baseline < system).length };
  });
}

function errorStages(report: EvaluationReport) {
  const stages = new Map<string, { baseline: number; system: number }>();
  for (const item of report.cases) {
    for (const side of report.sides) {
      const error = item.answers[side]?.error;
      if (!error) continue;
      const key = `${error.stage}${error.timeout ? " timeout" : ""}`;
      const counts = stages.get(key) ?? { baseline: 0, system: 0 };
      counts[side] += 1;
      stages.set(key, counts);
    }
  }
  return [...stages].sort(([, left], [, right]) => right.system - left.system || right.baseline - left.baseline);
}

function gateReplay(report: EvaluationReport) {
  const candidates = report.cases.filter(({ answers }) => {
    const system = answers.system;
    const readable = system?.gateEvidence?.is_readable?.value;
    const route = system?.gateEvidence?.route;
    return system?.accepted === true && typeof readable === "number" && readable < 0.5
      && route?.value === "other" && route.confidence >= 0.8;
  });
  const negatives = candidates.filter(({ expected }) => !expected.isDevice).length;
  return `In a replay of these gate answers, holding low-readability accepts (P(readable) < 0.50) on an other route with confidence ≥ 0.80 would flag ${negatives} labeled negatives and ${candidates.length - negatives} labeled devices. Test this candidate rule on fresh inputs before adopting it.`;
}

export function markdownFailures(report: EvaluationReport, rows: readonly EvaluatedItem[]) {
  const categories = DIAGNOSIS_CATEGORIES.map((category) => ({
    category,
    system: report.failures.filter(({ diagnoses }) => diagnoses.some((entry) => entry.category === category && entry.side === "system")),
    baseline: report.failures.filter(({ diagnoses }) => diagnoses.some((entry) => entry.category === category && entry.side === "baseline")),
  }));
  const paired = report.sides.length === 2;
  const stages = errorStages(report);
  const historical = report.fairComparison?.historical;
  return [
    "# Pyre Witness failure analysis", "",
    `${report.label ?? report.runId} · ${report.date} · ${report.dataset.evaluated} of ${report.dataset.selected} ${paired ? "paired captures" : "captures"} recorded.`, "",
    "Counts are distinct captures within each category. A capture can contribute to several categories.", "",
    ...(historical ? [
      "## Baseline from the overloaded run", "",
      `The historical baseline had ${historical.failures} errors across ${historical.n} captures. The receipt audit attributes nearly all of them to the evaluator’s local output validation.`, "",
      "| Error class | Count | Receipt evidence |", "| --- | ---: | --- |",
      `| Local output-length validation | ${historical.lengthOnly} | Each was a completed Gemini interaction with parseable JSON${historical.lengthLatencyMs ? `, in ${historical.lengthLatencyMs.map((ms) => (ms / 1000).toFixed(1)).join("–")} s` : ""}. The most common overages were ${historical.overages.slice(0, 3).map(([field, n]) => `\`${field}\` (${n})`).join(", ")}. |`,
      `| Product-page retrieval | ${historical.links} | The serial gateway link failed before a Gemini request. |`,
      `| Unclassified provider or transport error | ${historical.unclassified} | \`photo-039\` recorded one request and a generic error with no HTTP status or response body. |`,
      `| Recorded timeouts, HTTP 429s, confirmed safety blocks | ${historical.timeouts}, ${historical.rateLimited}, 0 | The receipts contain no evidence of a safety block. |`, "",
      `All ${historical.lengthOnly} length-only failures pass validation when the evaluator removes the length caps absent from the sent schema. The fresh baseline retains the original request and scores the returned values in full. The historical receipts remain in the Run 1 ledger and the original Run 3 archive.`, "",
      "## Fresh baseline and Run 3 failure categories", "",
    ] : []),
    "| Diagnosis | Pyre Witness | Baseline |",
    "| --- | ---: | ---: |",
    ...[...categories].sort((left, right) => right.system.length - left.system.length)
      .map(({ category, system, baseline }) => `| ${category} | ${system.length} | ${baseline.length} |`),
    ...(stages.length ? [
      "", "## Failed stages", "",
      "| Stage at failure | Pyre Witness | Baseline |",
      "| --- | ---: | ---: |",
      ...stages.map(([stage, counts]) => `| ${nested(stage)} | ${counts.system} | ${counts.baseline} |`),
    ] : []),
    "", "## System cases and recommendations", "",
    ...categories.flatMap(({ category, system }) => [
      `### ${category} (${system.length})`, "",
      ...(system.length ? [
        ...examples(system, category), "", report.objectAssessment && category === "gate error"
          ? "Separate gate transport failures from usability decisions. Measure retries and protect the gate deadline under concurrent photo uploads. Re-test the failed captures at the same concurrency and retain the original attempts."
          : recommendations[category], "",
        ...(report.label === "run-1" && category === "timeout" ? [
          "The frozen Carbon prompt permitted six risks, three paths, five hops and four mitigation proposals. The validator allowed three risks, two paths, four hops and three proposals. Align these limits, record validation retries and measure how much of the stage budget they consume.", "",
        ] : []),
        ...(!report.objectAssessment && category === "gate error" && system.some(({ answers }) => answers.system?.gateEvidence) ? [gateReplay(report), ""] : []),
      ]
        : ["Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.", ""]),
    ]),
    "## Where the baseline does better", "",
    "| Check | Eligible pairs | Baseline scored higher | Pyre Witness scored higher | Baseline examples |",
    "| --- | ---: | ---: | ---: | --- |",
    ...baselineWins(rows).map(({ label, n, wins, losses }) => `| ${label} | ${n} | ${wins.length} | ${losses} | ${wins.slice(0, 3).map(({ id }) => nested(id)).join(", ") || "—"} |`),
    "",
    "The counts compare each check separately. A single case can favor different sides on different checks. See the report for each side's full scored answer.", "",
    "## Follow-up evaluation", "",
    report.baselineFrom ? `The one-call baseline uses the original ${report.baselineFrom} receipts, including the validation errors. Compare the system on the shared captures to measure the pipeline change.`
      : "Keep the baseline definition and scored labels fixed when comparing pipeline changes.", "",
  ].join("\n");
}
