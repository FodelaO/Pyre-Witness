/** Consumes live pipeline events and applies the resulting changes to the browser twin. */
import { evaluatePlacement } from "@/rules/engine";
import { assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset, Twin } from "@/twin/types";
import { assetFromProfile, atRecommendedPlacement, capturedAssetId, resolveDropPoint } from "./assetFromProfile";
import { useRunStore } from "./runStore";
import type {
  AnalyzeRequest, Assessment, CaptureInput, DeviceProfile, DropPoint, GateResult, PipelineEvent, ReassessRequest,
} from "./types";

interface CapturedDevice {
  profile: DeviceProfile;
  gate: GateResult | null;
  assessment?: Assessment;
}

interface ActiveRun {
  kind: "analyze" | "reassess";
  controller: AbortController;
  runId: string | null;
  dropPoint: DropPoint | null;
  assetId: string | null;
  failure: string | null;
  finished: Promise<void>;
}

interface QueuedReassess {
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

const captured = new Map<string, CapturedDevice>();
let active: ActiveRun | null = null;
let queued: QueuedReassess | null = null;

class ConnectionFailure extends Error {}

function capturedDevice(assetId: string): CapturedDevice | undefined {
  const cached = captured.get(assetId);
  if (cached) return cached;
  const { placedAssetId, profile, gate, assessment, selfCheck } = useRunStore.getState();
  if (placedAssetId !== assetId || !profile) return undefined;
  const checked = selfCheck && (selfCheck.revised || !selfCheck.disagreements.length);
  const device = { profile, gate, assessment: checked ? assessment ?? undefined : undefined };
  captured.set(assetId, device);
  return device;
}

function cancelQueued(): void {
  if (!queued) return;
  clearTimeout(queued.timer);
  queued.resolve();
  queued = null;
}

function abortActive(): void {
  const run = active;
  active = null;
  if (!run) return;
  run.controller.abort();
  const state = useRunStore.getState();
  if (run.runId && state.runId === run.runId && state.status === "running") {
    state.ingest({ type: "run.error", stage: state.stage ?? "unknown", message: "Analysis canceled.", at: Date.now(), runId: run.runId });
  }
}

function currentMark(twin: Twin, asset: Asset): "unsafe" | "recommended" {
  const { findings } = evaluatePlacement(twin, asset);
  return findings.some((finding) => finding.severity >= 4) ? "unsafe" : "recommended";
}

function ingest(run: ActiveRun, event: PipelineEvent, snapshot: Twin): void {
  if (run.runId !== null && event.runId !== run.runId) {
    throw new ConnectionFailure("The analysis stream changed unexpectedly. Try the capture again.");
  }
  if (run.runId === null && event.type === "run.error") {
    useRunStore.getState().reset();
    useRunStore.setState({ runId: event.runId });
  }
  run.runId = event.runId;
  if (event.type === "run.error") run.failure = event.message;
  useRunStore.getState().ingest(event);
  if (active !== run) return;

  if (event.type === "run.started") {
    run.dropPoint = event.dropPoint;
    if (run.kind === "reassess" && run.assetId) {
      const device = captured.get(run.assetId);
      useRunStore.setState({ placedAssetId: run.assetId, profile: device?.profile ?? null, gate: device?.gate ?? null });
    }
  }
  if (event.type === "perception.done") {
    const id = capturedAssetId(event.runId);
    if (assetById(useTwinStore.getState().twin, id)) {
      throw new ConnectionFailure("The plant already contains this device tag. Start a new capture.");
    }
    const asset = assetFromProfile(event.profile, snapshot, id, resolveDropPoint(snapshot, run.dropPoint));
    captured.set(id, { profile: event.profile, gate: useRunStore.getState().gate });
    run.assetId = id;
    useTwinStore.getState().addAsset(asset);
    useRunStore.getState().setPlacedAsset(id);
  }
  if (event.type === "selfcheck.done" && run.assetId) {
    const store = useTwinStore.getState();
    const asset = assetById(store.twin, run.assetId);
    if (!asset) return;
    const placement = currentMark(store.twin, asset);
    if (asset.placement !== placement) store.updateAsset(asset.id, (item) => ({ ...item, placement }));
    if (!event.result.revised && event.result.disagreements.length) return;
    const assessment = useRunStore.getState().assessment;
    const device = captured.get(asset.id);
    if (assessment && device) {
      device.assessment = assessment;
      store.proposeMitigations(assessment.mitigations.map((item) => ({ ...item, status: "proposed" })));
    }
  }
}

function eventFromFrame(frame: string): PipelineEvent | null {
  const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart()).join("\n");
  if (!data) return null;
  const event: PipelineEvent = JSON.parse(data);
  if (!event || typeof event.type !== "string" || typeof event.runId !== "string" || typeof event.at !== "number") {
    throw new ConnectionFailure("The server sent an invalid analysis event. Try again.");
  }
  return event;
}

async function consume(run: ActiveRun, request: AnalyzeRequest | ReassessRequest): Promise<void> {
  const response = await fetch(`/api/${run.kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(request),
    signal: run.controller.signal,
  });
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new ConnectionFailure("Could not open the analysis stream. Try again.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (active === run && !run.controller.signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done || active !== run) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = /\r?\n\r?\n/.exec(buffer);
      while (boundary && active === run) {
        const event = eventFromFrame(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (event) {
          ingest(run, event, request.twin);
          if (event.type === "run.completed" || event.type === "run.error") return;
        }
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
    }
    if (active === run) throw new ConnectionFailure("The analysis stream closed before the run finished. Try again.");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function startRun(kind: ActiveRun["kind"], request: AnalyzeRequest | ReassessRequest): Promise<void> {
  abortActive();
  const run: ActiveRun = {
    kind, controller: new AbortController(), runId: null, dropPoint: null, failure: null,
    assetId: "assetId" in request ? request.assetId : null,
    finished: Promise.resolve(),
  };
  active = run;
  run.finished = consume(run, request).catch((error: unknown) => {
    if (active !== run || run.controller.signal.aborted) return;
    const state = useRunStore.getState();
    const stage = run.runId === state.runId ? state.stage ?? "unknown" : "unknown";
    const message = error instanceof ConnectionFailure ? error.message : "Could not finish reading the analysis. Try again.";
    ingest(run, {
      type: "run.error", stage, at: Date.now(), runId: run.runId ?? `local-${Date.now()}`,
      message,
    }, request.twin);
  }).finally(() => {
    if (active === run) active = null;
  });
  return run.finished.then(() => {
    if (run.failure && !run.controller.signal.aborted) throw new ConnectionFailure(run.failure);
  });
}

/** Run the full analysis against the twin at the moment the engineer submits the capture. */
export async function analyze(input: CaptureInput, dropPoint?: DropPoint | null): Promise<void> {
  cancelQueued();
  await startRun("analyze", { input, twin: useTwinStore.getState().twin, dropPoint });
}

/** Coalesce drag events and reassess only the latest location, after any initial capture. */
export async function reassessAsset(assetId: string): Promise<void> {
  if (!capturedDevice(assetId)) return;
  cancelQueued();
  if (active?.kind === "reassess") abortActive();
  await new Promise<void>((resolve, reject) => {
    const ticket: QueuedReassess = {
      resolve,
      timer: setTimeout(async () => {
        try {
          if (active?.kind === "analyze") await active.finished;
          if (queued !== ticket) return;
          queued = null;
          const twin = useTwinStore.getState().twin;
          const asset = assetById(twin, assetId);
          const device = captured.get(assetId);
          if (asset?.origin !== "added" || !device) return;
          const { area, x, y } = asset.physical;
          await startRun("reassess", {
            twin, assetId, profile: device.profile, placement: { area, x, y, level: asset.network.level },
          });
        } catch (error) {
          reject(error);
        } finally {
          resolve();
        }
      }, 250),
    };
    queued = ticket;
  });
}

/** Move an added device to the placement the Architect recommended. */
export function moveToRecommended(assetId: string): void {
  const store = useTwinStore.getState();
  const asset = assetById(store.twin, assetId);
  const assessment = capturedDevice(assetId)?.assessment;
  if (asset?.origin !== "added" || !assessment) return;
  const next = atRecommendedPlacement(store.twin, asset, assessment);
  if (next) {
    const placement = currentMark(store.twin, next);
    store.updateAsset(assetId, () => ({ ...next, placement }));
  }
}

/** Abort the in-flight run, if any. */
export function cancelRun(): void {
  cancelQueued();
  const wasRunning = useRunStore.getState().status === "running";
  abortActive();
  if (wasRunning) useRunStore.getState().reset();
}
