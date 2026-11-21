/** Serializes complete session runs and downloads them through the browser. */
import type { TranscriptRun } from "./transcriptStore";
import { CREW_LABEL, ORIGIN_LABEL, SOURCE_LABEL, timeline } from "./transcriptSteps";

export type ExportFormat = "json" | "md";

function metadata(run: TranscriptRun) {
  const steps = timeline(run);
  const engines = [...new Set(steps.flatMap((step) => step.engine ? [step.engine] : []))];
  const thinkingLevels = steps.flatMap((step) => step.thinkingLevel && step.engine
    ? [{ engine: step.engine, level: step.thinkingLevel, stepId: step.id }]
    : []);
  const timings = steps.flatMap((step) => step.latencyMs !== undefined
    ? [{ stepId: step.id, label: step.title, latencyMs: step.latencyMs }]
    : []);
  return { engines, thinkingLevels, timings };
}

function codeBlock(payload: unknown): string {
  const json = JSON.stringify(payload, null, 2);
  const longestFence = Math.max(2, ...(json.match(/`+/g) ?? []).map((match) => match.length));
  const fence = "`".repeat(longestFence + 1);
  return `${fence}json\n${json}\n${fence}`;
}

export function serializeTranscript(runs: readonly TranscriptRun[], format: ExportFormat, exportedAt = new Date().toISOString()): string {
  if (format === "json") {
    return JSON.stringify({ version: 1, exportedAt, runs: runs.map((run) => ({ ...run, metadata: metadata(run) })) }, null, 2);
  }

  const sections = runs.map((run) => {
    const { id, source, label, status, startedAt, endedAt, totalMs } = run;
    const header = { id, source, label, status, startedAt, endedAt, totalMs, ...metadata(run) };
    const steps = timeline(run).map((step) => {
      const time = step.at === undefined ? undefined : new Date(step.at).toISOString();
      const context = [CREW_LABEL[step.crew], ORIGIN_LABEL[step.origin], step.engine, time].filter(Boolean).join(" · ");
      return `### ${step.title}\n\n${context}\n\n${codeBlock(step.event ?? step.providerRecord ?? step)}`;
    });
    return [`## ${SOURCE_LABEL[source]} · ${label.replace(/[\r\n]/g, " ")}`, codeBlock(header), ...steps].join("\n\n");
  });
  return ["# Pyre Witness session transcript", `Exported ${exportedAt}`, ...sections].join("\n\n") + "\n";
}

export function downloadTranscript(runs: readonly TranscriptRun[], format: ExportFormat): void {
  const type = format === "json" ? "application/json" : "text/markdown";
  const url = URL.createObjectURL(new Blob([serializeTranscript(runs, format)], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `pyre-witness-transcript.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
