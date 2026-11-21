/** Defines the office desk positions used by the artwork and the motion controller. */
import type { Point } from "@/twin/geometry";
import type { Area, Twin } from "@/twin/types";
import { CREW_ORDER, type CrewId } from "./types";

export function deskPosition(crew: CrewId, building: Twin["plant"]["building"], room?: Area): Point {
  const { x, y, w, h } = room?.bounds ?? building;
  const index = CREW_ORDER.indexOf(crew);
  return room
    ? { x: x + 26 + (index % 2) * (w - 24) / 2, y: y + h - 65 + Math.floor(index / 2) * 40 }
    : { x: x + 24 + index * 42, y: y + h - 32 };
}
