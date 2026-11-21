/** Runs paired live predictions, preserving every completed attempt for reporting and resume. */
import { stat } from "node:fs/promises";
import { parseArgs } from "node:util";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { geminiClients } from "@/gemini/transport";
import type { CaptureInput } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { BASELINE_CONTRACT, runBaseline } from "./baseline";
import { openBaselineSource } from "./baselineReuse";
import { digest, openRun, sourceFingerprint } from "./cache";
import { DATASET_ROOT, loadDataset, selectItems } from "./dataset";
import { readDatasetImage } from "./image";
import { judgeTypes } from "./judge";
import { modalityInput } from "./modality";
import { installProviderTelemetry, measureProvider } from "./providerTelemetry";
import { runSystem } from "./system";
import { SIDES, type EvaluatedItem, type EvaluationItem, type RunArtifact, type Side } from "./types";

async function capture(item: EvaluationItem): Promise<CaptureInput> {
  if (item.input.kind !== "photo") return item.input;
  const { bytes, mimeType } = await readDatasetImage(DATASET_ROOT, item.input.file);
  return { kind: "photo", images: [{ mimeType, dataBase64: bytes.toString("base64") }] };
}

function failed(stage: string, message: string): RunArtifact {
  return { status: "error", latencyMs: null, prediction: null, ruleCheck: null, error: { stage, message, timeout: false }, raw: null };
}

function positiveInteger(value: string | undefined, name: string, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > max) {
    throw new Error(`--${name} must be a positive integer${max === Number.MAX_SAFE_INTEGER ? "" : ` up to ${max}`}.`);
  }
  return number;
}

async function main() {
  const { values: options } = parseArgs({ options: {
    limit: { type: "string" }, only: { type: "string" }, resume: { type: "boolean" }, help: { type: "boolean" },
    label: { type: "string" }, concurrency: { type: "string" }, "max-minutes": { type: "string" },
    "reuse-baseline": { type: "string" }, "collect-only": { type: "boolean" },
    "modality-ablation": { type: "boolean" },
  } });
  if (options.help) {
    console.log("Usage: npm run eval -- [--label NAME] [--concurrency N] [--max-minutes N] [--limit N] [--only baseline|system] [--resume] [--reuse-baseline LABEL] [--modality-ablation] [--collect-only]");
    return;
  }

  const limit = positiveInteger(options.limit, "limit");
  const concurrency = positiveInteger(options.concurrency, "concurrency", 64) ?? 6;
  const maxMinutes = positiveInteger(options["max-minutes"], "max-minutes", 1_440);
  if (options.label !== undefined && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(options.label)) {
    throw new Error("--label must use up to 40 lowercase letters, digits or hyphens and start with a letter or digit.");
  }
  if (options.only !== undefined && options.only !== "baseline" && options.only !== "system") {
    throw new Error("--only must be baseline or system.");
  }
  const sides: readonly Side[] = options.only ? [options.only] : SIDES;
  const modalityAblation = options["modality-ablation"] === true;
  if (modalityAblation && !sides.includes("system")) throw new Error("--modality-ablation requires the system side.");
  const freezeMarker = options.label === "run-3" ? ".agents/pipeline-frozen"
    : options.label === "run-4" ? ".agents/pipeline-frozen-run4" : null;
  if (freezeMarker && !(await stat(freezeMarker).catch(() => null))?.isFile()) {
    throw new Error(`${options.label} is waiting for ${freezeMarker}.`);
  }
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("GEMINI_API_KEY is missing. Set it in the project's .env or export it before running the evaluation.");

  const { items, errors, warnings } = await loadDataset();
  for (const warning of warnings) console.warn(`Dataset: ${warning}`);
  if (errors.length) throw new Error(`Fix the dataset before running evaluation:\n${errors.join("\n")}`);
  if (!items.length) throw new Error("No evaluation items found. Add labeled rows to eval/dataset/labels.csv or eval/dataset/links.csv.");

  const selected = selectItems(items, limit);
  const baselineFrom = options["reuse-baseline"];
  if (baselineFrom && (!sides.includes("baseline") || baselineFrom === options.label)) {
    throw new Error("--reuse-baseline requires the baseline side and a different donor label.");
  }
  const donor = baselineFrom ? await openBaselineSource(baselineFrom, selected.map(({ id }) => id), MODEL_IDS.perception) : null;
  if (donor) {
    for (const item of selected) {
      const fingerprint = digest(await capture(item));
      if (donor.receipts.get(item.id)?.fingerprint !== fingerprint) throw new Error(`Saved baseline input differs for ${item.id}.`);
    }
  }
  const fingerprint = digest({ sources: await sourceFingerprint(), twin: SEED_TWIN, thinking: THINKING, dataset: items, baselineFrom, modalityAblation });
  const run = await openRun(fingerprint, selected.map(({ id }) => id), sides, options.resume === true, {
    label: options.label, concurrency, thinking: { ...THINKING }, baselineContract: donor?.contract ?? BASELINE_CONTRACT, baselineFrom,
    objectAssessment: true, modalityAblation,
    datasetFingerprint: digest(items),
    models: { baseline: MODEL_IDS.perception, system: [MODEL_IDS.decisions, MODEL_IDS.perception, MODEL_IDS.reasoning, MODEL_IDS.chief], judge: MODEL_IDS.decisions },
  });
  const restoreFetch = installProviderTelemetry();
  const clients = geminiClients();
  const interrupted = new AbortController();
  const stop = maxMinutes === undefined ? interrupted.signal
    : AbortSignal.any([interrupted.signal, AbortSignal.timeout(maxMinutes * 60_000)]);
  const interrupt = () => interrupted.abort();
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  const publisher = options["collect-only"] ? null : await import("./publish");
  let lastReceipts: number | undefined;
  let refreshInFlight: Promise<void> | undefined;
  const refreshTimer = publisher ? setInterval(() => {
    if (refreshInFlight || stop.aborted) return;
    refreshInFlight = publisher.refreshEvaluation(run.id, lastReceipts)
      .then(({ receipts }) => { lastReceipts = receipts; })
      .catch((error: Error) => console.warn(`Report snapshot failed: ${error.message}`))
      .finally(() => { refreshInFlight = undefined; });
  }, 12_000) : undefined;

  let next = 0;
  console.log(`Evaluating ${selected.length} items with ${sides.join(" and ")} at concurrency ${concurrency} (${options.label ?? run.id}).`);
  console.log(`Artifacts: eval/runs/${run.id}`);
  if (donor) console.log(`Reusing ${donor.receipts.size} ${baselineFrom} baseline receipts with identical capture fingerprints.`);
  if (modalityAblation) console.log(`Text-only ablation on ${selected.filter(modalityInput).length} labeled device photos.`);

  async function assess(input: CaptureInput | undefined, side: Side) {
    return measureProvider(async () => {
      if (!input) return failed("input", "The evaluation capture could not be read.");
      try {
        const twin = structuredClone(SEED_TWIN);
        return side === "baseline" ? await runBaseline(clients.interactions, input, twin, stop) : await runSystem(input, twin, stop);
      } catch {
        return failed(side, "The evaluation adapter could not finish this attempt.");
      }
    });
  }

  async function evaluate(item: EvaluationItem, index: number) {
    const evaluated: EvaluatedItem = { item, observations: {} };
    const order = index % 2 === 0 ? sides : [...sides].reverse();
    let input: CaptureInput | undefined;
    try {
      input = await capture(item);
    } catch {
      // A missing or unreadable capture is a failed attempt for each side.
    }
    const inputFingerprint = digest(input ?? item.input);

    await Promise.all(order.map(async (side) => {
      if (stop.aborted) return;
      const cached = await run.reuse(item.id, side, inputFingerprint)
        ?? (side === "baseline" ? donor?.receipts.get(item.id) : undefined);
      if (cached && cached.fingerprint !== inputFingerprint) throw new Error(`Capture changed during evaluation: ${item.id}.`);
      const artifact = cached?.artifact ?? await assess(input, side);
      if (stop.aborted && !cached) return;
      await run.save(item.id, side, { fingerprint: inputFingerprint, artifact, reusedFrom: cached?.reusedFrom });
      evaluated.observations[side] = artifact;
      const calls = artifact.providerCalls;
      console.log(`${item.id} ${side} ${artifact.status}${cached ? " (cached)" : ""}${calls ? ` · ${calls.attempts} calls${calls.rateLimited ? ` (${calls.rateLimited} HTTP 429)` : ""}` : ""}${artifact.error ? ` · ${artifact.error.stage} · ${artifact.error.message}` : ""}`);
    }));

    const expected = item.expected.deviceType;
    const predictions = order.flatMap((side): [Side, string][] => {
      const prediction = evaluated.observations[side]?.prediction;
      return prediction?.profile?.device_type ? [[side, prediction.profile.device_type]] : [];
    });
    if (expected && predictions.length && !stop.aborted) {
      const judgeFingerprint = digest({ expected, predictions });
      const cached = await run.reuse(item.id, "judge", judgeFingerprint);
      const artifact = cached?.artifact ?? await measureProvider(() => judgeTypes(clients.decisions, expected, predictions, stop));
      if (stop.aborted && !cached) return;
      await run.save(item.id, "judge", { fingerprint: judgeFingerprint, artifact, reusedFrom: cached?.reusedFrom });
      if (artifact.error) console.warn(`${item.id} type judge · ${artifact.error.message}`);
    }
    const text = modalityAblation && modalityInput(item);
    if (text && !stop.aborted) {
      const fingerprint = digest(text);
      const cached = await run.reuse(item.id, "ablation", fingerprint);
      const artifact = cached?.artifact ?? await assess(text, "system");
      if (stop.aborted && !cached) return;
      await run.save(item.id, "ablation", { fingerprint, artifact, reusedFrom: cached?.reusedFrom });
      console.log(`${item.id} ablation ${artifact.status}${cached ? " (cached)" : ""}${artifact.error ? ` · ${artifact.error.stage} · ${artifact.error.message}` : ""}`);
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(selected.length, concurrency) }, async () => {
      while (!stop.aborted && next < selected.length) {
        const index = next++;
        await evaluate(selected[index], index);
      }
    }));
  } finally {
    clearInterval(refreshTimer);
    await refreshInFlight;
    restoreFetch();
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }

  if (!publisher) {
    console.log(`Collection ended. Publish with npx tsx eval/snapshot.ts --label ${options.label ?? run.id}.`);
    return;
  }
  const report = await publisher.publishEvaluation(run.id);
  console.log(`Published ${report.dataset.evaluated} / ${selected.length} captures. Reports are in eval/report/.`);
  if (report.modality?.enabled) console.log(`Published ${report.modality.paired} / ${report.modality.eligible} modality pairs.`);
  if (report.dataset.evaluated < selected.length) {
    console.log(`Run is partial. Resume with the same options plus --resume.`);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
