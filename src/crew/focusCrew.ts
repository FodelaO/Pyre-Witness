/** Publishes a crew member’s current point for the floor camera. */
import type { Point } from "@/twin/geometry";
import { crewPosition } from "./crewStore";
import type { CrewId } from "./types";

export const CREW_FOCUS_EVENT = "pw:focus-point";
export type CrewFocusPoint = Point & { crewId: CrewId };

export function focusCrew(crewId: CrewId): void {
  window.dispatchEvent(new CustomEvent<CrewFocusPoint>(CREW_FOCUS_EVENT, {
    detail: { ...crewPosition(crewId), crewId },
  }));
}
