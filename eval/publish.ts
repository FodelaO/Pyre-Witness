/** Atomically publishes report snapshots from the raw attempt ledger. */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { json, readJson, REPORT_ROOT, writeAtomic } from "./cache";
import { compareRuns } from "./comparison";
import { loadDataset } from "./dataset";
import { compareBaseline, joinBaseline } from "./fairComparison";
import { markdownFailures } from "./failureAnalysis";
import { markdownReport, markdownSummary } from "./markdown";
import { modalityInput, summarizeModality } from "./modality";
import { summarizePipelineEvidence } from "./pipelineEvidence";
import { buildReport, summarizeRun, type EvaluationReport } from "./report";
import { readRunSnapshot } from "./runSnapshot";
import { auditScoring } from "./scoringAudit";
import { rescoreSystem, SYSTEM_SCORING_METHODS } from "./systemScoring";
import { SIDES } from "./types";

export async function refreshEvaluation(reference: string, lastReceipts?: number, baselineReference?: string) {
  const { items, warnings, errors } = await loadDataset();
  if (errors.length) throw new Error(`The dataset could not be loaded:\n${errors.join("\n")}`);
  const [snapshot, freshBaseline] = await Promise.all([
    readRunSnapshot(reference, items), baselineReference ? readRunSnapshot(baselineReference, items) : null,
  ]);
  if (!snapshot) throw new Error(`Run ${reference} was not found.`);
  if (baselineReference && !freshBaseline) throw new Error(`Baseline run ${baselineReference} was not found.`);
  const { id, manifest, attempts, judgeCalls, reused, lastArtifactMs } = snapshot;
  const receipts = snapshot.receipts + (freshBaseline?.receipts ?? 0);
  if (lastReceipts === receipts) return { receipts, report: null };
  const run3 = manifest.label === "run-3" ? snapshot : freshBaseline ? await readRunSnapshot("run-3", items) : null;
  const recorded = freshBaseline ? joinBaseline(snapshot, freshBaseline) : snapshot.completed;
  const completed = manifest.label === "run-4" ? rescoreSystem(recorded) : recorded;
  const fairComparison = freshBaseline ? compareBaseline(freshBaseline, run3 ?? snapshot, completed) : undefined;
  const priorRows = manifest.label === "run-4" && run3 && freshBaseline ? joinBaseline(run3, freshBaseline) : null;
  const scoringAudit = priorRows && run3
    ? auditScoring(run3.manifest.fingerprint, priorRows, rescoreSystem(priorRows), completed, SYSTEM_SCORING_METHODS) : undefined;

  const [run1, run2] = await Promise.all(["run-1", "run-2"].map((label) =>
    label === manifest.label ? snapshot : readRunSnapshot(label, items)));
  const archives = await Promise.all(["run-1", "run-2", "run-3"].filter((label) => label !== manifest.label)
    .map((label) => readJson<EvaluationReport>(path.join(REPORT_ROOT, label, "latest.json"))));
  const history = archives.flatMap((entry) => entry ? [summarizeRun(entry)] : []);
  const modalityRun = manifest.modalityAblation ? snapshot : run3 ?? snapshot;
  const eligible = new Set(modalityRun.manifest.itemIds);
  const modality = summarizeModality(modalityRun.completed, items.filter((item) => eligible.has(item.id) && modalityInput(item)).length,
    Boolean(modalityRun.manifest.modalityAblation));
  const modelIds = manifest.models;
  const models: EvaluationReport["models"] | undefined = modelIds && {
    baseline: modelIds.baseline, gate: modelIds.system[0], perception: modelIds.system[1],
    reasoning: modelIds.system[2], chief: modelIds.system[3], judge: modelIds.judge,
  };
  const report = buildReport(completed, {
    runId: id, label: manifest.label, startedAt: manifest.startedAt,
    date: new Date(lastArtifactMs).toISOString(),
    fingerprint: manifest.fingerprint, concurrency: manifest.concurrency, models, thinking: manifest.thinking,
    baselineContract: manifest.baselineContract ?? "original-output-v1",
    baselineFrom: fairComparison ? undefined : manifest.baselineFrom, objectAssessment: manifest.objectAssessment,
    sides: fairComparison ? SIDES : manifest.sides, dataset: { available: items.length, selected: manifest.itemIds.length, warnings,
      attempted: { ...attempts, baseline: freshBaseline?.attempts.baseline ?? attempts.baseline } },
    reused, judgeCalls: [...judgeCalls, ...(freshBaseline?.judgeCalls ?? [])], items, history, modality,
    modalityFrom: modalityRun.id === id || !modality.enabled ? undefined : modalityRun.manifest.label ?? modalityRun.id,
    comparison: compareRuns(run1, run2), fairComparison, scoringAudit, pipelineEvidence: summarizePipelineEvidence(snapshot.completed),
  });
  if (freshBaseline && completed.length < snapshot.completed.length) {
    const archivedRun = await readJson<EvaluationReport>(path.join(REPORT_ROOT, manifest.label ?? id, "latest.json"));
    if (archivedRun && report.timeline) report.timeline = [...history, summarizeRun(archivedRun)];
  }
  const files = {
    "REPORT.md": markdownReport(report),
    "FAILURES.md": markdownFailures(report, completed),
    ...(fairComparison ? { "SUMMARY.md": markdownSummary(report) } : {}),
    "latest.json": json(report),
  };
  const archiveLabel = manifest.label === "run-3" && fairComparison ? fairComparison.label : manifest.label ?? id;
  const archive = path.join(REPORT_ROOT, archiveLabel);
  await mkdir(archive, { recursive: true });
  // Replace the report consumed by the app last, after its corresponding Markdown is available.
  for (const [file, content] of Object.entries(files)) {
    await writeAtomic(path.join(archive, file), content);
    await writeAtomic(path.join(REPORT_ROOT, file), content);
  }
  return { receipts, report };
}

export async function publishEvaluation(reference: string) {
  const { report } = await refreshEvaluation(reference);
  if (!report) throw new Error("The report could not be published.");
  return report;
}
