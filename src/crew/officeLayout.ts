/** Defines the office desk positions used by the artwork and the motion controller. */
import type { Point } from "@/twin/geometry";
import type { Area, Twin } from "@/twin/types";
import { DESK_AVATAR_WIDTH } from "./floorLayout";
import { CREW_ORDER, type CrewId } from "./types";

export function deskPosition(crew: CrewId, building: Twin["plant"]["building"], room?: Area): Point {
  const { x, y, w, h } = room?.bounds ?? building;
  const index = CREW_ORDER.indexOf(crew);
  return room
    ? { x: x + w * (index + 0.5) / CREW_ORDER.length, y: y + h * 0.52 }
    : { x: x + 35 + index * 72, y: y + h - 32 };
}

export function deskScale(room: Area) {
  return Math.min(.83, (room.bounds.w / CREW_ORDER.length - 4) / DESK_AVATAR_WIDTH, (room.bounds.h - 22) / 85);
}

export function isDesk(point: Point, building: Twin["plant"]["building"], room?: Area) {
  return CREW_ORDER.some((id) => {
    const desk = deskPosition(id, building, room);
    return Math.hypot(point.x - desk.x, point.y - desk.y) < 1;
  });
}
