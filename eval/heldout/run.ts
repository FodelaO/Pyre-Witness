// Collects fresh held-out pairs and rebuilds the isolated report from saved receipts.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import type { CaptureInput, PipelineEvent } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { digest, sourceFingerprints } from "../cache";
import { loadDataset, selectItems } from "../dataset";
import { readDatasetImage } from "../image";
import { observeObject } from "../objectEvidence";
import { SIDES, type EvaluatedItem, type EvaluationItem, type RunArtifact, type Side } from "../types";
import { auditBaseline } from "./contract";
import { createRun, findRun, ledger, type HeldoutManifest } from "./ledger";
import { judgeInput, sideOrder } from "./pairing";
import { writeReport } from "./report";

function positiveInteger(value: string | undefined, name: string, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > max) {
    throw new Error(`--${name} must be a positive integer${max === Number.MAX_SAFE_INTEGER ? "" : ` up to ${max}`}.`);
  }
  return number;
}

async function capture(root: string, item: EvaluationItem): Promise<CaptureInput> {
  if (item.input.kind !== "photo") return item.input;
  const { bytes, mimeType } = await readDatasetImage(root, item.input.file);
  return { kind: "photo", images: [{ mimeType, dataBase64: bytes.toString("base64") }] };
}

async function prepare(datasetRoot: string, label: string | undefined, concurrency: number, limit?: number): Promise<HeldoutManifest> {
  const { items, errors, warnings } = await loadDataset(datasetRoot);
  if (errors.length) throw new Error(`Fix dataset errors before launching:\n${errors.join("\n")}`);
  if (!items.length) throw new Error("No labeled captures were found.");
  const fingerprints = new Map<string, string>();
  for (const item of items) fingerprints.set(item.id, digest(await capture(datasetRoot, item)));
  const datasetFingerprint = digest({ items, captures: [...fingerprints] });
  const [sources, baseline, ...collector] = await Promise.all([
    sourceFingerprints(), auditBaseline(), ...["run.ts", "ledger.ts", "pairing.ts", "contract.ts"]
      .map((file) => readFile(path.join(process.cwd(), "eval", "heldout", file), "utf8")),
  ]);
  const selected = selectItems(items, limit).map((item) => ({ item, fingerprint: fingerprints.get(item.id)! }));
  const startedAt = new Date().toISOString();
  const models = { baseline: MODEL_IDS.perception, perception: MODEL_IDS.perception, reasoning: MODEL_IDS.reasoning,
    chief: MODEL_IDS.chief, gate: MODEL_IDS.decisions, judge: MODEL_IDS.decisions };
  const configFingerprint = digest({ sources: sources.combined, collector, datasetFingerprint, selected, concurrency, models,
    thinking: THINKING, twin: SEED_TWIN, baseline: [baseline.contract, baseline.promptSha256, baseline.responseSchemaSha256] });
  return { version: 1, label: label ?? startedAt.toLowerCase().replace(/[:.]/g, "-"), startedAt, datasetRoot,
    datasetFingerprint, pipelineFingerprint: sources.pipeline, configFingerprint, available: items.length,
    limit, warnings, concurrency, models, thinking: THINKING, baseline, items: selected };
}

async function collect(manifest: HeldoutManifest) {
  const [{ geminiClients }, { runBaseline }, { runSystem }, { judgeTypes }, { installProviderTelemetry, measureProvider }] = await Promise.all([
    import("@/gemini/transport"), import("../baseline"), import("../system"), import("../judge"), import("../providerTelemetry"),
  ]);
  const clients = geminiClients();
  const restoreFetch = installProviderTelemetry();
  const stop = new AbortController();
  const interrupt = () => stop.abort();
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  const receipts = ledger(manifest);
  let next = 0;

  async function assess(side: Side, input: CaptureInput) {
    return measureProvider(async (): Promise<RunArtifact> => {
      const start = performance.now();
      try {
        const twin = structuredClone(SEED_TWIN);
        return side === "baseline" ? await runBaseline(clients.interactions, input, twin, stop.signal)
          : await runSystem(input, twin, stop.signal);
      } catch {
        return { status: "error", latencyMs: Math.round(performance.now() - start), prediction: null, ruleCheck: null, raw: null,
          error: { stage: side, message: "The evaluation adapter could not finish this attempt.", timeout: false } };
      }
    });
  }

  async function evaluate(index: number) {
    const { item, fingerprint } = manifest.items[index];
    const row: EvaluatedItem = { item, observations: {} };
    const order = sideOrder(index);
    const cached = await Promise.all(order.map((side) => receipts.read(item.id, side, fingerprint)));
    const input = cached.every(Boolean) ? null : await capture(manifest.datasetRoot, item);
    if (input && digest(input) !== fingerprint) throw new Error(`Capture ${item.id} changed after launch.`);
    // As in the main runner, launch both sides concurrently in alternating order.
    const outcomes = await Promise.allSettled(order.map(async (side, offset) => {
      const savedAttempt = cached[offset];
      if (savedAttempt) {
        row.observations[side] = savedAttempt.artifact;
        return;
      }
      if (!input) throw new Error(`Missing capture for ${item.id}.`);
      if (stop.signal.aborted) return;
      const artifact = await assess(side, input);
      if (stop.signal.aborted && artifact.status === "error") return;
      const saved = await receipts.save(item.id, side, fingerprint, artifact);
      row.observations[side] = saved.artifact;
      console.log(`${item.id} ${side} ${saved.artifact.status} · ${saved.artifact.latencyMs ?? "unknown"} ms`);
    }));
    const failure = outcomes.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    const judge = judgeInput(row, index);
    if (!judge || stop.signal.aborted) return;
    const judgeFingerprint = digest(judge);
    if (await receipts.read(item.id, "judge", judgeFingerprint)) return;
    const artifact = await measureProvider(() => judgeTypes(clients.decisions, judge.expected, judge.predictions, stop.signal));
    if (!stop.signal.aborted || !artifact.error) {
      await receipts.save(item.id, "judge", judgeFingerprint, artifact);
      console.log(`${item.id} judge ${artifact.error ? "error" : "ok"} · ${artifact.latencyMs ?? "unknown"} ms`);
    }
  }

  try {
    const workers = await Promise.allSettled(Array.from({ length: Math.min(manifest.items.length, manifest.concurrency) }, async () => {
      try {
        while (!stop.signal.aborted && next < manifest.items.length) await evaluate(next++);
      } catch (error) {
        stop.abort();
        throw error;
      }
    }));
    const failure = workers.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    if (stop.signal.aborted) process.exitCode = 130;
  } finally {
    restoreFetch();
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
}

async function rebuild(manifest: HeldoutManifest) {
  const receipts = ledger(manifest);
  let date = manifest.startedAt;
  const rows = await Promise.all(manifest.items.map(async ({ item, fingerprint }, index) => {
    const row: EvaluatedItem = { item, observations: {} };
    await Promise.all(SIDES.map(async (side) => {
      const saved = await receipts.read(item.id, side, fingerprint);
      if (!saved) return;
      if (saved.finishedAt > date) date = saved.finishedAt;
      const { artifact } = saved;
      const gateEvidence = side === "system" && Array.isArray(artifact.raw)
        ? (artifact.raw as PipelineEvent[]).find((event) => event.type === "gate.done")?.gate.answers : undefined;
      row.observations[side] = { ...artifact, gateEvidence, objectAssessment: observeObject(side, artifact, item.expected.isDevice, SEED_TWIN) };
    }));
    const judge = judgeInput(row, index);
    if (judge && SIDES.every((side) => row.observations[side])) {
      const saved = await receipts.read(item.id, "judge", digest(judge));
      if (saved && saved.finishedAt > date) date = saved.finishedAt;
      row.judge = saved?.artifact;
    }
    return row;
  }));
  await writeReport(manifest, rows, date);
  console.log(`Wrote eval/heldout/REPORT.md and results.json for ${manifest.label}.`);
}

async function main() {
  const { values } = parseArgs({ options: {
    dataset: { type: "string" }, concurrency: { type: "string" }, label: { type: "string" }, limit: { type: "string" },
    resume: { type: "boolean" }, "report-only": { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Usage: npx tsx --env-file=.env eval/heldout/run.ts [--dataset DIR] [--concurrency N] [--label NAME] [--limit N] [--resume | --report-only]");
    return;
  }
  if (values.label !== undefined && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(values.label)) {
    throw new Error("--label must start with a lowercase letter or digit and use at most 40 lowercase letters, digits or hyphens.");
  }
  if (values["report-only"]) {
    if (values.resume) throw new Error("Use either --report-only or --resume.");
    await rebuild(await findRun(values.label));
    return;
  }
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("GEMINI_API_KEY is missing.");
  const prior = values.resume ? await findRun(values.label) : undefined;
  const root = path.resolve(values.dataset ?? prior?.datasetRoot ?? "eval/heldout/dataset");
  const concurrency = positiveInteger(values.concurrency, "concurrency", 64) ?? prior?.concurrency ?? 6;
  const limit = positiveInteger(values.limit, "limit") ?? prior?.limit;
  const prepared = await prepare(root, values.label ?? prior?.label, concurrency, limit);
  if (prior && prior.configFingerprint !== prepared.configFingerprint) {
    throw new Error("The dataset, sources or configuration changed. Restore the original configuration or use a new label.");
  }
  if (!prior) await createRun(prepared);
  const manifest = prior ? { ...prior, datasetRoot: root } : prepared;
  if (manifest.baseline.status !== "matches") {
    console.warn(`Baseline contract check: ${manifest.baseline.status}. See the report for archived provenance.`);
  }
  console.log(`Evaluating ${manifest.items.length} held-out items at concurrency ${concurrency}. Artifacts: eval/runs/heldout/${manifest.label}`);
  await collect(manifest);
  await rebuild(manifest);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Held-out evaluation failed.";
  const key = process.env.GEMINI_API_KEY?.trim();
  console.error(key ? message.replaceAll(key, "[redacted]") : message);
  process.exitCode = 1;
});
