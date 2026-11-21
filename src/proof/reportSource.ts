/** Loads a saved local proof report at request time. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { REPORT_VERSION, type EvaluationReport } from "../../eval/report";

type ReportState = { state: "ready"; report: EvaluationReport } | { state: "missing" | "invalid" };

type SavedRun = `run-${1 | 2 | 3 | 4 | 5}`;

export async function readProofReport(run?: SavedRun): Promise<ReportState> {
  try {
    const report = JSON.parse(await readFile(path.join(process.cwd(), "eval", "report", run ?? "", "latest.json"), "utf8"));
    if (report?.schemaVersion !== REPORT_VERSION || !Number.isFinite(Date.parse(report.date))
      || !report.overall?.sides || !report.overall?.paired || !report.breakdown
      || !report.models || !report.dataset?.selected || !Array.isArray(report.failures) || !Array.isArray(report.sides)) {
      return { state: "invalid" };
    }
    return { state: "ready", report: report as EvaluationReport };
  } catch (error) {
    return { state: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "invalid" };
  }
}
