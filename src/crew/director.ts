/** Turns actual pipeline events into shared avatar and activity cues. */
import { MODEL_IDS } from "@/gemini/models";
import type { Assessment, CaptureInput, DropPoint, PipelineEvent, PipelineStage } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { areaById, areaCenter, assetById, clampToArea, containsPoint, nodePosition, type Point } from "@/twin/geometry";
import type { AttackPath, AttackStep, Twin } from "@/twin/types";
import { CREW, type ActivityEntry, type CrewId } from "./types";
import type { WalkStop } from "./walk";

export type CrewStatus = "idle" | "working" | "done" | "error";
export type CrewActivity = Omit<ActivityEntry, "id">;
type Inspection = "as-dropped" | "recommendation";

export interface CrewCue {
  activity: CrewActivity;
  status: CrewStatus;
  stops?: WalkStop[];
  inspect?: Point;
  briefing?: boolean;
  holdMs?: number;
  inspection?: Inspection;
  bubbleText?: string;
}

export type CrewIntent =
  | { kind: "stand" | "complete" | "log" | "thought"; activity: CrewActivity }
  | { kind: "step" | "error"; cue: CrewCue };

interface DirectorState {
  runId: string | null;
  active: boolean;
  reassess: boolean;
  inputKind: CaptureInput["kind"];
  reading: boolean;
  drop: DropPoint;
  recommendation: WalkStop | null;
  gateRejection?: string;
  lastCrew: CrewId;
  lastEngine?: string;
}

export const INITIAL_DIRECTOR: DirectorState = {
  runId: null, active: false, reassess: false, inputKind: "text", reading: false,
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

export function directCrew(state: DirectorState, event: PipelineEvent, twin: Twin): {
  state: DirectorState;
  intent: CrewIntent | null;
} {
  const activity = (crew: CrewId, text: string, engine?: string): CrewActivity => ({
    at: event.at, runId: event.runId, crew, text: event.type === "summary.done" ? text.trim() : clean(text), engine, kind: "pipeline",
    ...("latencyMs" in event ? { latencyMs: event.latencyMs } : {}),
  });

  if (event.type === "run.started") {
    const reassess = event.mode === "reassess";
    const crew = reassess ? "architect" : "scout";
    return {
      state: { ...INITIAL_DIRECTOR, lastCrew: crew, runId: event.runId, active: true, reassess,
        inputKind: event.input.kind, drop: event.dropPoint ?? DEFAULT_DROP },
      intent: { kind: "stand", activity: activity(crew, reassess ? "Reassessment started" : "Analysis started") },
    };
  }
  const standaloneError = event.type === "run.error" && !state.active && event.runId !== state.runId
    && (state.runId === null || event.stage === "unknown");
  if (!standaloneError && (!state.active || state.runId !== event.runId)) return { state, intent: null };

  const step = (crew: CrewId, status: CrewStatus, text: string, engine?: string,
    options: Omit<CrewCue, "activity" | "status"> = {}) => ({
    state: { ...state, lastCrew: crew, lastEngine: engine },
    intent: { kind: "step" as const, cue: { activity: activity(crew, text, engine), status, ...options } },
  });
  const drop: WalkStop = { point: state.drop, area: state.drop.area };
  const inspection: Inspection = state.recommendation ? "recommendation" : "as-dropped";
  const inspectedPlacement = state.recommendation ?? drop;

  switch (event.type) {
    case "link.started":
      return step("scout", "working", "Opening the product page…");
    case "link.fetched":
      return step("scout", "done", `Product page read · ${event.snapshot.title || "link"}`);
    case "gate.started":
      return step("scout", "working", "Taking a first look…", event.model);
    case "gate.done": {
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
      return { ...result, state: { ...gated, lastCrew: "scout", lastEngine: event.model } };
    }
    case "perception.started": {
      const text = state.inputKind === "photo" ? "Reading the label…"
        : state.inputKind === "link" ? "Reading product evidence…" : "Reading the device description…";
      const result = step("scout", "working", text, event.model, { stops: [drop] });
      return { ...result, state: { ...result.state, reading: true } };
    }
    case "perception.done": {
      const evidence = event.profile.evidence.reduce<typeof event.profile.evidence[number] | undefined>(
        (best, item) => !best || item.confidence > best.confidence ? item : best, undefined,
      );
      const claim = evidence?.claim.trim();
      const result = step("scout", "done", claim ? `${event.profile.device_type} · ${claim}` : event.profile.device_type,
        event.model, { bubbleText: event.profile.device_type });
      return { ...result, state: { ...result.state, reading: false } };
    }
    case "reasoning.started": {
      const area = event.candidateArea ? areaById(twin, event.candidateArea) : areaById(twin, state.drop.area);
      const stop = area && !state.reassess ? { point: areaCenter(area), area: area.id } : drop;
      return step("architect", "working", "Checking where this fits…", event.model, { stops: [stop] });
    }
    case "reasoning.thought": {
      const thought = clean(event.text.replace(/^\*\*([^*]+)\*\*\s*/, "$1 · ").replace(/\*\*|`/g, ""));
      return { state, intent: thought ? { kind: "thought", activity: activity("architect", thought, CREW.architect.engine) } : null };
    }
    case "reasoning.done":
    case "revision.done": {
      const recommendation = placementStop(twin, event.assessment, state.drop);
      const { area } = event.assessment.physical_placement;
      const name = areaById(twin, area)?.name ?? area;
      const revised = event.type === "revision.done" ? "Revised · " : "";
      const result = step("architect", "done", `${revised}${name} · Purdue L${event.assessment.placement.level}`,
        event.model, { stops: [recommendation] });
      return { ...result, state: { ...result.state, recommendation } };
    }
    case "selfcheck.started":
      return step("inspector", "working", inspection === "as-dropped" ? "Checking as-dropped placement…" : "Checking the recommendation…",
        event.engine, { stops: [inspectedPlacement], inspection });
    case "selfcheck.path":
      return step("inspector", "working", `${inspection === "as-dropped" ? "As dropped" : "Recommendation"} path · ${event.path.title}`,
        CREW.inspector.engine, { ...pathVisit(twin, event.path, inspectedPlacement), inspection,
          bubbleText: `${inspection === "as-dropped" ? "As dropped" : "Recommendation"} · tracing to ${event.path.target}` });
    case "selfcheck.done": {
      const count = event.result.findings.length;
      const verdict = event.result.passed ? "passed rules check" : count ? `${count} ${count === 1 ? "finding" : "findings"}` : "flagged by rules engine";
      const label = inspection === "as-dropped" ? "As dropped" : "Recommendation";
      return step("inspector", "done", `${label} · ${verdict}`, CREW.inspector.engine, { inspection });
    }
    case "revision.started":
      return step("architect", "working", event.reason ? `Reconsidering · ${event.reason}` : "Reconsidering placement…", event.model,
        { holdMs: 800, bubbleText: "Reconsidering placement…" });
    case "summary.started": {
      const { x, y, w, h } = twin.plant.building;
      return step("chief", "working", "Writing the briefing…", event.model, {
        stops: [{ point: { x: x + w - 32, y: y + h * 0.55 } }],
      });
    }
    case "summary.done":
      return step("chief", "done", event.text, event.model, { briefing: true });
    case "run.error": {
      const { crew, engine } = event.stage === "unknown"
        ? { crew: standaloneError ? "scout" as const : state.lastCrew, engine: standaloneError ? undefined : state.lastEngine }
        : stageOwners[event.stage];
      const message = event.message || "Analysis stopped";
      const text = event.stage === "gate" && state.gateRejection ? `${state.gateRejection} · ${message}` : message;
      return {
        state: { ...state, runId: event.runId, active: false },
        intent: { kind: "error", cue: { activity: activity(crew, text, engine), status: "error" } },
      };
    }
    case "run.completed":
      return {
        state: { ...state, active: false },
        intent: { kind: "complete", activity: activity(state.lastCrew, "Analysis complete") },
      };
  }
}
