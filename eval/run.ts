/** Runs the real paired evaluation, resumes cached attempts and publishes the latest report. */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { geminiClients } from "@/gemini/transport";
import type { CaptureInput } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { runBaseline } from "./baseline";
import { digest, json, openRun, REPORT_ROOT, sourceFingerprint, writeAtomic } from "./cache";
import { DATASET_ROOT, loadDataset, selectItems } from "./dataset";
import { readDatasetImage } from "./image";
import { judgeTypes } from "./judge";
import { markdownReport } from "./markdown";
import { HEADLINES, METRICS } from "./metrics";
import { buildReport } from "./report";
import { runSystem } from "./system";
import { SIDES, type EvaluatedItem, type EvaluationItem, type RunArtifact, type Side } from "./types";

const WORKERS = 3;

async function capture(item: EvaluationItem): Promise<CaptureInput> {
  if (item.input.kind !== "photo") return item.input;
  const { bytes, mimeType } = await readDatasetImage(DATASET_ROOT, item.input.file);
  return { kind: "photo", images: [{ mimeType, dataBase64: bytes.toString("base64") }] };
}

function failed(stage: string, message: string): RunArtifact {
  return { status: "error", latencyMs: null, prediction: null, ruleCheck: null, error: { stage, message, timeout: false }, raw: null };
}

async function parallelItems<T>(items: T[], worker: (item: T, index: number) => Promise<EvaluatedItem>) {
  const results: EvaluatedItem[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, WORKERS) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

async function main() {
  const { values: options } = parseArgs({ options: {
    limit: { type: "string" }, only: { type: "string" }, resume: { type: "boolean" }, help: { type: "boolean" },
  } });
  if (options.help) {
    console.log("Usage: npm run eval -- [--limit N] [--only baseline|system] [--resume]");
    return;
  }
  const limit = options.limit === undefined ? undefined : Number(options.limit);
  if (options.limit !== undefined && (!/^\d+$/.test(options.limit) || !Number.isSafeInteger(limit) || limit! < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (options.only !== undefined && options.only !== "baseline" && options.only !== "system") {
    throw new Error("--only must be baseline or system.");
  }
  const sides: readonly Side[] = options.only ? [options.only] : SIDES;
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("GEMINI_API_KEY is missing. Set it in the project's .env or export it before running the evaluation.");

  const { items, errors, warnings } = await loadDataset();
  for (const warning of warnings) console.warn(`Dataset: ${warning}`);
  if (errors.length) throw new Error(`Fix the dataset before running evaluation:\n${errors.join("\n")}`);
  if (!items.length) throw new Error("No evaluation items found. Add labeled rows to eval/dataset/labels.csv or eval/dataset/links.csv.");

  const selected = selectItems(items, limit);
  const fingerprint = digest({ sources: await sourceFingerprint(), twin: SEED_TWIN });
  const run = await openRun(fingerprint, selected.map(({ id }) => id), sides, options.resume === true);
  const clients = geminiClients();
  let reused = 0;
  console.log(`Evaluating ${selected.length} items with ${sides.join(" and ")} (${run.id}).`);

  const rows = await parallelItems(selected, async (item, index) => {
    const evaluated: EvaluatedItem = { item, observations: {} };
    const order = index % 2 === 0 ? sides : [...sides].reverse();
    let input: CaptureInput | undefined;
    let inputError = "Capture could not be read.";
    try {
      input = await capture(item);
    } catch (error) {
      if (error instanceof Error) inputError = error.message;
    }
    const inputFingerprint = digest(input ?? item.input);

    for (const side of order) {
      const cached = input && await run.reuse(item.id, side, inputFingerprint);
      let artifact: RunArtifact;
      if (cached) {
        artifact = cached.artifact;
        reused += 1;
      } else if (!input) {
        artifact = failed("input", inputError);
      } else {
        try {
          const twin = structuredClone(SEED_TWIN);
          artifact = side === "baseline" ? await runBaseline(clients.interactions, input, twin) : await runSystem(input, twin);
        } catch {
          artifact = failed(side, "The evaluation adapter could not finish this attempt.");
        }
      }
      await run.save(item.id, side, { fingerprint: inputFingerprint, artifact, reusedFrom: cached ? cached.reusedFrom : undefined });
      evaluated.observations[side] = artifact;
      console.log(`${item.id} ${side} ${artifact.status}${cached ? " (cached)" : ""}${artifact.error ? ` · ${artifact.error.stage} · ${artifact.error.message}` : ""}`);
    }

    const expected = item.expected.deviceType;
    const predictions = order.flatMap((side): [Side, string][] => {
      const label = evaluated.observations[side]?.prediction?.profile?.device_type;
      return label ? [[side, label]] : [];
    });
    if (expected && predictions.length) {
      const judgeFingerprint = digest({ expected, predictions });
      const cached = await run.reuse(item.id, "judge", judgeFingerprint);
      const artifact = cached?.artifact ?? await judgeTypes(clients.decisions, expected, predictions);
      if (cached) reused += 1;
      await run.save(item.id, "judge", { fingerprint: judgeFingerprint, artifact, reusedFrom: cached?.reusedFrom });
      evaluated.judge = artifact;
      if (artifact.error) console.warn(`${item.id} type judge · ${artifact.error.message}`);
    }
    return evaluated;
  });

  const report = buildReport(rows, {
    runId: run.id, startedAt: run.startedAt, sides,
    dataset: { available: items.length, selected: selected.length, limit, warnings }, reused,
  });
  const reportJson = json(report);
  const reportMarkdown = markdownReport(report);
  await mkdir(REPORT_ROOT, { recursive: true });
  await writeAtomic(path.join(REPORT_ROOT, "REPORT.md"), reportMarkdown);
  await writeAtomic(path.join(REPORT_ROOT, "latest.json"), reportJson);

  console.log("\nMeasured results (n is the metric denominator)");
  for (const key of HEADLINES) {
    const values = sides.map((side) => {
      const { value, n } = report.overall.sides[side].metrics[key];
      return `${side} ${value === null ? "unavailable" : `${(value * 100).toFixed(1)}%`} (n=${n})`;
    });
    console.log(`${METRICS[key]} · ${values.join(" · ")}`);
  }
  console.log("\nReport written to eval/report/latest.json and eval/report/REPORT.md.");
  if (sides.every((side) => report.overall.sides[side].failures === selected.length)) process.exitCode = 1;
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
