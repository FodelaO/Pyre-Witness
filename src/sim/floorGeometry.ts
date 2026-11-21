/** Maps replay markers and documented twin links into the floor canvas. */
import { FOOTPRINT } from "@/equipment/types";
import { roundedPath, routePoints } from "@/floor/routing";
import { areaCenter, assetById, distance, entryPointById, nodePosition, UNITS_PER_METRE, type Point } from "@/twin/geometry";
import { MEDIA, type Area, type Connection, type Twin } from "@/twin/types";
import type { SimStage } from "./types";

export function isFloorPoint(twin: Twin, point: Point): boolean {
  const { w, h } = twin.plant.canvas;
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= w && point.y >= 0 && point.y <= h;
}

export function floorNode(twin: Twin, id: string): Point | undefined {
  const point = nodePosition(twin, id);
  return point && isFloorPoint(twin, point) ? point : undefined;
}

export function floorAreaBounds(twin: Twin, area: Area): Area["bounds"] | undefined {
  const { x, y, w, h } = area.bounds;
  if (w > 0 && h > 0 && isFloorPoint(twin, { x, y }) && isFloorPoint(twin, { x: x + w, y: y + h })) return area.bounds;
}

export function markerPosition(twin: Twin, id: string): Point | undefined {
  const node = nodePosition(twin, id);
  if (node) return isFloorPoint(twin, node) ? node : undefined;

  const area = twin.areas.find((item) => item.id === id);
  if (area) return floorAreaBounds(twin, area) ? areaCenter(area) : undefined;

  const firewall = twin.conduits.find((item) => item.id === id)?.enforcedBy;
  return firewall ? floorNode(twin, firewall) : undefined;
}

export function insetFloorPoint(twin: Twin, point: Point, padX: number, padY: number): Point {
  const { w, h } = twin.plant.canvas;
  const clamp = (coordinate: number, size: number, padding: number) => Math.max(Math.min(padding, size / 2), Math.min(size - padding, coordinate));
  return { x: clamp(point.x, w, padX), y: clamp(point.y, h, padY) };
}

export function markerAnchor(twin: Twin, id: string): Point | undefined {
  const point = markerPosition(twin, id);
  if (!point) return undefined;

  const asset = assetById(twin, id);
  const { w, h } = asset ? FOOTPRINT[asset.physical.kind] : { w: 0, h: 0 };
  const scale = asset?.physical.scale ?? 1;
  const anchor = asset ? { x: point.x + w * scale / 2 + 5, y: point.y - h * scale / 2 - 5 } : point;
  return insetFloorPoint(twin, anchor, 14, 14);
}

function connectionPoints(twin: Twin, from: Point, to: Point, connection: Connection): Point[] | undefined {
  if (connection.via?.some(([x, y]) => !isFloorPoint(twin, { x, y }))) return undefined;
  return routePoints(from, to, connection.via);
}

function stageLeg(twin: Twin, fromId: string, toId: string, lens: "material" | "data"): Point[] | undefined {
  const from = floorNode(twin, fromId);
  const to = floorNode(twin, toId);
  if (!from || !to || distance(from, to) === 0) return undefined;

  const source = assetById(twin, fromId);
  const target = assetById(twin, toId);
  const matches = ({ medium }: Connection) => lens === "data" ? medium === "network" : MEDIA[medium].process;
  const forward = source?.physical.connections.find((edge) => edge.to === toId && matches(edge));
  const reverse = target?.physical.connections.find((edge) => edge.to === fromId && matches(edge));
  if (lens === "data" && (forward?.active === false || reverse?.active === false)) return undefined;
  if (forward) return connectionPoints(twin, from, to, forward);
  if (reverse) return connectionPoints(twin, to, from, reverse)?.reverse();

  // RF travels directly from a modeled source to an in-range radio. The
  // remaining stage locations are events or equipment, not inferred cables.
  const entry = entryPointById(twin, fromId);
  if (lens === "data" && entry?.kind === "rf" && target?.cyber?.radios.some((radio) => radio !== "nfc")
    && distance(from, to) <= (entry.reach ?? 30 * UNITS_PER_METRE)) return [from, to];
}

export function stageRoute(twin: Twin, ids: readonly string[], lens: "material" | "data"): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] | undefined;
  for (let index = 1; index < ids.length; index++) {
    const leg = stageLeg(twin, ids[index - 1], ids[index], lens);
    if (!leg) {
      current = undefined;
    } else if (current) {
      current.push(...leg.slice(1));
    } else {
      current = leg;
      segments.push(current);
    }
  }
  return segments;
}

function traceTo(points: readonly Point[], progress: number): Point[] {
  const start = points[0];
  if (!start || progress >= 1) return [...points];

  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const result = [start];
  let remaining = total * Math.max(0, progress);

  for (const [index, length] of lengths.entries()) {
    const [from, to] = [points[index], points[index + 1]];
    if (length > remaining) {
      if (remaining > 0) {
        const fraction = remaining / length;
        result.push({ x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction });
      }
      break;
    }
    if (length > 0) result.push(to);
    remaining -= length;
  }
  return result;
}

export function replayRoute(twin: Twin, stages: readonly SimStage[], current: number, progress: number, lens: "material" | "data") {
  const stage = stages[current];
  if (!stage) return { trails: [], pulse: undefined, hold: undefined };

  const trails = stages.slice(0, current).flatMap((step) => step.outcome === "advanced" ? stageRoute(twin, step.where, lens) : []);
  const location = [...stage.where].reverse().find((id) => markerPosition(twin, id));
  if (stage.outcome === "blocked") {
    return { trails, pulse: undefined, hold: location ? { id: location, point: markerAnchor(twin, location) } : undefined };
  }

  const routes = stageRoute(twin, stage.where, lens);
  const currentTrails = routes.map((route) => traceTo(route, progress));
  const position = location ? markerPosition(twin, location) : undefined;
  const end = routes.at(-1)?.at(-1);
  const pulse = position && end && distance(position, end) === 0 ? currentTrails.at(-1)?.at(-1) : position;
  return { trails: [...trails, ...currentTrails], pulse, hold: undefined };
}

export function causticRoute(twin: Twin, ids: readonly string[]): Point[] {
  const points: Point[] = [];
  for (let index = 1; index < ids.length; index++) {
    const fromId = ids[index - 1];
    const toId = ids[index];
    const from = floorNode(twin, fromId);
    const to = floorNode(twin, toId);
    const connection = assetById(twin, fromId)?.physical.connections.find((edge) =>
      edge.to === toId && (edge.medium === "cip" || edge.medium === "product"),
    );
    if (!from || !to || !connection) break;

    const leg = connectionPoints(twin, from, to, connection);
    if (!leg) break;
    points.push(...(points.length ? leg.slice(1) : leg));
  }
  return points;
}

export function causticPath(twin: Twin, ids: readonly string[]): string {
  return roundedPath(causticRoute(twin, ids));
}
