/** Geometry helpers for cable, packet and signal overlays in plant coordinates. */
import { distance, type Point } from "@/twin/geometry";

export function linePath(points: readonly Point[]): string {
  return points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

export function routeLength(points: readonly Point[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
}

export function longestLeg(points: readonly Point[]) {
  let start = points[0];
  let end = points[0];
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    const leg = distance(points[index - 1], points[index]);
    if (leg > length) {
      start = points[index - 1];
      end = points[index];
      length = leg;
    }
  }
  return { start, end, length };
}

export function signalPath(from: Point, to: Point): string {
  const midX = from.x + (to.x - from.x) * 0.5;
  return `M${from.x} ${from.y} H${midX} V${to.y} H${to.x}`;
}
