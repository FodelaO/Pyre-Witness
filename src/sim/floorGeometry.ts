/** Maps replay nodes and real twin pipe waypoints into floor coordinates. */
import { roundedPath, routePoints } from "@/floor/routing";
import { areaCenter, distance, nodePosition, type Point } from "@/twin/geometry";
import type { Twin } from "@/twin/types";

export function markerPosition(twin: Twin, id: string): Point | undefined {
  const area = twin.areas.find((item) => item.id === id);
  if (area) return areaCenter(area);

  const firewall = twin.conduits.find((item) => item.id === id)?.enforcedBy;
  return nodePosition(twin, firewall ?? id);
}

export function markerRoute(twin: Twin, ids: readonly string[]): Point[] {
  const points: Point[] = [];
  for (const id of ids) {
    const point = markerPosition(twin, id);
    const previous = points.at(-1);
    if (point && (!previous || distance(point, previous) > 0)) points.push(point);
  }
  return points;
}

export function traceTo(points: readonly Point[], progress: number): Point[] {
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

export function causticPath(twin: Twin, ids: readonly string[]): string {
  const points: Point[] = [];
  const byId = new Map(twin.assets.map((asset) => [asset.id, asset]));

  for (const [index, id] of ids.slice(1).entries()) {
    const from = byId.get(ids[index]);
    const to = byId.get(id);
    if (!from || !to) break;

    const connection = from.physical.connections.find((edge) => edge.to === id && (edge.medium === "cip" || edge.medium === "product"));
    if (!connection) break;

    const leg = routePoints(from.physical, to.physical, connection.via);
    points.push(...(points.length ? leg.slice(1) : leg));
  }
  return roundedPath(points);
}
