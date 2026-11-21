/** Projects original wire events into ordered, addressable steps with explicit provenance. */
import { CREW } from "@/crew/types";
import { MODEL_IDS } from "@/gemini/models";
import type { PipelineEvent, PipelineStage, SelfCheckPhase, TranscriptEntry } from "@/pipeline/types";
import {
  isPipelineRun,
  type OpenTranscript, type TranscriptCrew, type TranscriptObservation, type TranscriptRun,
} from "./transcriptStore";

export interface TranscriptStep extends Omit<TranscriptObservation, "at"> {
  id: string;
  runId: string;
  at?: number;
  event?: PipelineEvent;
  providerRecord?: TranscriptEntry;
  usage?: TranscriptEntry["usage"];
  thinkingLevel?: string;
  revisedFields?: string[];
}

export const CREW_LABEL = { gate: "Decisions gate", system: "Pipeline",
  scout: CREW.scout.name, architect: CREW.architect.name, inspector: CREW.inspector.name, chief: CREW.chief.name };

export const SOURCE_LABEL = {
  capture: "Capture", reassess: "Reassess", watch: "Threat watch",
  modeler: "Twin modeler", simulation: "Simulation", voice: "Voice",
};

export const ORIGIN_LABEL = { model: "MODEL", rules: "rules engine", simulation: "SIMULATION", system: "SYSTEM" };

export const STAGE_LABEL: Record<PipelineStage, string> = {
  link: "Product page", gate: "Decisions gate", perception: "Perception", reasoning: "Reasoning",
  selfcheck: "Placement check", revision: "Revision", summary: "Briefing",
};

const STAGE_CREW: Record<PipelineStage, TranscriptCrew> = {
  link: "scout", gate: "gate", perception: "scout", reasoning: "architect",
  selfcheck: "inspector", revision: "architect", summary: "chief",
};

export const PHASE_LABEL: Record<SelfCheckPhase, string> = {
  "as-dropped": "As dropped", recommendation: "Recommendation", "post-revision": "Post-revision",
};

const TITLES: Record<Exclude<PipelineEvent["type"], "transcript.entry">, string> = {
  "run.started": "Run started", "run.completed": "Run completed", "run.error": "Run error",
  "link.started": "Product page requested", "link.fetched": "Product page received",
  "gate.started": "Decisions gate started", "gate.done": "Calibrated decisions",
  "perception.started": "Device perception started", "perception.done": "Device profile",
  "reasoning.started": "Placement reasoning started", "reasoning.thought": "Thought summary",
  "reasoning.done": "Placement assessment", "selfcheck.started": "Rules check started",
  "selfcheck.path": "Reported attack path", "selfcheck.done": "Rules verdict",
  "revision.started": "Disagreements sent for revision", "revision.done": "Revised assessment",
  "summary.started": "Briefing started", "summary.done": "Engineer briefing",
};

function engineOf(crew: TranscriptCrew): string | undefined {
  if (crew === "gate") return MODEL_IDS.decisions;
  if (crew !== "system") return CREW[crew].engine;
}

export function timestamp(at: number): string {
  const date = new Date(at);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0")).join(":") + "." + String(date.getMilliseconds()).padStart(3, "0");
}

function providerStep(entry: TranscriptEntry, step: Pick<TranscriptStep, "id" | "runId" | "at" | "event">): TranscriptStep {
  return {
    ...step, providerRecord: entry, raw: step.event ?? entry,
    title: `${STAGE_LABEL[entry.stage]} record`, crew: entry.crew, engine: entry.engine,
    origin: entry.crew === "inspector" ? "rules" : entry.stage === "link" ? "system" : "model",
    latencyMs: entry.latencyMs, usage: entry.usage, thinkingLevel: entry.thinkingLevel,
  };
}

function toStep(event: PipelineEvent, index: number): TranscriptStep {
  const id = `${event.runId}:${index}`;
  const base = { id, runId: event.runId, at: event.at, event, raw: event };
  if (event.type === "transcript.entry") return providerStep(event.entry, base);

  const stage = event.type === "run.error" ? event.stage : event.type.split(".", 1)[0];
  const crew = STAGE_CREW[stage as PipelineStage] ?? "system";
  const engine = "model" in event ? event.model : stage === "link" ? undefined : engineOf(crew);
  let origin: TranscriptStep["origin"] = "system";
  if (stage === "selfcheck") origin = "rules";
  else if (engine && engine !== "briefing status" && event.type !== "run.error"
    && (event.type !== "gate.done" || Object.keys(event.gate.answers).length > 0)) origin = "model";
  const phase = "phase" in event && event.phase ? PHASE_LABEL[event.phase] : undefined;
  return {
    ...base, crew, title: phase ? `${TITLES[event.type]} · ${phase}` : TITLES[event.type], origin, engine,
    latencyMs: "latencyMs" in event ? event.latencyMs : event.type === "run.completed" ? event.totalMs : undefined,
  };
}

export function timeline(run: TranscriptRun): TranscriptStep[] {
  if (!isPipelineRun(run)) return run.observations.map((observation, index) => ({
    ...observation, id: `${run.id}:${index}`, runId: run.id,
  }));

  let priorAssessment: Record<string, unknown> | undefined;
  const steps = run.events.map((event, index) => {
    const step = toStep(event, index);
    if (event.type === "reasoning.done") priorAssessment = { ...event.assessment };
    if (event.type === "revision.done" && priorAssessment) {
      const revised = { ...event.assessment } as Record<string, unknown>;
      step.revisedFields = Object.keys(revised)
        .filter((field) => JSON.stringify(revised[field]) !== JSON.stringify(priorAssessment?.[field]));
      priorAssessment = revised;
    }
    return step;
  });

  // Current streams mirror each provider record in both arrays. Older snapshots can lack events.
  const mirrored = steps.flatMap(({ providerRecord }) => providerRecord ? [providerRecord] : []);
  if (mirrored.length >= run.transcript.length) return steps;
  const counts = new Map<string, number>();
  for (const entry of mirrored) {
    const key = JSON.stringify(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  run.transcript.forEach((entry, index) => {
    const key = JSON.stringify(entry);
    const count = counts.get(key) ?? 0;
    if (count) counts.set(key, count - 1);
    else steps.push(providerStep(entry, { id: `${run.id}:record:${index}`, runId: run.id }));
  });
  return steps;
}

export function activityFallback(target: OpenTranscript): TranscriptStep | undefined {
  const { activity } = target;
  if (!activity) return;
  return {
    id: activity.id, runId: activity.runId ?? activity.id, at: activity.at, crew: activity.crew,
    title: activity.kind === "patrol" ? "Idle patrol" : "Activity",
    text: activity.text, engine: activity.engine, latencyMs: activity.latencyMs, raw: activity,
    origin: activity.kind === "sim" ? "simulation" : activity.engine === "rules engine" ? "rules" : "system",
  };
}

export function locateStep(steps: readonly TranscriptStep[], target: OpenTranscript): TranscriptStep | undefined {
  if (target.entryId) return steps.find((step) => step.id === target.entryId);
  if (target.at === undefined) return;
  return steps.find((step) => step.at === target.at
    && (!target.crewId || step.crew === target.crewId)
    && (!target.eventType || step.event?.type === target.eventType));
}

export function includesSearch(step: TranscriptStep, query: string): boolean {
  const time = step.at === undefined ? "" : timestamp(step.at);
  return `${step.title} ${CREW_LABEL[step.crew]} ${step.engine ?? ""} ${step.text ?? ""} ${time} ${JSON.stringify(step.raw) ?? ""}`
    .toLocaleLowerCase().includes(query);
}
