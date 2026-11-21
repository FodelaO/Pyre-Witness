/** Samples constant-speed walks and checks for collisions between moving badges. */
import { distance, type Point } from "@/twin/geometry";
import { BADGE_SEPARATION } from "./walk";

const UNITS_PER_SECOND = 100;
const MAX_WALK_MS = 2500;

export interface TimedWalk {
  waypoints: { at: number; point: Point }[];
  end: { at: number; point: Point };
}

export function timeWalk(route: Point[], startAt: number, instant = false, limitMs = MAX_WALK_MS): TimedWalk {
  let length = 0;
  const lengths = route.map((point, index) => {
    if (index) length += distance(route[index - 1], point);
    return length;
  });
  const duration = instant ? 0 : Math.min(length / UNITS_PER_SECOND * 1000, limitMs);
  const waypoints = route.map((point, index) => ({
    point, at: startAt + (length ? lengths[index] / length * duration : 0),
  }));
  return { waypoints, end: waypoints[waypoints.length - 1] };
}

export function walkPosition(walk: TimedWalk, at: number): Point {
  if (at >= walk.end.at) return walk.end.point;
  for (let i = 1; i < walk.waypoints.length; i += 1) {
    const before = walk.waypoints[i - 1];
    const after = walk.waypoints[i];
    if (at > after.at) continue;
    const fraction = Math.max(0, (at - before.at) / (after.at - before.at));
    return {
      x: before.point.x + (after.point.x - before.point.x) * fraction,
      y: before.point.y + (after.point.y - before.point.y) * fraction,
    };
  }
  return walk.end.point;
}

export function walksConflict(a: TimedWalk, b: TimedWalk, now: number): boolean {
  const times = [now, ...a.waypoints.map(({ at }) => at), ...b.waypoints.map(({ at }) => at)]
    .filter((at) => at >= now).sort((left, right) => left - right);
  const relative = (at: number): Point => {
    const first = walkPosition(a, at);
    const second = walkPosition(b, at);
    return { x: first.x - second.x, y: first.y - second.y };
  };

  for (let i = 1; i < times.length; i += 1) {
    const start = relative(times[i - 1]);
    const end = relative(times[i]);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const fraction = lengthSquared ? Math.max(0, Math.min(1, -(start.x * dx + start.y * dy) / lengthSquared)) : 0;
    if (Math.hypot(start.x + fraction * dx, start.y + fraction * dy) < BADGE_SEPARATION - 1e-6) return true;
  }
  return false;
}
