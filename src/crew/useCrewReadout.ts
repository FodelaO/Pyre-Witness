/** Resolves the same live status for the dock and the 3D crew plates. */
"use client";

import { crewLive, useCrewStore } from "./crewStore";
import type { CrewStatus } from "./director";
import { CREW, type CrewId } from "./types";

export function useCrewReadout(id: CrewId) {
  const live = useCrewStore((state) => crewLive(id, state.live));
  const walking = useCrewStore((state) => state.avatars?.[id]?.walking ?? false);
  const speechKind = useCrewStore((state) => state.avatars?.[id]?.speech?.kind);
  const watch = useCrewStore((state) => {
    const avatar = state.avatars?.[id];
    return avatar?.work?.watch && avatar.speech ? avatar : undefined;
  });
  const phase = useCrewStore((state) => state.phase);
  const active = live.status === "working" && (phase === "running" || (id === "chief" && phase !== "error"));
  const stopped = !active && live.status === "working";
  const returning = walking && phase !== "running" && !speechKind;
  const atDesk = phase === "idle" && !walking && !speechKind && live.status !== "error";
  const status: CrewStatus | "walking" = walking ? "walking" : atDesk || stopped ? "idle" : live.status;
  let message = (!stopped && live.message) || "Standing by";
  if (id === "chief" && live.status === "done") message = "Briefing ready";
  if (atDesk) message = "At desk";
  if (returning) message = "Returning to desk";
  return {
    status, message: watch?.speech?.text ?? message, active: active || !!watch, walking,
    resting: status === "idle" && !speechKind && message === "At desk",
    patrol: speechKind === "patrol" || message.startsWith("idle patrol"),
    engine: watch?.speechEngine || live.engine || CREW[id].engine,
    latencyMs: live.latencyMs,
    attention: live.attention && message === live.message,
  };
}
