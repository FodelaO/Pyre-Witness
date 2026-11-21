/** Builds the report consumed by Markdown and the proof page. */
import { ATTACK_ICS_VERSION } from "@/data/attack-ics";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { caseResult, type CaseResult } from "./failures";
import { summarize, type Summary } from "./metrics";
import { GROUPS, type EvaluatedItem, type Group, type Side } from "./types";

export const REPORT_VERSION = 1;

export interface EvaluationReport {
  schemaVersion: typeof REPORT_VERSION;
  runId: string;
  date: string;
  startedAt: string;
  sides: readonly Side[];
  dataset: { available: number; selected: number; limit?: number; warnings: string[] };
  reused: number;
  models: { baseline: string; perception: string; reasoning: string; chief: string; gate: string; judge: string };
  thinking: typeof THINKING;
  attackIcsVersion: string;
  overall: Summary;
  breakdown: Record<Group, Summary>;
  cases: CaseResult[];
  failures: CaseResult[];
}

type ReportOptions = Pick<EvaluationReport, "runId" | "startedAt" | "sides" | "dataset" | "reused">;

export function buildReport(rows: EvaluatedItem[], options: ReportOptions): EvaluationReport {
  const cases = rows.map(caseResult);
  const failures = cases.filter(({ diagnoses }) => diagnoses.length > 0);
  return {
    ...options,
    schemaVersion: REPORT_VERSION,
    date: new Date().toISOString(),
    models: {
      baseline: MODEL_IDS.perception, perception: MODEL_IDS.perception, reasoning: MODEL_IDS.reasoning,
      chief: MODEL_IDS.chief, gate: MODEL_IDS.decisions, judge: MODEL_IDS.decisions,
    },
    thinking: THINKING,
    attackIcsVersion: ATTACK_ICS_VERSION,
    overall: summarize(rows),
    breakdown: Object.fromEntries(GROUPS.map((group) => [group, summarize(rows.filter(({ item }) => item.group === group))])) as Record<Group, Summary>,
    cases,
    failures,
  };
}
