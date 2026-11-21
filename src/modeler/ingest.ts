/** Orchestrates real model stages and returns a proposal without mutating the twin. */
import { randomUUID } from "node:crypto";
import { geminiClients, providerFailure } from "@/gemini/transport";
import type { PreparedContext } from "./context";
import { deleteWalkthrough, uploadWalkthrough } from "./filesApi";
import { extractItems, gateSource, MODELER_MODELS, proposePlacement } from "./gemini";
import { ModelerError } from "./limits";
import { inlineEvidence, prepareSource, type GateInput } from "./media";
import { observeItems } from "./observations";
import { checkProposal } from "./reconcile";
import type { ModelEvent, ModelProposal, ModelTimings } from "./types";

async function stage<T>(
  label: string, deadlineMs: number, parent: AbortSignal, work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const timeout = AbortSignal.timeout(deadlineMs);
  try {
    const signal = AbortSignal.any([timeout, parent]);
    signal.throwIfAborted();
    const result = await work(signal);
    signal.throwIfAborted();
    return result;
  } catch (error) {
    parent.throwIfAborted();
    if (timeout.aborted) throw new ModelerError(`${label} timed out. Try a smaller or clearer source.`);
    if (error instanceof ModelerError) throw error;
    throw new ModelerError(`${label}: ${providerFailure(error)}`);
  }
}

export async function ingestModel(
  files: File[], context: PreparedContext, emit: (event: ModelEvent) => void, signal: AbortSignal,
): Promise<ModelProposal> {
  const start = performance.now();
  const elapsed = (from: number) => Math.round(performance.now() - from);
  const timings: ModelTimings = { uploadMs: 0, gateMs: 0, extractionMs: 0, reconciliationMs: 0, validationMs: 0, totalMs: 0 };
  const prepared = await prepareSource(files, signal);
  emit({ type: "source.received", source: prepared.source });
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ModelerError("Gemini is not configured on the server.");
  const clients = geminiClients();
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const resource = prepared.video ? `files/pw-model-${runId.toLowerCase()}` : undefined;

  try {
    let evidence: GateInput = inlineEvidence(prepared);
    if (resource && prepared.video) {
      const { file, mime } = prepared.video;
      const uri = await stage("Video upload", 40_000, signal,
        (step) => uploadWalkthrough(file, mime, resource, apiKey, step));
      evidence = [{ type: "video", uri, mime_type: mime, resolution: "medium" }];
    }
    timings.uploadMs = elapsed(start);
    emit({ type: "source.ready", uploadMs: timings.uploadMs });

    let started = performance.now();
    emit({ type: "gate.started" });
    const gate = await stage("Source check", 20_000, signal,
      (step) => gateSource(clients, evidence, prepared.source, step));
    prepared.source = gate.source;
    timings.gateMs = elapsed(started);
    emit({ type: "gate.done", ...gate, latencyMs: timings.gateMs });
    if (gate.reason) throw new ModelerError(gate.reason);

    started = performance.now();
    emit({ type: "extraction.started" });
    const extracted = await stage("Equipment extraction", 75_000, signal,
      (step) => extractItems(clients, prepared, evidence, context.twin, step));
    const observed = observeItems(extracted, prepared, context.twin);
    timings.extractionMs = elapsed(started);
    emit({ type: "extraction.done", items: observed.items, latencyMs: timings.extractionMs });

    started = performance.now();
    if (observed.items.length) emit({ type: "reconciliation.started" });
    const decisions = observed.items.length ? await stage("Twin reconciliation", 35_000, signal,
      (step) => proposePlacement(clients, observed.items, context.twin, step)) : [];
    timings.reconciliationMs = elapsed(started);

    started = performance.now();
    const checked = checkProposal(context, observed.items, decisions, runId);
    timings.validationMs = elapsed(started);
    timings.totalMs = elapsed(start);
    const proposal = {
      source: gate.source, ...checked, dropped: [...observed.dropped, ...checked.dropped],
      timings, models: MODELER_MODELS,
    };
    emit({ type: "complete", proposal });
    return proposal;
  } finally {
    if (resource) await deleteWalkthrough(resource, apiKey);
  }
}
