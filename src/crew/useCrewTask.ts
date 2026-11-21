/** Pairs the live readout with the time and targets of the work shown on the floor. */
"use client";

import { crewLive, useCrewStore } from "./crewStore";
import type { CrewId } from "./types";
import { useCrewReadout } from "./useCrewReadout";

export function useCrewTask(id: CrewId) {
  const readout = useCrewReadout(id);
  const avatar = useCrewStore((state) => state.avatars[id]);
  const live = useCrewStore((state) => crewLive(id, state.live));
  const phase = useCrewStore((state) => state.phase);

  // Path walks can still be on the floor after the rules engine has computed the verdict.
  if (avatar?.speech?.kind === "inspection") {
    return { ...readout, message: avatar.speech.text, work: avatar.work,
      status: avatar.walking ? "walking" as const : avatar.status, active: avatar.status === "working" };
  }
  const atDesk = readout.resting || (phase === "returning" && avatar?.status === "idle" && !avatar.walking && !avatar.speech);
  const hasTask = !atDesk && readout.message !== "Returning to desk" && (phase !== "idle" || !!avatar?.speech);
  return { ...readout, message: atDesk ? "At desk" : readout.message,
    status: atDesk ? "idle" as const : readout.status, work: hasTask ? live.work : undefined };
}
