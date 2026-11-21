/** Builds the report consumed by Markdown and the proof page. */
import { ATTACK_ICS_VERSION } from "@/data/attack-ics";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { challengeResults, leadingFailures, sampleInputs } from "./benchmarkCases";
import { caseResult, type CaseResult } from "./failures";
import type { RunComparison } from "./comparison";
import type { FairComparison } from "./fairComparison";
import { summarize, summarizeCalls, type Summary } from "./metrics";
import type { ModalitySummary } from "./modality";
import type { PipelineEvidence } from "./pipelineEvidence";
import type { ScoringAudit } from "./scoringAudit";
import type { VersionDelta } from "./versionDelta";
import type { ProviderCalls } from "./types";
import { GROUPS, type EvaluatedItem, type EvaluationItem, type Group, type Side } from "./types";

export const REPORT_VERSION = 2;

interface DatasetProgress {
  available: number;
  selected: number;
  evaluated: number;
  attempted: Record<Side, number>;
  limit?: number;
  warnings: string[];
}

export interface EvaluationReport {
  schemaVersion: typeof REPORT_VERSION;
  runId: string;
  label?: string;
  fingerprint?: string;
  pipelineFingerprint?: string;
  concurrency?: number;
  baselineContract?: string;
  baselineFrom?: string;
  objectAssessment?: boolean;
  date: string;
  startedAt: string;
  wallClockMs: number;
  sides: readonly Side[];
  dataset: DatasetProgress;
  reused: number;
  models: { baseline: string; perception: string; reasoning: string; chief: string; gate: string; judge: string };
  thinking: Record<string, string>;
  attackIcsVersion: string;
  overall: Summary;
  breakdown: Record<Group, Summary>;
  cases: CaseResult[];
  failures: CaseResult[];
  judgeCalls: ReturnType<typeof summarizeCalls>;
  comparison: RunComparison;
  modality?: ModalitySummary;
  modalityFrom?: string;
  inputs?: ReturnType<typeof sampleInputs>;
  challenges?: ReturnType<typeof challengeResults>;
  leadingFailures?: ReturnType<typeof leadingFailures>;
  timeline?: RunMilestone[];
  fairComparison?: FairComparison;
  pipelineEvidence?: PipelineEvidence;
  scoringAudit?: ScoringAudit;
  versionDelta?: VersionDelta;
}

type HistorySource = Pick<EvaluationReport, "label" | "concurrency" | "dataset" | "overall" | "cases">;

export function summarizeRun({ label, concurrency, dataset, overall, cases }: HistorySource) {
  const { latencyMs, completedLatencyMs, timeouts, failures, metrics, negatives } = overall.sides.system;
  return {
    label, concurrency, paired: dataset.evaluated, selected: dataset.selected, latencyMs, completedLatencyMs, timeouts, failures,
    gateFailures: cases.filter(({ answers }) => answers.system?.error?.stage === "gate").length,
    gateFallbacks: cases.filter(({ answers }) => answers.system?.gateFallback).length,
    placements: metrics.placementCoverage.numerator, area: metrics.physicalAreaAccuracy, negatives,
  };
}

export type RunMilestone = ReturnType<typeof summarizeRun>;

type ReportOptions = Pick<EvaluationReport, "runId" | "startedAt" | "sides" | "reused">
  & Partial<Pick<EvaluationReport, "label" | "fingerprint" | "pipelineFingerprint" | "concurrency" | "baselineContract" | "baselineFrom" | "objectAssessment" | "models" | "thinking" | "date" | "comparison" | "modality" | "modalityFrom" | "fairComparison" | "pipelineEvidence" | "scoringAudit" | "versionDelta">>
  & { dataset: Omit<DatasetProgress, "evaluated" | "attempted"> & { attempted?: DatasetProgress["attempted"] };
    judgeCalls?: (ProviderCalls | undefined)[]; items?: readonly EvaluationItem[]; history?: RunMilestone[] };

export function buildReport(rows: EvaluatedItem[], options: ReportOptions): EvaluationReport {
  const cases = rows.map(caseResult);
  const failures = cases.filter(({ diagnoses }) => diagnoses.length > 0);
  const overall = summarize(rows);
  const { dataset, judgeCalls, comparison, items, history, ...run } = options;
  const date = run.date ?? new Date().toISOString();
  const report: EvaluationReport = {
    ...run,
    schemaVersion: REPORT_VERSION,
    date,
    wallClockMs: Math.max(0, Date.parse(date) - Date.parse(run.startedAt)),
    dataset: { ...dataset, evaluated: rows.length,
      attempted: dataset.attempted ?? { baseline: overall.sides.baseline.n, system: overall.sides.system.n } },
    models: run.models ?? {
      baseline: MODEL_IDS.perception, perception: MODEL_IDS.perception, reasoning: MODEL_IDS.reasoning,
      chief: MODEL_IDS.chief, gate: MODEL_IDS.decisions, judge: MODEL_IDS.decisions,
    },
    thinking: run.thinking ?? THINKING,
    attackIcsVersion: ATTACK_ICS_VERSION,
    overall,
    breakdown: Object.fromEntries(GROUPS.map((group) => [group, summarize(rows.filter(({ item }) => item.group === group))])) as Record<Group, Summary>,
    cases,
    failures,
    judgeCalls: summarizeCalls(judgeCalls ?? rows.flatMap(({ judge }) => judge ? [judge.providerCalls] : [])),
    comparison: comparison ?? { state: "pending" },
    inputs: sampleInputs(items ?? rows.map(({ item }) => item)),
    challenges: challengeResults(cases),
    leadingFailures: leadingFailures(cases),
  };
  report.timeline = [...(history ?? []).filter(({ label }) => label !== report.label), summarizeRun(report)];
  return report;
}
