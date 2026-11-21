/** Plans orthogonal walks through room entrances and reserves separate standing slots. */
import { areaById, distance, type Point } from "@/twin/geometry";
import type { AreaId, Twin } from "@/twin/types";

export interface WalkStop {
  point: Point;
  area?: AreaId;
  beside?: boolean;
}

type Bounds = Twin["plant"]["building"];
export const BADGE_SEPARATION = 37;
const FLOOR_INSET = 18;
const SLOT_STEP = 40;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function inset({ x, y, w, h }: Bounds, pad: number): Bounds {
  const dx = Math.min(pad, w / 2);
  const dy = Math.min(pad, h / 2);
  return { x: x + dx, y: y + dy, w: w - 2 * dx, h: h - 2 * dy };
}

function within(point: Point, bounds: Bounds): Point {
  return { x: clamp(point.x, bounds.x, bounds.x + bounds.w), y: clamp(point.y, bounds.y, bounds.y + bounds.h) };
}

function same(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function roomSlots(twin: Twin, stop: WalkStop, occupied: Point[]): Point[] {
  const floor = inset(twin.plant.building, FLOOR_INSET);
  const area = stop.area ? areaById(twin, stop.area) : undefined;
  const room = area && !area.attrs.outdoor ? inset(area.bounds, FLOOR_INSET) : floor;
  const candidates: Point[] = [];
  const center = within(within(stop.point, room), floor);
  const add = (dx: number, dy: number) => {
    const point = within(within({ x: center.x + dx, y: center.y + dy }, room), floor);
    if (stop.beside && distance(point, center) < FLOOR_INSET) return;
    if (occupied.some((neighbor) => distance(point, neighbor) < BADGE_SEPARATION)) return;
    if (!candidates.some((candidate) => same(candidate, point))) candidates.push(point);
  };
  if (!stop.beside) add(0, 0);
  for (const offset of [SLOT_STEP, SLOT_STEP * 2, SLOT_STEP * 3]) {
    add(0, -offset);
    add(offset, 0);
    add(-offset, 0);
    add(0, offset);
    add(offset, -offset);
    add(-offset, -offset);
    add(offset, offset);
    add(-offset, offset);
  }
  return candidates;
}

function orthogonalDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function blocksWall(a: Point, b: Point, room: Bounds): boolean {
  // The twin supplies room outlines. Each side's midpoint is a pedestrian entrance.
  const horizontal = a.y === b.y;
  const start = horizontal ? a.x : a.y;
  const end = horizontal ? b.x : b.y;
  const cross = horizontal ? a.y : a.x;
  const near = horizontal ? room.x : room.y;
  const far = near + (horizontal ? room.w : room.h);
  const top = horizontal ? room.y : room.x;
  const bottom = top + (horizontal ? room.h : room.w);
  if (cross < top || cross > bottom) return false;
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  if (cross === top || cross === bottom) return low <= far && high >= near;
  return cross !== (top + bottom) / 2 && ((low <= near && high >= near) || (low <= far && high >= far));
}

function blocksBadge(a: Point, b: Point, neighbor: Point): boolean {
  const closest = {
    x: clamp(neighbor.x, Math.min(a.x, b.x), Math.max(a.x, b.x)),
    y: clamp(neighbor.y, Math.min(a.y, b.y), Math.max(a.y, b.y)),
  };
  return distance(closest, neighbor) < BADGE_SEPARATION - 1e-6;
}

function compress(points: Point[]): Point[] {
  const route: Point[] = [];
  for (const point of points) {
    const last = route.at(-1);
    if (last && same(point, last)) continue;
    const previous = route.at(-2);
    if (previous && last && orthogonalDistance(previous, point) ===
        orthogonalDistance(previous, last) + orthogonalDistance(last, point) &&
        (previous.x === last.x && last.x === point.x || previous.y === last.y && last.y === point.y)) {
      route.pop();
    }
    route.push(point);
  }
  return route;
}

function findRoute(floor: Bounds, rooms: Bounds[], from: Point, to: Point, occupied: Point[]): Point[] | undefined {
  if (same(from, to)) return [from];
  const legal = (a: Point, b: Point) => !rooms.some((room) => blocksWall(a, b, room))
    && !occupied.some((neighbor) => blocksBadge(a, b, neighbor));
  for (const corner of [{ x: from.x, y: to.y }, { x: to.x, y: from.y }]) {
    if (legal(from, corner) && legal(corner, to)) return compress([from, corner, to]);
  }

  // Only entrances, wall offsets and badge clearances are needed as possible turn coordinates.
  const xs = new Set([from.x, to.x, floor.x, floor.x + floor.w]);
  const ys = new Set([from.y, to.y, floor.y, floor.y + floor.h]);
  for (const room of rooms) {
    for (const x of [room.x - 2, room.x + room.w / 2, room.x + room.w + 2]) xs.add(x);
    for (const y of [room.y - 2, room.y + room.h / 2, room.y + room.h + 2]) ys.add(y);
  }
  for (const point of occupied) {
    xs.add(point.x - BADGE_SEPARATION);
    xs.add(point.x + BADGE_SEPARATION);
    ys.add(point.y - BADGE_SEPARATION);
    ys.add(point.y + BADGE_SEPARATION);
  }
  const x = [...xs].filter((value) => value >= floor.x && value <= floor.x + floor.w).sort((a, b) => a - b);
  const y = [...ys].filter((value) => value >= floor.y && value <= floor.y + floor.h).sort((a, b) => a - b);
  const index = (i: number, j: number) => i * y.length + j;
  const start = index(x.indexOf(from.x), y.indexOf(from.y));
  const end = index(x.indexOf(to.x), y.indexOf(to.y));
  const pointAt = (id: number): Point => ({ x: x[Math.floor(id / y.length)], y: y[id % y.length] });
  const open = new Set([start]);
  const visited = new Set<number>();
  const cost = new Map([[start, 0]]);
  const previous = new Map<number, number>();

  while (open.size) {
    let current = -1;
    let best = Infinity;
    for (const id of open) {
      const estimate = cost.get(id)! + orthogonalDistance(pointAt(id), to);
      if (estimate < best) { best = estimate; current = id; }
    }
    if (current === end) {
      const route = [to];
      for (let id = current; previous.has(id);) {
        id = previous.get(id)!;
        route.push(pointAt(id));
      }
      return compress(route.reverse());
    }
    open.delete(current);
    visited.add(current);
    const i = Math.floor(current / y.length);
    const j = current % y.length;
    const point = { x: x[i], y: y[j] };
    for (const [column, row] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (column < 0 || column >= x.length || row < 0 || row >= y.length) continue;
      const id = index(column, row);
      if (visited.has(id)) continue;
      const next = { x: x[column], y: y[row] };
      const length = cost.get(current)! + orthogonalDistance(point, next);
      if (length >= (cost.get(id) ?? Infinity) || !legal(point, next)) continue;
      cost.set(id, length);
      previous.set(id, current);
      open.add(id);
    }
  }
}

export function planWalk(twin: Twin, start: Point, stops: WalkStop[], occupied: Point[] = []): Point[] | undefined {
  const floor = inset(twin.plant.building, FLOOR_INSET);
  const rooms = twin.areas.filter((area) => area.kind !== "context").map((area) => area.bounds);
  const route = [within(start, floor)];
  for (const stop of stops) {
    let leg: Point[] | undefined;
    const from = route[route.length - 1];
    for (const slot of roomSlots(twin, stop, occupied)) {
      leg = findRoute(floor, rooms, from, slot, occupied);
      if (leg) break;
    }
    if (!leg) return undefined;
    route.push(...leg.slice(1));
  }
  return compress(route);
}
