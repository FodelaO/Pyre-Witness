/** Reads the saved run history and the paired placement receipts used in the proof cards. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EvaluationReport } from "../../eval/report";
import type { RunArtifact } from "../../eval/types";
import type { PipelineEvent } from "@/pipeline/types";
import { readProofReport } from "./reportSource";

const baselineRun = "2026-11-21T18-30-07-972Z-wVengg"; // Saved run-3-baseline used in Run 5.
const examples = [
  {
    id: "photo-022", title: "Electrical control cabinet", rule: "HAZ-01", phase: "recommendation",
    baseline: "General power and motor control in Utilities.",
    system: "A locked cabinet in dry Packaging, outside the ammonia area.",
    finding: "Utilities placement overlapped the ammonia area. The gas-area rating was undocumented.",
  },
  {
    id: "photo-012", title: "Honeywell barcode scanner", rule: "USB-01", phase: "recommendation",
    baseline: "Connect the scanner to a Packaging HMI.",
    system: "Use an inventory workstation in the dry Corporate Office.",
    finding: "The proposed Packaging spot put an exposed USB-A port in OT near visitor access.",
  },
  {
    id: "photo-032", title: "Siemens S7-300 PLC panel", rule: "WASH-01", phase: "as-dropped",
    baseline: "Install in the Filler 3 control cell.",
    system: "Use a rated enclosure in dry Packaging.",
    finding: "At the original drop, washdown rating and hygienic materials were undocumented.",
  },
] as const;

async function readReceipt(run: string, id: string, side: "baseline" | "system") {
  const filename = path.join(process.cwd(), "eval", "runs", run, `${id}.${side}.json`);
  return (JSON.parse(await readFile(filename, "utf8")) as { artifact: RunArtifact }).artifact;
}

export async function readExamples(report: EvaluationReport) {
  return Promise.all(examples.map(async (example) => {
    const item = report.cases.find(({ id }) => id === example.id);
    if (!item?.file) return null;
    try {
      const [baseline, system] = await Promise.all([
        readReceipt(baselineRun, example.id, "baseline"),
        readReceipt(report.runId, example.id, "system"),
      ]);
      const baselinePlacement = baseline.prediction?.recommendation;
      const systemPlacement = system.prediction?.recommendation;
      if (!baselinePlacement || !systemPlacement || !Array.isArray(system.raw)) return null;
      const events = system.raw as PipelineEvent[];
      const check = events.find((event) => event.type === "selfcheck.done" && event.phase === example.phase);
      const match = check?.type === "selfcheck.done"
        ? check.result.findings.find(({ ruleId }) => ruleId === example.rule)
        : undefined;
      if (!match) return null;
      const revised = check?.type === "selfcheck.done" && !check.result.passed
        && events.some((event) => event.type === "selfcheck.done" && event.phase === "post-revision" && event.result.passed);
      return {
        ...example, item, baselinePlacement, systemPlacement, revised,
        forbidden: item.expected.neverAreas.includes(baselinePlacement.physical_placement.area),
        ruleDetail: match.detail,
      };
    } catch {
      return null;
    }
  }));
}

export async function readRunHistory(current: EvaluationReport) {
  const history = await Promise.all((["run-1", "run-2", "run-3", "run-4"] as const).map(readProofReport));
  return [...history.map((entry) => entry.state === "ready" ? entry.report : null), current].map((report, index) => ({
    run: index + 1,
    metric: report?.overall.sides.system.metrics.riskRecall,
    recorded: report?.dataset.evaluated,
  }));
}
