/** Turns actual pipeline events into shared avatar and activity cues. */
import { MODEL_IDS } from "@/gemini/models";
import type { Assessment, CaptureInput, DeviceProfile, DropPoint, PipelineEvent, PipelineStage, SelfCheckPhase } from "@/pipeline/types";
import { assetFromProfile, capturedAssetId, resolveDropPoint } from "@/pipeline/assetFromProfile";
import { rankPlacements } from "@/rules/engine";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { areaById, areaCenter, assetById, clampToArea, containsPoint, nodePosition, type Point } from "@/twin/geometry";
import type { AreaId, AttackPath, AttackStep, Twin } from "@/twin/types";
import { CREW, type ActivityEntry, type CrewId } from "./types";
import type { WalkStop } from "./walk";

export type CrewStatus = "idle" | "working" | "done" | "error";
export type CrewActivity = Omit<ActivityEntry, "id"> & {
  eventType?: PipelineEvent["type"];
  transcriptEntryId?: string;
  attention?: true;
};

export interface EvidenceChip {
  kind: string;
  text: string;
}

export type CrewVisual =
  | { kind: "capture" }
  | { kind: "evidence"; chips: EvidenceChip[]; drop: Point; device: string }
  | { kind: "ranked"; areas: AreaId[] }
  | { kind: "proposal"; from: Point; to: Point; area: AreaId }
  | { kind: "trace"; id: string; phase: SelfCheckPhase }
  | { kind: "check"; at: Point; passed: boolean; stamps: { point: Point; ruleId: string; assetId: string }[]; phase: SelfCheckPhase };

export interface CrewCue {
  activity: CrewActivity;
  status: CrewStatus;
  stops?: WalkStop[];
  inspect?: Point;
  briefing?: boolean;
  holdMs?: number;
  inspection?: SelfCheckPhase;
  visual?: CrewVisual;
  handoffFrom?: CrewId;
  bubbleText?: string;
}

export type CrewIntent =
  | { kind: "stand" | "complete" | "log" | "thought"; activity: CrewActivity }
  | { kind: "step" | "error"; cue: CrewCue };

interface DirectorState {
  runId: string | null;
  active: boolean;
  awaitingBriefing: boolean;
  reassess: boolean;
  inputKind: CaptureInput["kind"];
  reading: boolean;
  drop: DropPoint;
  recommendation: WalkStop | null;
  gateRejection?: string;
  lastCrew: CrewId;
  lastEngine?: string;
  profile?: DeviceProfile;
  lastCompleted?: CrewId;
}

export const INITIAL_DIRECTOR: DirectorState = {
  runId: null, active: false, awaitingBriefing: false, reassess: false, inputKind: "text", reading: false,
  drop: DEFAULT_DROP, recommendation: null, lastCrew: "scout",
};

const stageOwners: Record<PipelineStage, { crew: CrewId; engine?: string }> = {
  link: { crew: "scout" },
  gate: { crew: "scout", engine: MODEL_IDS.decisions },
  perception: { crew: "scout", engine: CREW.scout.engine },
  reasoning: { crew: "architect", engine: CREW.architect.engine },
  selfcheck: { crew: "inspector", engine: CREW.inspector.engine },
  revision: { crew: "architect", engine: CREW.architect.engine },
  summary: { crew: "chief", engine: CREW.chief.engine },
};

function clean(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function evidenceChips(profile: DeviceProfile): EvidenceChip[] {
  return [
    ...profile.evidence.flatMap(({ source, claim }) => claim.trim() ? [{ kind: source.replace("_", " "), text: clean(claim) }] : []),
    ...profile.ports.map((text) => ({ kind: "port", text })),
    ...profile.radios.map((text) => ({ kind: "radio", text })),
  ];
}

function thoughtLine(text: string): string {
  return clean(text.replace(/^\*\*([^*]+)\*\*\s*/, "$1 · ")
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*] |\d+\. )\s*/gm, "")
    .replace(/[`*~]|_{1,2}(?=\S)|(?<=\S)_{1,2}/g, ""));
}

const phaseLabel: Record<SelfCheckPhase, string> = {
  "as-dropped": "As dropped", recommendation: "Recommendation", "post-revision": "Post-revision",
};

function placementStop(twin: Twin, assessment: Assessment, drop: DropPoint): WalkStop {
  const { area: id, near_asset_id: nearId } = assessment.physical_placement;
  const area = areaById(twin, id);
  if (!area) return { point: drop, area: drop.area };
  const near = nearId ? assetById(twin, nearId) : undefined;
  if (near && containsPoint(area, near.physical.x, near.physical.y)) {
    return { point: clampToArea(area, near.physical.x, near.physical.y), area: id, beside: true };
  }
  return { point: areaCenter(area), area: id };
}

function conduitEnforcer(twin: Twin, step: AttackStep): string | null {
  if (step.via !== "network" && step.via !== "internet" && step.via !== "remote") return null;
  const from = assetById(twin, step.from)?.network;
  const to = assetById(twin, step.to)?.network;
  const fromZone = from?.area ?? (step.from === "internet" ? "Internet / Cloud" : undefined);
  if (!fromZone || !to || fromZone === to.area) return null;
  const matches = twin.conduits.filter((conduit) =>
    (conduit.from === fromZone && conduit.to === to.area) || (conduit.to === fromZone && conduit.from === to.area),
  );
  const conduit = matches.find(({ id }) => id === from?.conduit || id === to.conduit)
    ?? (matches.length === 1 ? matches[0] : undefined);
  return conduit?.enforcedBy ?? null;
}

function pathVisit(twin: Twin, path: AttackPath, placement: WalkStop) {
  const nodes: string[] = [];
  const add = (id: string) => { if (nodes.at(-1) !== id) nodes.push(id); };
  add(path.entry);
  for (const step of path.steps) {
    add(step.from);
    const enforcer = conduitEnforcer(twin, step);
    if (enforcer && enforcer !== step.to) add(enforcer);
    add(step.to);
  }
  add(path.target);
  const stops: WalkStop[] = [];
  for (const id of nodes) {
    if (id === path.causedBy) stops.push(placement);
    else {
      const point = nodePosition(twin, id);
      if (point) stops.push({ point, area: assetById(twin, id)?.physical.area });
    }
  }
  const target = assetById(twin, path.target);
  const inspect = path.causedBy === path.target ? placement.point : target && nodePosition(twin, target.id);
  if (inspect && stops.length) stops[stops.length - 1] = { ...stops[stops.length - 1], beside: true };
  return { stops, inspect };
}

export function directCrew(state: DirectorState, event: PipelineEvent, twin: Twin, existingAssetId?: string | null): {
  state: DirectorState;
  intent: CrewIntent | null;
} {
  const activity = (crew: CrewId, text: string, engine?: string): CrewActivity => ({
    at: event.at, runId: event.runId, eventType: event.type, crew, text: event.type === "summary.done" ? text.trim() : clean(text), engine, kind: "pipeline",
    ...("latencyMs" in event ? { latencyMs: event.latencyMs } : {}),
  });

  if (event.type === "run.started") {
    const reassess = event.mode === "reassess";
    const crew = reassess ? "architect" : "scout";
    return {
      state: { ...INITIAL_DIRECTOR, lastCrew: crew, runId: event.runId, active: true, reassess,
        inputKind: event.input.kind, drop: resolveDropPoint(twin, event.dropPoint) },
      intent: { kind: "stand", activity: activity(crew, reassess ? "Reassessment started" : "Analysis started") },
    };
  }
  const standaloneError = event.type === "run.error" && !state.active && event.runId !== state.runId
    && (state.runId === null || event.stage === "unknown");
  const lateBriefing = event.type === "summary.done" && state.awaitingBriefing;
  if (!standaloneError && (state.runId !== event.runId || (!state.active && !lateBriefing))) return { state, intent: null };

  const step = (crew: CrewId, status: CrewStatus, text: string, engine?: string,
    { attention, ...options }: Omit<CrewCue, "activity" | "status"> & { attention?: true } = {}) => ({
    state: { ...state, lastCrew: crew, lastEngine: engine,
      lastCompleted: status === "done" ? crew : event.type.endsWith(".started") ? undefined : state.lastCompleted },
    intent: { kind: "step" as const, cue: { activity: { ...activity(crew, text, engine), ...(attention && { attention }) }, status, ...options,
      handoffFrom: event.type.endsWith(".started") && state.lastCompleted !== crew ? state.lastCompleted : undefined } },
  });
  const drop: WalkStop = { point: state.drop, area: state.drop.area };
  const inspection = ("phase" in event ? event.phase : undefined) ?? (state.recommendation ? "recommendation" : "as-dropped");
  const inspectedPlacement = inspection === "as-dropped" ? drop : state.recommendation ?? drop;

  switch (event.type) {
    case "link.started":
      return step("scout", "working", "Opening the product page…");
    case "link.fetched":
      return step("scout", "done", `Product page read · ${event.snapshot.title || "link"}`);
    case "gate.started":
      return step("scout", "working", "Taking a first look…", event.model);
    case "gate.done": {
      if (event.gate.proceed && /^(?:Decisions )?Gate unavailable\b/i.test(event.gate.reason ?? "")) {
        return step("scout", state.reading ? "working" : "done", "Gate unavailable: continued", event.model,
          { attention: true, holdMs: 1400 });
      }
      const device = Object.entries(event.gate.answers).find(([key, answer]) =>
        /device/i.test(key) && answer.type === "noul" && typeof answer.value === "number" && Number.isFinite(answer.value),
      )?.[1];
      const verdict = event.gate.proceed ? "Gate passed" : "Gate stopped";
      const score = typeof device?.value === "number" ? `Device? ${device.value.toFixed(2)} · ` : "";
      const reason = !event.gate.proceed && event.gate.reason ? ` · ${event.gate.reason}` : "";
      const text = `${score}${verdict}${reason}`;
      const gated = { ...state, gateRejection: event.gate.proceed ? undefined : `${score}${verdict}` };
      if (state.reading) return { state: gated, intent: { kind: "log", activity: activity("scout", text, event.model) } };
      const result = step("scout", "done", text, event.model, { holdMs: 800 });
      return { ...result, state: { ...result.state, gateRejection: gated.gateRejection } };
    }
    case "perception.started": {
      const text = state.inputKind === "photo" ? "Reading the label…"
        : state.inputKind === "link" ? "Reading product evidence…" : "Reading the device description…";
      const result = step("scout", "working", text, event.model,
        { stops: [{ ...drop, beside: true, clearance: "device" }], visual: { kind: "capture" } });
      return { ...result, state: { ...result.state, reading: true } };
    }
    case "perception.done": {
      const evidence = event.profile.evidence.reduce<typeof event.profile.evidence[number] | undefined>(
        (best, item) => !best || item.confidence > best.confidence ? item : best, undefined,
      );
      const claim = evidence?.claim.trim();
      const device = assetFromProfile(event.profile, twin, capturedAssetId(event.runId, event.profile, twin), state.drop);
      const result = step("scout", "done", claim ? `${event.profile.device_type} · ${claim}` : event.profile.device_type,
        event.model, { stops: [{ ...drop, beside: true, clearance: "device", device }], bubbleText: event.profile.device_type, visual: {
          kind: "evidence", chips: evidenceChips(event.profile), drop: state.drop, device: event.profile.device_type,
        } });
      return { ...result, state: { ...result.state, reading: false, profile: event.profile } };
    }
    case "reasoning.started": {
      const area = event.candidateArea ? areaById(twin, event.candidateArea) : areaById(twin, state.drop.area);
      const stop = area && !state.reassess ? { point: areaCenter(area), area: area.id } : drop;
      const provisionalId = existingAssetId ?? capturedAssetId(event.runId, state.profile, twin);
      const candidate = assetById(twin, provisionalId)
        ?? (state.profile && assetFromProfile(state.profile, twin, provisionalId, state.drop));
      const areas = candidate ? [...new Set(rankPlacements(twin, candidate).map(({ area }) => area))].slice(0, 3) : [];
      return step("architect", "working", "Checking where this fits…", event.model, { stops: [stop],
        ...(areas.length ? { visual: { kind: "ranked", areas } } : {}) });
    }
    case "reasoning.thought": {
      const thought = thoughtLine(event.text);
      return { state, intent: thought ? { kind: "thought", activity: activity("architect", thought, CREW.architect.engine) } : null };
    }
    case "reasoning.done":
    case "revision.done": {
      const recommendation = placementStop(twin, event.assessment, state.drop);
      const { area } = event.assessment.physical_placement;
      const name = areaById(twin, area)?.name ?? area;
      const revised = event.type === "revision.done" ? "Revised · " : "";
      const result = step("architect", "done", `${revised}${name} · Purdue L${event.assessment.placement.level}`,
        event.model, { stops: [recommendation], visual: { kind: "proposal", from: state.drop, to: recommendation.point, area } });
      return { ...result, state: { ...result.state, recommendation } };
    }
    case "selfcheck.started":
      return step("inspector", "working", inspection === "as-dropped" ? "Checking as-dropped placement…"
        : inspection === "post-revision" ? "Checking revised placement…" : "Checking the recommendation…",
        event.engine, { stops: [{ ...inspectedPlacement, beside: true }], inspection });
    case "selfcheck.path":
      return step("inspector", "working", `${phaseLabel[inspection]} path · ${event.path.title}`,
        CREW.inspector.engine, { ...pathVisit(twin, event.path, inspectedPlacement), inspection,
          visual: { kind: "trace", id: event.path.id, phase: inspection },
          bubbleText: `${phaseLabel[inspection]} · tracing to ${event.path.target}` });
    case "selfcheck.done": {
      const { findings, passed } = event.result;
      const count = findings.length;
      const verdict = count ? `${count} ${count === 1 ? "finding" : "findings"}` : passed ? "passed rules check" : "flagged by rules engine";
      const provisionalId = existingAssetId ?? capturedAssetId(event.runId, state.profile, twin);
      const stamps = findings.flatMap(({ assetId, ruleId }) => {
        const point = assetId === provisionalId ? inspectedPlacement.point : nodePosition(twin, assetId);
        return point ? [{ assetId, ruleId, point }] : [];
      });
      return step("inspector", "done", `${phaseLabel[inspection]} · ${verdict}`, CREW.inspector.engine, { inspection, holdMs: 650,
        visual: { kind: "check", at: inspectedPlacement.point, passed: passed && count === 0, stamps, phase: inspection } });
    }
    case "revision.started":
      return step("architect", "working", event.reason ? `Reconsidering · ${event.reason}` : "Reconsidering placement…", event.model,
        { holdMs: 800, bubbleText: "Reconsidering placement…" });
    case "summary.started": {
      const { x, y, w, h } = twin.plant.building;
      const result = step("chief", "working", "Writing the briefing…", event.model, {
        stops: [{ point: { x: x + w - 32, y: y + h * 0.55 } }],
      });
      return { ...result, state: { ...result.state, awaitingBriefing: true } };
    }
    case "summary.done": {
      const result = step("chief", "done", event.text, event.model, { briefing: true });
      return { ...result, state: { ...result.state, awaitingBriefing: false } };
    }
    case "run.error": {
      const { crew, engine } = event.stage === "unknown"
        ? { crew: standaloneError ? "scout" as const : state.lastCrew, engine: standaloneError ? undefined : state.lastEngine }
        : stageOwners[event.stage];
      const message = event.message || "Analysis stopped";
      const text = event.stage === "gate" && state.gateRejection ? `${state.gateRejection} · ${message}` : message;
      return {
        state: { ...state, runId: event.runId, active: false, awaitingBriefing: false },
        intent: { kind: "error", cue: { activity: activity(crew, text, engine), status: "error" } },
      };
    }
    case "transcript.entry":
      // Full-fidelity call records feed the transcript view; they do not move the crew.
      return { state, intent: null };
    case "run.completed":
      return {
        state: { ...state, active: false },
        intent: { kind: "complete", activity: activity(state.lastCrew, "Analysis complete") },
      };
  }
}
