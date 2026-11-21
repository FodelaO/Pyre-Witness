/** Orthogonal pipe geometry shared by the schematic and its overlays. */
import { distance, type Point } from "@/twin/geometry";

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function continues(a: Point, b: Point, c: Point): boolean {
  return (
    (a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) >= 0) ||
    (a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) >= 0)
  );
}

export function routePoints(from: Point, to: Point, via: readonly [number, number][] = []): Point[] {
  const anchors = [from, ...via.map(([x, y]) => ({ x, y })), to];
  const points = [from];

  function append(point: Point) {
    const tail = points[points.length - 1];
    if (samePoint(tail, point)) return;
    if (points.length > 1 && continues(points[points.length - 2], tail, point)) {
      points[points.length - 1] = point;
    } else {
      points.push(point);
    }
  }

  for (let index = 1; index < anchors.length; index++) {
    const start = anchors[index - 1];
    const end = anchors[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx !== 0 && dy !== 0) {
      const next = anchors[index + 1];
      // When possible, continue into the next leg without bending again at the waypoint.
      const horizontalFirst = next?.x === end.x && (next.y - end.y) * dy > 0
        ? true
        : next?.y === end.y && (next.x - end.x) * dx > 0
          ? false
          : Math.abs(dx) >= Math.abs(dy);
      append(horizontalFirst ? { x: end.x, y: start.y } : { x: start.x, y: end.y });
    }
    append(end);
  }
  return points;
}

function towards(from: Point, to: Point, fraction: number): Point {
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
}

const coords = ({ x, y }: Point) => `${x} ${y}`;

export function roundedPath(points: readonly Point[], radius = 7): string {
  if (points.length < 2) return "";
  const commands = [`M${coords(points[0])}`];
  for (let index = 1; index < points.length - 1; index++) {
    const [previous, corner, next] = [points[index - 1], points[index], points[index + 1]];
    const incoming = distance(previous, corner);
    const outgoing = distance(corner, next);
    const inset = Math.min(radius, incoming / 2, outgoing / 2);
    if (inset <= 0) {
      commands.push(`L${coords(corner)}`);
      continue;
    }
    const before = towards(corner, previous, inset / incoming);
    const after = towards(corner, next, inset / outgoing);
    commands.push(`L${coords(before)}`, `Q${coords(corner)} ${coords(after)}`);
  }
  commands.push(`L${coords(points[points.length - 1])}`);
  return commands.join(" ");
}

export function routeMidpoint(points: readonly Point[]): Point {
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (length > 0 && remaining <= length) {
      return towards(points[index], points[index + 1], remaining / length);
    }
    remaining -= length;
  }
  return points[0];
}
