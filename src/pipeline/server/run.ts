/** Runs real analysis and reassessment, emitting typed events only as each stage occurs. */
import { randomUUID } from "node:crypto";
import { assessDevice, briefEngineer } from "@/gemini/assess";
import { captureEvidence, gateCapture, perceive } from "@/gemini/capture";
import { MODEL_IDS } from "@/gemini/models";
import { geminiClients, PipelineFailure, providerFailure, type GeminiClients } from "@/gemini/transport";
import { fetchProductPage } from "@/link/fetchProductPage";
import { assetFromProfile, capturedAssetId, networkAt, resolveDropPoint } from "@/pipeline/assetFromProfile";
import type {
  AnalyzeRequest, CaptureInput, DeviceProfile, DropPoint, LinkSnapshot, PipelineEvent, PipelineStage, ReassessRequest,
} from "@/pipeline/types";
import { assetById } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import { groundAssessment } from "./groundAssessment";
import { captureImageSchema } from "./requests";
import { checkPlacement } from "./selfCheck";

type EventData<T = PipelineEvent> = T extends PipelineEvent ? Omit<T, "runId" | "at"> : never;
type EventSink = (event: PipelineEvent) => void;
interface Run {
  id: string;
  emit: (event: EventData) => void;
  stage: (stage: PipelineStage) => void;
  signal: AbortSignal;
}

const LIMIT_MS = {
  link: 18_000, gate: 20_000, perception: 45_000, reasoning: 120_000, revision: 120_000, summary: 30_000,
};

async function deadline<T>(run: Run, stage: keyof typeof LIMIT_MS, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const timer = AbortSignal.timeout(LIMIT_MS[stage]);
  const signal = AbortSignal.any([run.signal, timer]);
  signal.throwIfAborted();
  try {
    const result = await work(signal);
    signal.throwIfAborted();
    return result;
  } catch (error) {
    if (timer.aborted && !run.signal.aborted) {
      throw new PipelineFailure(`The ${stage} stage timed out after ${LIMIT_MS[stage] / 1000} seconds. Try again.`);
    }
    throw error;
  }
}

const elapsed = (since: number) => Math.round(performance.now() - since);

async function execute(sink: EventSink, signal: AbortSignal, work: (run: Run) => Promise<void>): Promise<void> {
  const started = performance.now();
  const id = randomUUID();
  let stage: PipelineStage | "unknown" = "unknown";
  const emit = (event: EventData) => {
    if (!signal.aborted) sink({ ...event, runId: id, at: Date.now() });
  };
  try {
    await work({ id, signal, emit, stage: (next) => { stage = next; } });
    emit({ type: "run.completed", totalMs: elapsed(started) });
  } catch (error) {
    emit({ type: "run.error", stage, message: providerFailure(error) });
  }
}

function inputLabel(input: CaptureInput): string {
  switch (input.kind) {
    case "photo": return input.images.length === 1 ? "Device photo" : `${input.images.length} device photos`;
    case "link": return new URL(input.url).hostname;
    case "text": return input.description.replace(/\s+/g, " ").slice(0, 80);
  }
}

// The link task owns the fetcher. Its existing one-argument stub also accepts this call at runtime.
const fetchLink: (url: string, options?: { signal: AbortSignal }) => Promise<LinkSnapshot> = fetchProductPage;

async function readLink(run: Run, url: string): Promise<LinkSnapshot> {
  const start = performance.now();
  run.stage("link");
  run.emit({ type: "link.started", url });
  const result = await deadline(run, "link", async (signal) => {
    try {
      return await fetchLink(url, { signal });
    } catch {
      signal.throwIfAborted();
      throw new PipelineFailure("Could not read this product page. Try a device photo or paste the key specifications.");
    }
  });
  const image = captureImageSchema.safeParse(result.image);
  const { url: fetchedUrl, title, imageUrl } = result;
  run.emit({ type: "link.fetched", latencyMs: elapsed(start), snapshot: { url: fetchedUrl, title, imageUrl } });
  return { ...result, image: image.success ? image.data : null };
}

async function assessAndBrief(
  run: Run,
  clients: GeminiClients,
  twin: Twin,
  candidate: Asset,
  profile: DeviceProfile,
  reassess: boolean,
): Promise<void> {
  const context = { profile, twin, candidate, reassess };
  const onThought = (text: string) => run.emit({ type: "reasoning.thought", text });
  run.stage("reasoning");
  run.emit({ type: "reasoning.started", model: MODEL_IDS.reasoning, candidateArea: candidate.physical.area });
  const reasoningStarted = performance.now();
  const first = await deadline(run, "reasoning", (signal) => assessDevice(clients.interactions, context, signal, onThought));
  let grounded = groundAssessment(twin, candidate, first.value, run.id);
  run.emit({
    type: "reasoning.done", model: MODEL_IDS.reasoning, latencyMs: elapsed(reasoningStarted), assessment: grounded.assessment,
  });

  function inspect(revised: boolean) {
    run.stage("selfcheck");
    run.emit({ type: "selfcheck.started", engine: "rules engine" });
    const start = performance.now();
    const result = checkPlacement(twin, candidate, grounded.assessment, grounded.disagreements, reassess, revised);
    const latencyMs = elapsed(start);
    for (const path of result.paths) run.emit({ type: "selfcheck.path", path });
    run.emit({ type: "selfcheck.done", latencyMs, result });
    return result;
  }

  let checked = inspect(false);
  if (checked.disagreements.length) {
    run.stage("revision");
    run.emit({ type: "revision.started", model: MODEL_IDS.reasoning, reason: checked.disagreements.join(" ") });
    if (!first.interactionId) throw new PipelineFailure("Gemini did not return the session ID needed for revision.");
    const revisionStarted = performance.now();
    const previousId = first.interactionId;
    const revised = await deadline(run, "revision", (signal) => assessDevice(clients.interactions, context, signal, onThought, {
      previousId, disagreements: checked.disagreements,
    }));
    grounded = groundAssessment(twin, candidate, revised.value, run.id);
    run.emit({
      type: "revision.done", model: MODEL_IDS.reasoning, latencyMs: elapsed(revisionStarted), assessment: grounded.assessment,
    });
    checked = inspect(true);
  }

  run.stage("summary");
  run.emit({ type: "summary.started", model: MODEL_IDS.chief });
  const summaryStarted = performance.now();
  const text = await deadline(run, "summary", (signal) =>
    briefEngineer(clients.interactions, context, grounded.assessment, checked, signal),
  );
  run.emit({ type: "summary.done", model: MODEL_IDS.chief, latencyMs: elapsed(summaryStarted), text });
}

export function runAnalyze(request: AnalyzeRequest, sink: EventSink, signal = new AbortController().signal): Promise<void> {
  return execute(sink, signal, async (run) => {
    const { input, twin } = request;
    const dropPoint = resolveDropPoint(twin, request.dropPoint);
    run.emit({ type: "run.started", mode: "analyze", input: { kind: input.kind, label: inputLabel(input) }, dropPoint });
    run.stage("gate");
    const clients = geminiClients();
    const link = input.kind === "link" ? await readLink(run, input.url) : undefined;
    const evidence = captureEvidence(input, link);

    run.stage("gate");
    run.emit({ type: "gate.started", model: MODEL_IDS.decisions });
    const gateStarted = performance.now();
    const gate = await deadline(run, "gate", (signal) => gateCapture(clients.decisions, evidence, signal));
    run.emit({ type: "gate.done", model: MODEL_IDS.decisions, latencyMs: elapsed(gateStarted), gate });
    if (!gate.proceed) throw new PipelineFailure(gate.reason ?? "Try a capture that shows a device.");

    run.stage("perception");
    run.emit({ type: "perception.started", model: MODEL_IDS.perception });
    const perceptionStarted = performance.now();
    const profile = await deadline(run, "perception", (signal) => perceive(clients.interactions, evidence, signal));
    const candidate = assetFromProfile(profile, twin, capturedAssetId(run.id), dropPoint);
    run.emit({ type: "perception.done", model: MODEL_IDS.perception, latencyMs: elapsed(perceptionStarted), profile });

    await assessAndBrief(run, clients, twin, candidate, profile, false);
  });
}

export function runReassess(request: ReassessRequest, sink: EventSink, signal = new AbortController().signal): Promise<void> {
  return execute(sink, signal, async (run) => {
    const { twin, profile, assetId, placement } = request;
    const dropPoint: DropPoint = { x: placement.x, y: placement.y, area: placement.area };
    run.emit({ type: "run.started", mode: "reassess", input: { kind: "text", label: `Reassess ${assetId}` }, dropPoint });
    run.stage("gate");
    const clients = geminiClients();
    run.stage("reasoning");
    const asset = assetById(twin, assetId);
    if (!asset || asset.origin !== "added") throw new PipelineFailure("The captured device is missing from the plant.");
    const level = placement.level ?? asset.network.level;
    const network = asset.physical.area === dropPoint.area && asset.network.level === level
      ? asset.network
      : { ...asset.network, ...networkAt(twin, dropPoint, asset.physical.kind, level) };
    const candidate: Asset = { ...asset, physical: { ...asset.physical, ...dropPoint }, network };
    const current = { ...twin, assets: twin.assets.map((peer) => peer.id === assetId ? candidate : peer) };
    await assessAndBrief(run, clients, current, candidate, profile, true);
  });
}
