/** Runs real analysis and reassessment, emitting typed events only as each stage occurs. */
import { randomUUID } from "node:crypto";
import { revisePlacement } from "@/gemini/assess";
import { briefEngineerWithinDeadline, BRIEFING_STATUS_SOURCE } from "@/gemini/briefing";
import { captureEvidence, gateCapture, perceive, profileGateEvidence } from "@/gemini/capture";
import { MODEL_IDS } from "@/gemini/models";
import { recordGeminiTranscript, withGeminiTranscript } from "@/gemini/transcript";
import { geminiClients, PipelineFailure, providerFailure, type GeminiClients } from "@/gemini/transport";
import { LinkFetchError } from "@/link/errors";
import { fetchProductPage } from "@/link/fetchProductPage";
import { asPassiveObject, assetFromProfile, capturedAssetId, networkAt, resolveDropPoint } from "@/pipeline/assetFromProfile";
import type {
  AnalyzeRequest, CaptureInput, DeviceProfile, DropPoint, GateResult, LinkSnapshot, PipelineStage, ReassessRequest, SelfCheckPhase, SelfCheckResult,
} from "@/pipeline/types";
import { assetById } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import { CaptureImageError, normalizeCaptureImages } from "./captureImages";
import { interruptible } from "./deadline";
import { completeAssessmentRisks } from "./finalRisks";
import { groundAssessment } from "./groundAssessment";
import { captureImageSchema } from "./requests";
import { assessWithReducedRetry, REASONING_DEADLINE_MS } from "./reasoning";
import { checkAsDropped, holdBlockedPlacement, reviewRecommendation } from "./selfCheck";
import type { StreamEvent } from "./sse";

type EventData<T = StreamEvent> = T extends StreamEvent ? Omit<T, "runId" | "at"> : never;
type EventSink = (event: StreamEvent) => void;
interface Run {
  id: string;
  emit: (event: EventData) => void;
  stage: (stage: PipelineStage) => void;
  complete: () => void;
  signal: AbortSignal;
}

interface RunOptions {
  /** HTTP clients keep reading the stream after the checked placement completes. */
  completeBeforeBriefing?: boolean;
}

const LIMIT_MS = {
  gate: 4_000, perception: 45_000, reasoning: REASONING_DEADLINE_MS, revision: 60_000,
};

async function deadline<T>(run: Run, stage: keyof typeof LIMIT_MS, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const timer = AbortSignal.timeout(LIMIT_MS[stage]);
  const signal = AbortSignal.any([run.signal, timer]);
  signal.throwIfAborted();
  try {
    const result = await interruptible(signal, () => work(signal));
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

async function execute(sink: EventSink, signal: AbortSignal, options: RunOptions, work: (run: Run) => Promise<void>): Promise<void> {
  const started = performance.now();
  const id = randomUUID();
  let stage: PipelineStage | "unknown" = "unknown";
  let totalMs: number | undefined;
  const emit = (event: EventData) => {
    if (!signal.aborted) sink({ ...event, runId: id, at: Date.now() });
  };
  const complete = () => {
    if (totalMs !== undefined) return;
    totalMs = elapsed(started);
    if (options.completeBeforeBriefing) emit({ type: "run.completed", totalMs });
  };
  try {
    await withGeminiTranscript((entry) => emit({ type: "transcript.entry", entry }), () =>
      work({ id, signal, emit, complete, stage: (next) => { stage = next; } }));
    complete();
    if (!options.completeBeforeBriefing && totalMs !== undefined) emit({ type: "run.completed", totalMs: elapsed(started) });
  } catch (error) {
    if (!signal.aborted) {
      const message = providerFailure(error);
      if (totalMs === undefined || !options.completeBeforeBriefing) emit({ type: "run.error", stage, message });
    }
  }
}

function inputLabel(input: CaptureInput): string {
  switch (input.kind) {
    case "photo": return input.images.length === 1 ? "Object photo" : `${input.images.length} object photos`;
    case "link": return new URL(input.url).hostname;
    case "text": return input.description.replace(/\s+/g, " ").slice(0, 80);
  }
}

async function readLink(run: Run, url: string): Promise<LinkSnapshot> {
  const start = performance.now();
  run.stage("link");
  run.emit({ type: "link.started", url });
  const result = await fetchProductPage(url, { signal: run.signal, captureBudget: true }).catch((error: unknown) => {
    run.signal.throwIfAborted();
    if (error instanceof LinkFetchError) console.warn("[pipeline] link fetch failed", run.id, error.code, error.status ?? "");
    throw new PipelineFailure("This page did not return readable product details; try a photo or paste the specs as text.");
  });
  const parsedImage = captureImageSchema.safeParse(result.image);
  const image = parsedImage.success ? parsedImage.data : null;
  const { url: fetchedUrl, title, imageUrl } = result;
  run.emit({
    type: "link.fetched", latencyMs: elapsed(start), snapshot: { url: fetchedUrl, title, imageUrl: image ? imageUrl : null },
    thumbnail: image ?? undefined,
  });
  return { ...result, image };
}

function emitCheck(run: Run, phase: SelfCheckPhase, area: string, level: number, inspect: () => SelfCheckResult): SelfCheckResult {
  run.stage("selfcheck");
  run.emit({ type: "selfcheck.started", engine: "rules engine", phase });
  const start = performance.now();
  const result = inspect();
  const latencyMs = elapsed(start);
  const { findings, paths, disagreements } = result;
  recordGeminiTranscript({
    stage: "selfcheck", crew: "inspector", engine: "rules engine", latencyMs,
    request: { text: `${phase}: ${area}, level ${level}` },
    response: { json: { findings, paths, disagreements } },
  });
  for (const path of result.paths) run.emit({ type: "selfcheck.path", path, phase });
  run.emit({ type: "selfcheck.done", latencyMs, result, phase });
  return result;
}

async function assessAndBrief(
  run: Run,
  clients: GeminiClients,
  twin: Twin,
  candidate: Asset,
  profile: DeviceProfile,
  reassess: boolean,
): Promise<void> {
  const asDropped = emitCheck(run, "as-dropped", candidate.physical.area, candidate.network.level, () => checkAsDropped(twin, candidate));
  const context = { profile, twin, candidate, reassess, asDropped };
  const onThought = (text: string) => run.emit({ type: "reasoning.thought", text });
  run.stage("reasoning");
  run.emit({ type: "reasoning.started", model: MODEL_IDS.reasoning, candidateArea: candidate.physical.area });
  const reasoningStarted = performance.now();
  const first = await deadline(run, "reasoning", (signal) => assessWithReducedRetry(clients.interactions, context, signal, onThought));
  let passiveModelClaims = first.passiveModelClaims;
  function ground(model: typeof first.value) {
    return groundAssessment(twin, candidate, model, run.id, {
      passive: profile.object_class === "passive_object",
      reviewedPaths: first.reviewedPaths,
      passiveModelClaims,
    });
  }
  let grounded = ground(first.value);
  run.emit({
    type: "reasoning.done", model: MODEL_IDS.reasoning, latencyMs: elapsed(reasoningStarted), assessment: grounded.assessment,
  });

  let reasons: string[] = [];
  function inspect(revised: boolean) {
    const { physical_placement, placement } = grounded.assessment;
    return emitCheck(run, revised ? "post-revision" : "recommendation", physical_placement.area, placement.level, () => {
      const review = reviewRecommendation(twin, candidate, grounded.assessment, grounded.disagreements, revised, profile.object_class === "passive_object");
      reasons = review.revisionReasons;
      return review.result;
    });
  }

  let checked = inspect(false);
  if (reasons.length) {
    run.stage("revision");
    run.emit({ type: "revision.started", model: MODEL_IDS.reasoning, reason: reasons.join(" ") });
    const revisionStarted = performance.now();
    const revised = await deadline(run, "revision", (signal) =>
      revisePlacement(clients.interactions, context, first.value, reasons, signal),
    ).catch((error: unknown) => {
      run.signal.throwIfAborted();
      const note = `Revision could not finish. ${providerFailure(error)}`;
      checked = { ...checked, disagreements: [...checked.disagreements, note] };
      recordGeminiTranscript({ stage: "revision", crew: "architect", engine: MODEL_IDS.reasoning, note });
      return null;
    });
    if (revised) {
      passiveModelClaims ||= revised.passiveModelClaims;
      grounded = ground(revised.value);
      run.emit({
        type: "revision.done", model: MODEL_IDS.reasoning, latencyMs: elapsed(revisionStarted), assessment: grounded.assessment,
      });
      checked = inspect(true);
    }
  } else {
    recordGeminiTranscript({
      stage: "revision", crew: "architect", engine: MODEL_IDS.reasoning,
      note: checked.disagreements.length
        ? "Revision skipped: grounding resolved the recorded disagreements and the check requested no placement change."
        : "Revision skipped: the rules check found no placement change to request.",
    });
  }

  let finalAssessment = grounded.assessment;
  if (!checked.passed) {
    const started = performance.now();
    const held = holdBlockedPlacement(twin, candidate, finalAssessment, checked, profile.object_class === "passive_object");
    if (held) {
      finalAssessment = held.assessment;
      run.emit({ type: "revision.done", model: "rules engine", latencyMs: elapsed(started), assessment: finalAssessment });
      checked = emitCheck(run, "post-revision", finalAssessment.physical_placement.area, finalAssessment.placement.level, held.check);
    }
  }

  const riskStarted = performance.now();
  finalAssessment = completeAssessmentRisks(finalAssessment, profile, candidate, checked);
  recordGeminiTranscript({
    stage: "selfcheck", crew: "inspector", engine: "rules engine", latencyMs: elapsed(riskStarted),
    response: { json: { risks: finalAssessment.risks } },
    note: "Final risk list assembled from the Architect, the final rules check and the device profile.",
  });
  run.stage("summary");
  run.emit({ type: "summary.started", model: MODEL_IDS.chief, assessment: finalAssessment });
  const summaryStarted = performance.now();
  // Chief starts as soon as the final verdict is available, before publishing completion.
  const pendingBriefing = briefEngineerWithinDeadline(clients.interactions, twin, finalAssessment, checked, run.signal, profile);
  run.complete();
  const briefing = await pendingBriefing;
  run.emit({
    type: "summary.done", model: briefing.kind === "ready" ? MODEL_IDS.chief : BRIEFING_STATUS_SOURCE,
    latencyMs: elapsed(summaryStarted), text: briefing.text,
  });
}

type CaptureEvidence = ReturnType<typeof captureEvidence>;

async function admit(run: Run, clients: GeminiClients, evidence: CaptureEvidence): Promise<void> {
  run.stage("gate");
  run.emit({ type: "gate.started", model: MODEL_IDS.decisions });
  const started = performance.now();
  const gate = await deadline(run, "gate", (signal) => gateCapture(clients.decisions, evidence, signal))
    .catch((error: unknown): GateResult => {
      run.signal.throwIfAborted();
      console.warn("[pipeline] gate unavailable", run.id, providerFailure(error));
      recordGeminiTranscript({
        stage: "gate", crew: "gate", engine: MODEL_IDS.decisions,
        note: "Gate unavailable: continued without it",
      });
      return { answers: {}, proceed: true, reason: "Gate unavailable: continued without it" };
    });
  run.emit({ type: "gate.done", model: MODEL_IDS.decisions, latencyMs: elapsed(started), gate });
  if (!gate.proceed) throw new PipelineFailure(gate.reason ?? "Try a capture that shows an identifiable object.");
}

async function scoutCapture(run: Run, clients: GeminiClients, evidence: CaptureEvidence, stop?: AbortSignal) {
  run.emit({ type: "perception.started", model: MODEL_IDS.perception });
  const started = performance.now();
  const profile = await deadline(run, "perception", (signal) =>
    perceive(clients.interactions, evidence, stop ? AbortSignal.any([signal, stop]) : signal),
  );
  return { profile, latencyMs: elapsed(started) };
}

async function captureProfile(run: Run, clients: GeminiClients, input: CaptureInput) {
  if (input.kind === "link") {
    const link = await readLink(run, input.url);
    run.stage("perception");
    const result = await scoutCapture(run, clients, captureEvidence(input, link));
    await admit(run, clients, profileGateEvidence(result.profile));
    return result;
  }
  const evidence = captureEvidence(input);
  const gate = admit(run, clients, evidence);
  const stop = new AbortController();
  const observed = scoutCapture(run, clients, evidence, stop.signal).then(
    (result) => ({ result }),
    (error: unknown) => ({ error }),
  );
  try {
    await gate;
  } catch (error) {
    stop.abort();
    throw error;
  }
  run.stage("perception");
  const outcome = await observed;
  if ("error" in outcome) throw outcome.error;
  return outcome.result;
}

export function runAnalyze(request: AnalyzeRequest, sink: EventSink, signal = new AbortController().signal, options: RunOptions = {}): Promise<void> {
  return execute(sink, signal, options, async (run) => {
    const { twin } = request;
    const dropPoint = resolveDropPoint(twin, request.dropPoint);
    run.emit({
      type: "run.started", mode: "analyze", input: { kind: request.input.kind, label: inputLabel(request.input) }, dropPoint,
    });
    run.stage("perception");
    const input = checkedImages(request.input);
    run.stage("gate");
    const clients = geminiClients();
    const { profile, latencyMs } = await captureProfile(run, clients, input);
    const candidate = assetFromProfile(profile, twin, capturedAssetId(run.id, profile, twin), dropPoint);
    run.emit({ type: "perception.done", model: MODEL_IDS.perception, latencyMs, profile });

    await assessAndBrief(run, clients, twin, candidate, profile, false);
  });
}

function checkedImages(input: CaptureInput): CaptureInput {
  try {
    return normalizeCaptureImages(input);
  } catch (error) {
    if (error instanceof CaptureImageError) throw new PipelineFailure(error.message);
    throw error;
  }
}

export function runReassess(request: ReassessRequest, sink: EventSink, signal = new AbortController().signal): Promise<void> {
  return execute(sink, signal, { completeBeforeBriefing: true }, async (run) => {
    const { twin, profile, assetId, placement } = request;
    const dropPoint: DropPoint = { x: placement.x, y: placement.y, area: placement.area };
    run.emit({ type: "run.started", mode: "reassess", input: { kind: "text", label: `Reassess ${assetId}` }, dropPoint });
    run.stage("reasoning");
    const clients = geminiClients();
    const asset = assetById(twin, assetId);
    if (!asset || asset.origin !== "added") throw new PipelineFailure("The captured device is missing from the plant.");
    const level = placement.level ?? asset.network.level;
    const network = asset.physical.area === dropPoint.area && asset.network.level === level
      ? asset.network
      : { ...asset.network, ...networkAt(twin, dropPoint, asset.physical.kind, level) };
    const moved: Asset = { ...asset, physical: { ...asset.physical, ...dropPoint }, network };
    const candidate = profile.object_class === "passive_object" ? asPassiveObject(twin, moved) : moved;
    const current = { ...twin, assets: twin.assets.map((peer) => peer.id === assetId ? candidate : peer) };
    await assessAndBrief(run, clients, current, candidate, profile, true);
  });
}
