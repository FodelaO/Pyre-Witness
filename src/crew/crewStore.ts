/** Connects the pipeline bus to the feed and plays movement cues without producing pipeline events. */
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { pipelineBus } from "@/pipeline/bus";
import { useRunStore } from "@/pipeline/runStore";
import type { PipelineEvent } from "@/pipeline/types";
import { areaById, distance, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { directCrew, INITIAL_DIRECTOR, type CrewCue, type CrewStatus } from "./director";
import { appendActivity } from "./feedStore";
import { deskPosition } from "./officeLayout";
import { CREW_ORDER, type CrewId } from "./types";
import { planWalk, type WalkStop } from "./walk";
import { timeWalk, walkPosition, walksConflict, type TimedWalk } from "./walkTiming";

export interface Speech {
  text: string;
  kind: "step" | "briefing" | "patrol";
}

export interface AvatarState {
  point: Point;
  status: CrewStatus;
  walking: boolean;
  speech: Speech | null;
  inspect?: Point;
}

type Phase = "idle" | "running" | "finishing" | "returning" | "error";
type Appearance = Pick<AvatarState, "status" | "speech" | "inspect">;
type Job = Pick<CrewCue, "stops" | "holdMs"> & { appearance?: Appearance };
type ActiveWalk = TimedWalk & { arrival?: Appearance };

function perCrew<T>(make: (crew: CrewId) => T): Record<CrewId, T> {
  return { scout: make("scout"), architect: make("architect"), inspector: make("inspector"), chief: make("chief") };
}

const readTwin = () => useTwinStore.getState().twin;
function toOffice(crew: CrewId): WalkStop {
  const twin = readTwin();
  return { point: deskPosition(crew, twin.plant.building, areaById(twin, "crew_office")), area: "crew_office" };
}

const atDesk = (crew: CrewId): AvatarState => ({ point: toOffice(crew).point, status: "idle", walking: false, speech: null });
export const useCrewStore = create<{ phase: Phase; avatars: Record<CrewId, AvatarState> }>(() => ({
  phase: "idle",
  avatars: perCrew(atDesk),
}));

const moving = new Map<CrewId, ActiveWalk>();
const queue = perCrew<Job[]>(() => []);
const heldUntil = perCrew(() => 0);
const seen = new WeakSet<PipelineEvent>();
let director = INITIAL_DIRECTOR;
let frame: number | null = null;
let returnTimer: number | null = null;
let preference: MediaQueryList | undefined;
let visibleConsumers = 0;
let disconnect: (() => void) | undefined;

function setAvatar(crew: CrewId, patch: Partial<AvatarState>): void {
  useCrewStore.setState(({ avatars }) => ({ avatars: { ...avatars, [crew]: { ...avatars[crew], ...patch } } }));
}

function updatePositions(now: number, instant: boolean): boolean {
  if (!moving.size) return false;
  const avatars = { ...useCrewStore.getState().avatars };
  let arrived = false;
  for (const [crew, walk] of moving) {
    const walking = !instant && now < walk.end.at;
    avatars[crew] = {
      ...avatars[crew], ...(walking ? {} : walk.arrival), walking,
      point: walking ? walkPosition(walk, now) : walk.end.point,
    };
    if (!walking) {
      if (!instant && avatars[crew].inspect) heldUntil[crew] = Math.max(heldUntil[crew], now + 500);
      moving.delete(crew);
      arrived = true;
    }
  }
  useCrewStore.setState({ avatars });
  return arrived;
}

function clearMotion(now: number): void {
  updatePositions(now, false);
  moving.clear();
  if (frame !== null) window.cancelAnimationFrame(frame);
  if (returnTimer !== null) window.clearTimeout(returnTimer);
  frame = null;
  returnTimer = null;
  for (const crew of CREW_ORDER) {
    queue[crew].length = 0;
    heldUntil[crew] = 0;
  }
  const { avatars } = useCrewStore.getState();
  useCrewStore.setState({ avatars: perCrew((crew) => ({
    point: avatars[crew].point, status: "idle", walking: false, speech: null,
  })) });
}

function startJob(crew: CrewId, job: Job, now: number, instant: boolean, visit = false): boolean {
  const { avatars } = useCrewStore.getState();
  const from = avatars[crew].point;
  let walk: TimedWalk | undefined;
  if (job.stops?.length) {
    const occupied = CREW_ORDER.filter((other) => other !== crew)
      .map((other) => moving.get(other)?.end.point ?? avatars[other].point);
    const route = planWalk(readTwin(), from, job.stops, occupied);
    if (!route && (moving.size || visit)) return false;
    if (route) {
      walk = timeWalk(route, now, instant);
      const candidate = walk;
      if ([...moving.values()].some((other) => walksConflict(candidate, other, now))) return false;
    }
  }
  const walking = !!walk && walk.end.at > now;
  const appearance = !walk && job.stops?.length && job.appearance ? { ...job.appearance, inspect: undefined } : job.appearance;
  const arrival = walking && appearance?.speech?.kind === "briefing" ? appearance : undefined;
  if (walk && walking) moving.set(crew, { ...walk, arrival });
  setAvatar(crew, { ...(arrival ? { speech: null } : appearance), ...(walk ? { point: walking ? from : walk.end.point, walking } : {}) });
  heldUntil[crew] = now + (instant ? 0 : job.holdMs ?? 0);
  return true;
}

function finishWalks(now: number, instant: boolean): void {
  for (const crew of CREW_ORDER) {
    while (queue[crew].length && !moving.has(crew) && (instant || heldUntil[crew] <= now)) {
      if (!startJob(crew, queue[crew][0], now, instant)) break;
      queue[crew].shift();
    }
  }
  if (moving.size || CREW_ORDER.some((crew) => queue[crew].length)) return;
  const { phase } = useCrewStore.getState();
  if (phase === "returning") useCrewStore.setState({ phase: "idle" });
  if ((phase === "finishing" || phase === "error") && returnTimer === null) {
    returnTimer = window.setTimeout(() => {
      returnTimer = null;
      useCrewStore.setState({ phase: "returning" });
      for (const crew of CREW_ORDER) queueOffice(crew);
      play(performance.now());
    }, phase === "error" ? 6000 : 3200);
  }
}

function play(now: number, replay = false, retry = true): void {
  const instant = replay || document.hidden || !!preference?.matches;
  const arrived = updatePositions(now, instant);
  if (retry || arrived) finishWalks(now, instant);
  const waitingForBubble = CREW_ORDER.some((crew) => queue[crew].length && !moving.has(crew) && heldUntil[crew] > now);
  if (frame !== null || (!moving.size && !waitingForBubble)) return;
  frame = window.requestAnimationFrame((at) => {
    frame = null;
    play(at, false, !moving.size || CREW_ORDER.some((crew) => heldUntil[crew] > 0 && heldUntil[crew] <= at && heldUntil[crew] > now));
  });
}

function cueJob(cue: CrewCue, kind: Speech["kind"] = cue.briefing ? "briefing" : "step"): Job {
  return {
    stops: cue.stops, holdMs: cue.holdMs,
    appearance: { status: cue.status, inspect: cue.inspect, speech: { text: cue.activity.text, kind } },
  };
}

function queueOffice(crew: CrewId): void {
  queue[crew].push({ stops: [toOffice(crew)], appearance: { status: "idle", speech: null, inspect: undefined } });
}

function onEvent(event: PipelineEvent, replay = false): void {
  if (seen.has(event)) return;
  seen.add(event);
  const { state, intent } = directCrew(director, event, readTwin());
  director = state;
  if (!intent) return;
  const now = performance.now();
  if (intent.kind === "stand") {
    useCrewStore.setState({ phase: "running" });
    clearMotion(now);
    for (const crew of CREW_ORDER) {
      const home = toOffice(crew);
      if (distance(useCrewStore.getState().avatars[crew].point, home.point) < 3) {
        queue[crew].push({ stops: [{ ...home, point: { ...home.point, x: home.point.x - 12 } }] });
      }
    }
  } else if (intent.kind === "complete") {
    useCrewStore.setState({ phase: "finishing" });
  } else if (intent.kind === "error") {
    useCrewStore.setState({ phase: "error" });
    clearMotion(now);
    startJob(intent.cue.activity.crew, cueJob(intent.cue), now, false);
  } else if (intent.kind === "step") {
    const job = cueJob(intent.cue);
    const crew = intent.cue.activity.crew;
    if (crew !== "inspector" && !job.stops?.length && !queue[crew].length && heldUntil[crew] <= now) {
      startJob(crew, job, now, replay || !!preference?.matches);
    } else {
      queue[crew].push(job);
    }
  }
  appendActivity("cue" in intent ? intent.cue.activity : intent.activity);
  play(now, replay);
}

export function startPatrolVisit(cue: CrewCue): boolean {
  const { phase } = useCrewStore.getState();
  if (document.hidden || phase !== "idle" || useRunStore.getState().status === "running") return false;
  const crew = cue.activity.crew;
  const now = performance.now();
  if (!startJob(crew, cueJob(cue, "patrol"), now, !!preference?.matches, true)) return false;
  appendActivity(cue.activity);
  play(now);
  return true;
}

export function endPatrolVisit(crew: CrewId, instant = false): void {
  if (useCrewStore.getState().avatars[crew].speech?.kind !== "patrol") return;
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
      useCrewStore.setState({ phase: "idle", avatars: perCrew(atDesk) });
    });
    for (const event of useRunStore.getState().events) onEvent(event, true);
    syncMotion();
    disconnect = () => {
      unsubscribe();
      stopReset();
      motionPreference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (returnTimer !== null) window.clearTimeout(returnTimer);
      frame = null;
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
