/** Turns actual pipeline events into shared avatar and activity cues. */
import { MODEL_IDS } from "@/gemini/models";
import type { Assessment, DropPoint, PipelineEvent, PipelineStage } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { areaById, areaCenter, assetById, clampToArea, nodePosition, type Point } from "@/twin/geometry";
import type { AttackPath, AttackStep, Twin } from "@/twin/types";
import { CREW, type ActivityEntry, type CrewId } from "./types";
import type { WalkStop } from "./walk";

export type CrewStatus = "idle" | "working" | "done" | "error";
export type CrewActivity = Omit<ActivityEntry, "id">;

export interface CrewCue {
  activity: CrewActivity;
  status: CrewStatus;
  stops?: WalkStop[];
  inspect?: Point;
  briefing?: boolean;
  holdMs?: number;
}

export type CrewIntent =
  | { kind: "stand" | "complete"; activity: CrewActivity }
  | { kind: "step" | "error"; cue: CrewCue };

interface DirectorState {
  runId: string | null;
  active: boolean;
  drop: DropPoint;
  recommendation: WalkStop | null;
  gateRejection?: string;
  lastCrew: CrewId;
  lastEngine?: string;
}

export const INITIAL_DIRECTOR: DirectorState = {
  runId: null, active: false, drop: DEFAULT_DROP, recommendation: null, lastCrew: "scout",
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
  if (near?.physical.area === id) {
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

function pathVisit(twin: Twin, path: AttackPath, recommendation: WalkStop | null) {
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
    const point = nodePosition(twin, id);
    if (point) stops.push({ point, area: assetById(twin, id)?.physical.area });
    else if (id === path.causedBy && recommendation) stops.push(recommendation);
  }
  const target = assetById(twin, path.target);
  const inspect = target && nodePosition(twin, target.id);
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
      state: { ...INITIAL_DIRECTOR, lastCrew: crew, runId: event.runId, active: true, drop: event.dropPoint ?? DEFAULT_DROP },
      intent: { kind: "stand", activity: activity(crew, reassess ? "Reassessment started" : "Analysis started") },
    };
  }
  const standaloneError = event.type === "run.error" && !state.active && event.runId !== state.runId
    && (state.runId === null || event.stage === "unknown");
  if (!standaloneError && (!state.active || state.runId !== event.runId)) return { state, intent: null };

  const step = (crew: CrewId, status: CrewStatus, text: string, engine?: string,
    options: Pick<CrewCue, "stops" | "inspect" | "briefing" | "holdMs"> = {}) => ({
    state: { ...state, lastCrew: crew, lastEngine: engine },
    intent: { kind: "step" as const, cue: { activity: activity(crew, text, engine), status, ...options } },
  });

  switch (event.type) {
    case "link.started":
      return step("scout", "working", "Reading the product page…");
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
      const result = step("scout", "done", `${score}${verdict}${reason}`, event.model, { holdMs: 800 });
      return { ...result, state: { ...result.state, gateRejection: event.gate.proceed ? undefined : `${score}${verdict}` } };
    }
    case "perception.started":
      return step("scout", "working", "Reading the label…", event.model, {
        stops: [{ point: state.drop, area: state.drop.area }],
      });
    case "perception.done": {
      const evidence = event.profile.evidence.reduce<typeof event.profile.evidence[number] | undefined>(
        (best, item) => !best || item.confidence > best.confidence ? item : best, undefined,
      );
      const claim = evidence?.claim.trim();
      return step("scout", "done", claim ? `${event.profile.device_type} · ${claim}` : event.profile.device_type, event.model);
    }
    case "reasoning.started": {
      const area = event.candidateArea ? areaById(twin, event.candidateArea) : areaById(twin, state.drop.area);
      const stop = area ? { point: areaCenter(area), area: area.id } : { point: state.drop, area: state.drop.area };
      return step("architect", "working", "Checking where this fits…", event.model, { stops: [stop] });
    }
    case "reasoning.thought":
      return step("architect", "working", clean(event.text) || "Reviewing placement…", CREW.architect.engine);
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
      return step("inspector", "working", "Checking placement rules…", event.engine, {
        stops: [state.recommendation ?? { point: state.drop, area: state.drop.area }],
      });
    case "selfcheck.path":
      return step("inspector", "working", `Path found: ${event.path.title}`, CREW.inspector.engine,
        { ...pathVisit(twin, event.path, state.recommendation), holdMs: 750 });
    case "selfcheck.done": {
      const count = event.result.findings.length;
      const text = event.result.passed ? "Passed" : `${count} ${count === 1 ? "finding" : "findings"}`;
      return step("inspector", "done", text, CREW.inspector.engine);
    }
    case "revision.started":
      return step("architect", "working", event.reason ? `Reconsidering · ${event.reason}` : "Reconsidering placement…", event.model,
        { holdMs: 800 });
    case "summary.started":
      return step("chief", "working", "Writing the briefing…", event.model);
    case "summary.done": {
      const { x, y, w, h } = twin.plant.building;
      return step("chief", "done", event.text, event.model, {
        stops: [{ point: { x: x + w - 32, y: y + h * 0.55 } }], briefing: true,
      });
    }
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
