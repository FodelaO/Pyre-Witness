/** Connects the pipeline bus to the feed and plays movement cues without producing pipeline events. */
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { pipelineBus } from "@/pipeline/bus";
import { useRunStore } from "@/pipeline/runStore";
import type { PipelineEvent, SelfCheckPhase } from "@/pipeline/types";
import { areaById, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { directCrew, INITIAL_DIRECTOR, type CrewCue, type CrewStatus, type CrewVisual } from "./director";
import { appendActivity } from "./feedStore";
import { deskPosition } from "./officeLayout";
import { CREW, CREW_ORDER, type CrewId } from "./types";
import { planWalk, type WalkStop } from "./walk";
import { timeWalk, walkPosition, walksConflict, type TimedWalk } from "./walkTiming";

export interface Speech {
  text: string;
  kind: "step" | "inspection" | "thought" | "briefing" | "patrol";
  attention?: true;
}

export interface AvatarState {
  point: Point;
  status: CrewStatus;
  walking: boolean;
  walk?: TimedWalk;
  speech: Speech | null;
  speechEngine?: string;
  speechStartedAt?: number | null;
  speechLatencyMs?: number;
  speechInspection?: SelfCheckPhase;
  inspect?: Point;
}

type Phase = "idle" | "running" | "finishing" | "returning" | "error";
type Appearance = Omit<AvatarState, "point" | "walking" | "walk">;
type Job = Pick<CrewCue, "stops" | "holdMs" | "visual"> & { appearance?: Appearance; after?: Job; finished?: boolean };
interface LiveStatus {
  message: string;
  engine: string;
  startedAt: number | null;
  latencyMs?: number;
  status: CrewStatus;
  attention?: true;
}
export interface DisplayedVisual {
  effect: CrewVisual;
  at: number;
  walk?: TimedWalk;
}
export interface Handoff {
  id: number;
  from: Point;
  to: Point;
  crew: CrewId;
  fromCrew: CrewId;
}
type ActiveWalk = TimedWalk & { arrival?: Appearance; job: Job };
const INSPECTION_WALK_MS = 1100;
const INSPECTION_STOP_MS = 160;

function perCrew<T>(make: (crew: CrewId) => T): Record<CrewId, T> {
  return { scout: make("scout"), architect: make("architect"), inspector: make("inspector"), chief: make("chief") };
}

const readTwin = () => useTwinStore.getState().twin;
function toOffice(crew: CrewId): WalkStop {
  const twin = readTwin();
  return { point: deskPosition(crew, twin.plant.building, areaById(twin, "crew_office")), area: "crew_office" };
}

const atDesk = (crew: CrewId): AvatarState => ({ point: toOffice(crew).point, status: "idle", walking: false, speech: null });
const atRest = (crew: CrewId): LiveStatus => ({ message: "At desk", engine: CREW[crew].engine, startedAt: null, status: "idle" });
const restStatus = perCrew(atRest);
type CrewAvatars = Partial<Record<CrewId, AvatarState>>;
type CrewLive = Partial<Record<CrewId, LiveStatus>>;

export const useCrewStore = create<{
  phase: Phase;
  avatars: CrewAvatars;
  live: CrewLive;
  visuals: Record<CrewId, DisplayedVisual | null>;
  handoffs: Handoff[];
  dismissBriefing: () => void;
}>(() => ({
  phase: "idle",
  avatars: perCrew(atDesk),
  live: restStatus,
  visuals: perCrew(() => null),
  handoffs: [],
  dismissBriefing: () => {
    if (crewAvatar("chief").speech?.kind !== "briefing") return;
    setAvatar("chief", { speech: null });
    queueOffice("chief");
    play(performance.now());
  },
}));

export function crewAvatar(crew: CrewId, avatars: CrewAvatars | undefined = useCrewStore.getState().avatars): AvatarState {
  return avatars?.[crew] ?? atDesk(crew);
}

export function crewLive(crew: CrewId, live: CrewLive | undefined = useCrewStore.getState().live): LiveStatus {
  return live?.[crew] ?? restStatus[crew];
}

export function crewPosition(crew: CrewId, now = performance.now()): Point {
  const avatar = crewAvatar(crew);
  return avatar.walk ? walkPosition(avatar.walk, now) : avatar.point;
}

function showVisual(crew: CrewId, effect: CrewVisual | null, at: number, walk?: TimedWalk) {
  useCrewStore.setState(({ visuals }) => ({ visuals: { ...visuals, [crew]: effect ? { effect, at, walk } : null } }));
}

const moving = new Map<CrewId, ActiveWalk>();
const queue = perCrew<Job[]>(() => []);
const heldUntil = perCrew(() => 0);
const seen = new WeakSet<PipelineEvent>();
let director = INITIAL_DIRECTOR;
let dropReview: Job | undefined;
let latestProposal: Job | undefined;
let recommendationReview: Job | undefined;
let motionTimer: number | null = null;
let handoffId = 0;
let returnTimer: number | null = null;
let preference: MediaQueryList | undefined;
let visibleConsumers = 0;
let disconnect: (() => void) | undefined;

function setAvatar(crew: CrewId, patch: Partial<AvatarState>): void {
  useCrewStore.setState(({ avatars }) => ({ avatars: { ...avatars, [crew]: { ...crewAvatar(crew, avatars), ...patch } } }));
}

function finishArrivals(now: number, instant: boolean): void {
  for (const [crew, walk] of moving) {
    if (!instant && now < walk.end.at) continue;
    setAvatar(crew, { ...walk.arrival, walking: false, walk: undefined, point: walk.end.point });
    const { inspect, speech } = crewAvatar(crew);
    if (!instant && inspect) {
      const pause = speech?.kind === "inspection" ? INSPECTION_STOP_MS : 500;
      heldUntil[crew] = Math.max(heldUntil[crew], now + pause);
    }
    walk.job.finished = true;
    moving.delete(crew);
  }
}

function clearMotion(now: number): void {
  const positions = perCrew((crew) => crewPosition(crew, now));
  moving.clear();
  if (motionTimer !== null) window.clearTimeout(motionTimer);
  if (returnTimer !== null) window.clearTimeout(returnTimer);
  motionTimer = null;
  returnTimer = null;
  dropReview = latestProposal = recommendationReview = undefined;
  for (const crew of CREW_ORDER) {
    queue[crew].length = 0;
    heldUntil[crew] = 0;
  }
  useCrewStore.setState({
    avatars: perCrew((crew) => ({ point: positions[crew], status: "idle", walking: false, speech: null })),
    visuals: perCrew(() => null),
    handoffs: [],
  });
}

function startJob(crew: CrewId, job: Job, now: number, instant: boolean, visit = false): boolean {
  if (job.after && !job.after.finished) return false;
  const { avatars } = useCrewStore.getState();
  const from = crewAvatar(crew, avatars).point;
  let walk: TimedWalk | undefined;
  if (job.stops?.length) {
    const occupied = CREW_ORDER.filter((other) => other !== crew)
      .map((other) => moving.get(other)?.end.point ?? crewAvatar(other, avatars).point);
    const route = planWalk(readTwin(), from, job.stops, occupied);
    if (!route && (moving.size || visit)) return false;
    if (route) {
      const quickReview = job.appearance?.speech?.kind === "inspection";
      walk = timeWalk(route, now, instant, quickReview ? INSPECTION_WALK_MS : undefined);
      const candidate = walk;
      if ([...moving.values()].some((other) => walksConflict(candidate, other, now))) return false;
    }
  }
  const walking = !!walk && walk.end.at > now;
  const appearance = !walk && job.stops?.length && job.appearance ? { ...job.appearance, inspect: undefined } : job.appearance;
  const arrival = walking && appearance?.speech?.kind === "briefing" ? appearance : undefined;
  if (walk && walking) moving.set(crew, { ...walk, arrival, job });
  else job.finished = true;
  if (job === latestProposal && crewAvatar("inspector", avatars).status === "done") setAvatar("inspector", { speech: null });
  if (job === latestProposal && crewAvatar("scout", avatars).status === "done") setAvatar("scout", { speech: null });
  if (appearance?.speech?.kind === "briefing") {
    for (const id of CREW_ORDER) {
      if (id !== crew && crewAvatar(id, avatars).speech) setAvatar(id, { speech: null });
    }
  }
  setAvatar(crew, {
    ...(arrival ? { speech: null } : appearance),
    ...(walk ? { point: walking ? from : walk.end.point, walking, walk: walking ? walk : undefined } : {}),
  });
  if (job.visual?.kind === "trace" || job.visual?.kind === "check") showVisual(crew, job.visual, now, walk);
  else if (crew === "inspector" && job.appearance?.speech?.kind === "inspection") showVisual(crew, null, now);
  heldUntil[crew] = now + (instant ? 0 : job.holdMs ?? 0);
  return true;
}

function finishWalks(now: number, instant: boolean): void {
  let progressed: boolean;
  do {
    progressed = false;
    for (const crew of CREW_ORDER) {
      while (queue[crew].length && !moving.has(crew) && (instant || heldUntil[crew] <= now)) {
        if (!startJob(crew, queue[crew][0], now, instant)) break;
        queue[crew].shift();
        progressed = true;
      }
    }
  } while (progressed);
  if (moving.size || CREW_ORDER.some((crew) => queue[crew].length)) return;
  const { phase } = useCrewStore.getState();
  if (phase === "returning") useCrewStore.setState({ phase: "idle" });
  if ((phase === "finishing" || phase === "error") && returnTimer === null) {
    returnTimer = window.setTimeout(() => {
      returnTimer = null;
      useCrewStore.setState({ phase: "returning" });
      for (const crew of CREW_ORDER) {
        if (crew !== "chief" || (!director.awaitingBriefing && crewAvatar("chief").speech?.kind !== "briefing")) queueOffice(crew);
      }
      play(performance.now());
    }, phase === "error" ? 6000 : 3200);
  }
}

function play(now: number, replay = false): void {
  const instant = replay || document.hidden || !!preference?.matches;
  if (motionTimer !== null) window.clearTimeout(motionTimer);
  motionTimer = null;
  finishArrivals(now, instant);
  finishWalks(now, instant);
  const next = Math.min(
    ...[...moving.values()].map(({ end }) => end.at),
    ...CREW_ORDER
      .filter((crew) => queue[crew].length && !moving.has(crew) && heldUntil[crew] > now)
      .map((crew) => heldUntil[crew]),
  );
  if (!Number.isFinite(next)) return;
  motionTimer = window.setTimeout(() => {
    motionTimer = null;
    play(performance.now());
  }, Math.max(1, Math.ceil(next - performance.now())));
}

function cueJob(cue: CrewCue, kind: Speech["kind"] = cue.briefing ? "briefing" : cue.inspection ? "inspection" : "step"): Job {
  const { activity } = cue;
  const current = crewLive(activity.crew);
  return {
    stops: cue.stops, holdMs: cue.holdMs, visual: cue.visual,
    appearance: {
      status: cue.status, inspect: cue.inspect,
      speech: { text: cue.bubbleText ?? activity.text, kind, ...(activity.attention && { attention: activity.attention }) },
      speechEngine: activity.engine ?? (activity.eventType?.startsWith("link.") ? "product page fetch" : undefined),
      speechStartedAt: cue.status === "working" && !activity.attention ? current.startedAt : null,
      speechLatencyMs: activity.latencyMs,
      speechInspection: cue.inspection,
    },
  };
}

function finishInspectionClock(cue: CrewCue): void {
  function recorded(appearance: Appearance): Partial<Appearance> | undefined {
    if (appearance.speech?.kind !== "inspection" || appearance.speechInspection !== cue.inspection
      || appearance.status !== "working") return;
    return {
      speech: { ...appearance.speech, text: appearance.speech.text.replace(/^Checking /, "Reviewing ") },
      speechStartedAt: null,
      speechLatencyMs: cue.activity.latencyMs,
    };
  }
  const current = recorded(crewAvatar("inspector"));
  if (current) setAvatar("inspector", current);
  for (const job of queue.inspector) {
    if (!job.appearance) continue;
    const patch = recorded(job.appearance);
    if (patch) job.appearance = { ...job.appearance, ...patch };
  }
}

function updateLive(cue: CrewCue, event: PipelineEvent): void {
  const { crew, text, engine, latencyMs, attention } = cue.activity;
  useCrewStore.setState(({ live }) => {
    const current = crewLive(crew, live);
    return {
      live: { ...live, [crew]: {
        message: cue.briefing ? "Briefing ready" : cue.bubbleText ?? text,
        engine: engine ?? (event.type.startsWith("link.") ? "product page fetch" : CREW[crew].engine),
        status: cue.status,
        startedAt: cue.status !== "working" ? null : event.type.endsWith(".started") ? event.at : current.startedAt,
        latencyMs: latencyMs ?? current.latencyMs,
        attention,
      } },
    };
  });
}

function queueOffice(crew: CrewId): void {
  queue[crew].push({ stops: [toOffice(crew)], appearance: { status: "idle", speech: null, inspect: undefined } });
}

function onEvent(event: PipelineEvent, replay = false): void {
  if (seen.has(event)) return;
  seen.add(event);
  const lateBriefing = event.type === "summary.done" && !director.active;
  const { state, intent } = directCrew(director, event, readTwin(), useRunStore.getState().placedAssetId);
  director = state;
  if (!intent) return;
  const now = performance.now();
  if (intent.kind === "stand") {
    clearMotion(now);
    useCrewStore.setState(({ live }) => ({
      phase: "running",
      live: perCrew((crew) => ({ ...atRest(crew), latencyMs: crewLive(crew, live).latencyMs,
        message: crew === intent.activity.crew ? intent.activity.text : "Standing by" })),
    }));
  } else if (intent.kind === "complete") {
    useCrewStore.setState({ phase: "finishing" });
  } else if (intent.kind === "error") {
    useCrewStore.setState({ phase: "error" });
    clearMotion(now);
    updateLive(intent.cue, event);
    startJob(intent.cue.activity.crew, cueJob(intent.cue), now, false);
  } else if (intent.kind === "thought") {
    const speech = { kind: "thought", text: intent.activity.text } as const;
    useCrewStore.setState(({ live }) => ({ live: { ...live, architect: { ...crewLive("architect", live), message: speech.text } } }));
    setAvatar("architect", { speech, status: "working", speechEngine: intent.activity.engine,
      speechStartedAt: crewLive("architect").startedAt, speechLatencyMs: undefined });
    // A queued approach can be waiting for a clear aisle. Preserve the newest thought when it starts.
    for (const job of queue.architect) {
      if (job.appearance?.status === "working") job.appearance.speech = speech;
    }
    if (crewAvatar("scout").status === "done") setAvatar("scout", { speech: null });
  } else if (lateBriefing && intent.kind === "step") {
    // Placement already completed. Its remaining floor choreography cannot hold the briefing.
    updateLive(intent.cue, event);
    queue.chief.length = 0;
    startJob("chief", cueJob(intent.cue), now, replay || !!preference?.matches);
  } else if (intent.kind === "step") {
    const { cue } = intent;
    const crew = cue.activity.crew;
    updateLive(cue, event);
    const job = cueJob(cue);
    const visual = cue.visual;
    if (visual && visual.kind !== "trace" && visual.kind !== "check") showVisual(crew, visual, replay ? now - 10_000 : now);
    if (event.type === "revision.started") showVisual("architect", null, now);
    if (cue.handoffFrom && !replay) {
      const fromCrew = cue.handoffFrom;
      const from = crewPosition(fromCrew, now);
      const to = crewPosition(crew, now);
      useCrewStore.setState(({ handoffs }) => ({
        handoffs: [...handoffs.slice(-3), { id: ++handoffId, from, to, crew, fromCrew }],
      }));
    }
    if (event.type === "selfcheck.done") {
      finishInspectionClock(cue);
      if (intent.cue.inspection === "as-dropped") dropReview = job;
      else recommendationReview = job;
    }
    if (event.type === "reasoning.done" || event.type === "revision.done") {
      job.after = dropReview;
      latestProposal = job;
    }
    if (event.type === "selfcheck.started" && intent.cue.inspection !== "as-dropped") job.after = latestProposal;
    if (intent.cue.briefing) job.after = recommendationReview;
    if (intent.cue.briefing && ((job.after && !job.after.finished) || moving.has(crew))) {
      const speech = { kind: "step", text: "Briefing ready" } as const;
      const ready = { speech, status: "done", speechStartedAt: null, speechLatencyMs: cue.activity.latencyMs,
        speechEngine: cue.activity.engine } as const;
      setAvatar("chief", ready);
      for (const queued of queue.chief) {
        if (queued.appearance?.status === "working") queued.appearance = { ...queued.appearance, ...ready };
      }
    }
    const waitForArrival = intent.cue.briefing && moving.has(crew);
    const immediate = crew !== "inspector" && !waitForArrival && !job.stops?.length && !queue[crew].length && heldUntil[crew] <= now;
    if (!immediate || !startJob(crew, job, now, replay || !!preference?.matches)) queue[crew].push(job);
  }
  const activity = "cue" in intent ? intent.cue.activity : intent.activity;
  const eventIndex = useRunStore.getState().events.indexOf(event);
  appendActivity({ ...activity, ...(eventIndex >= 0 ? { transcriptEntryId: `${event.runId}:${eventIndex}` } : {}) });
  play(now, replay);
}

export function startPatrolVisit(cue: CrewCue): boolean {
  const { phase } = useCrewStore.getState();
  if (document.hidden || phase !== "idle" || useRunStore.getState().status === "running") return false;
  const crew = cue.activity.crew;
  if (crew === "chief" && (director.awaitingBriefing || crewAvatar(crew).speech?.kind === "briefing")) return false;
  const now = performance.now();
  if (!startJob(crew, cueJob(cue, "patrol"), now, !!preference?.matches, true)) return false;
  const { activity } = cue;
  useCrewStore.setState(({ live }) => ({ live: { ...live, [crew]: {
    ...crewLive(crew, live), status: "idle", message: `idle patrol · ${activity.text}`, attention: undefined,
    engine: activity.engine ?? "twin observation", startedAt: null,
  } } }));
  appendActivity(activity);
  play(now);
  return true;
}

export function endPatrolVisit(crew: CrewId, instant = false): void {
  if (crewAvatar(crew).speech?.kind !== "patrol") return;
  useCrewStore.setState(({ live }) => ({ live: { ...live, [crew]: {
    ...atRest(crew), latencyMs: crewLive(crew, live).latencyMs,
  } } }));
  queueOffice(crew);
  play(performance.now(), instant);
}

export function connectCrew(): () => void {
  visibleConsumers += 1;
  if (!disconnect) {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    preference = motionPreference;
    const syncMotion = () => play(performance.now());
    motionPreference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    const unsubscribe = pipelineBus.on(onEvent);
    const stopReset = useRunStore.subscribe((next, previous) => {
      if (next.status !== "idle" || previous.status === "idle") return;
      clearMotion(performance.now());
      director = INITIAL_DIRECTOR;
      useCrewStore.setState({ phase: "idle", avatars: perCrew(atDesk), live: perCrew(atRest) });
    });
    for (const event of useRunStore.getState().events) onEvent(event, true);
    syncMotion();
    disconnect = () => {
      unsubscribe();
      stopReset();
      motionPreference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      if (motionTimer !== null) window.clearTimeout(motionTimer);
      if (returnTimer !== null) window.clearTimeout(returnTimer);
      motionTimer = null;
      returnTimer = null;
    };
  }
  return () => {
    visibleConsumers -= 1;
    if (!visibleConsumers) { disconnect?.(); disconnect = undefined; }
  };
}

export function useCrewConnection(): void {
  useEffect(connectCrew, []);
}
