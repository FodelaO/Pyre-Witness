/** Builds lens geometry from declared Ethernet cabling and network zones. */
import { distance, type Point } from "@/twin/geometry";
import type { Asset, Conduit, Twin } from "@/twin/types";

export interface ConduitCrossing extends Point {
  conduitId: string;
  name: string;
  enforced: boolean;
}

export interface NetworkLink {
  id: string;
  from: string;
  to: string;
  route: Point[];
  crossings: ConduitCrossing[];
  active: boolean;
  label?: string;
}

export interface ZoneHull {
  id: string;
  name: string;
  points: Point[];
}

export const pointOf = ({ x, y }: Point): Point => ({ x, y });

function pairKey(a: string, b: string): string {
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}

export function pathMidpoint(points: readonly Point[]): Point {
  const lengths = points.slice(1).map((point, i) => distance(points[i], point));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (const [i, length] of lengths.entries()) {
    if (length && remaining <= length) {
      const fraction = remaining / length;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * fraction,
        y: points[i].y + (points[i + 1].y - points[i].y) * fraction,
      };
    }
    remaining -= length;
  }
  return points[0];
}

export function buildTopology(twin: Twin) {
  const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const conduits = new Map<string, Conduit[]>();
  const links = new Map<string, NetworkLink>();
  const neighbors = new Map<string, Set<string>>();

  for (const conduit of twin.conduits) {
    const key = pairKey(conduit.from, conduit.to);
    const known = conduits.get(key);
    if (known) known.push(conduit);
    else conduits.set(key, [conduit]);
  }

  function crossingsOf(fromZone: string, toZone: string, at: Point): ConduitCrossing[] {
    if (fromZone === toZone) return [];
    return (conduits.get(pairKey(fromZone, toZone)) ?? []).map((conduit) => {
      const enforcement = conduit.enforcedBy && assets.get(conduit.enforcedBy)?.physical.kind;
      return {
        ...at,
        conduitId: conduit.id,
        name: conduit.name,
        enforced: enforcement === "firewall" || enforcement === "network_switch",
      };
    });
  }

  for (const from of twin.assets) {
    for (const connection of from.physical.connections) {
      if (connection.medium !== "network" || connection.to === from.id) continue;
      const to = assets.get(connection.to);
      if (!to) continue;
      const id = pairKey(from.id, to.id);
      const existing = links.get(id);
      if (existing) {
        if (connection.active === false) existing.active = false;
        continue;
      }
      const route = [
        pointOf(from.physical),
        ...(connection.via ?? []).map(([x, y]) => ({ x, y })),
        pointOf(to.physical),
      ];
      links.set(id, {
        id, from: from.id, to: to.id, route, active: connection.active !== false,
        label: connection.label,
        crossings: crossingsOf(from.network.area, to.network.area, pathMidpoint(route)),
      });
    }
  }

  function connect(from: string, to: string) {
    const peers = neighbors.get(from);
    if (peers) peers.add(to);
    else neighbors.set(from, new Set([to]));
  }

  for (const { from, to, active } of links.values()) {
    if (!active || assets.get(from)?.status === "offline" || assets.get(to)?.status === "offline") continue;
    connect(from, to);
    connect(to, from);
  }

  const searchCache = new Map<string, Map<string, string>>();
  function shortestPath(from: string, to: string): string[] {
    if (!assets.has(from) || !assets.has(to)) return [];
    let previous = searchCache.get(from);
    if (!previous) {
      previous = new Map([[from, from]]);
      const frontier = [from];
      for (const node of frontier) {
        for (const next of [...(neighbors.get(node) ?? [])].sort()) {
          if (previous.has(next)) continue;
          previous.set(next, node);
          frontier.push(next);
        }
      }
      searchCache.set(from, previous);
    }
    if (!previous.has(to)) return [];
    const route = [to];
    while (route.at(-1) !== from) route.push(previous.get(route.at(-1)!)!);
    return route.reverse();
  }

  function trace(ids: readonly string[]): { route: Point[]; crossings: ConduitCrossing[] } {
    const route: Point[] = [];
    const crossings: ConduitCrossing[] = [];
    for (let i = 1; i < ids.length; i++) {
      const link = links.get(pairKey(ids[i - 1], ids[i]));
      if (!link) continue;
      const forward = link.from === ids[i - 1];
      const points = forward ? link.route : [...link.route].reverse();
      route.push(...(i === 1 ? points : points.slice(1)));
      crossings.push(...(forward ? link.crossings : [...link.crossings].reverse()));
    }
    return { route, crossings };
  }

  return { assets, links: [...links.values()], neighbors, shortestPath, trace, crossingsOf };
}

export type CableTopology = ReturnType<typeof buildTopology>;

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points: Point[]): Point[] {
  const sorted = points.sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (list: Point[]) => {
    const hull: Point[] = [];
    for (const point of list) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
      hull.push(point);
    }
    return hull.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

export function buildZoneHulls(assets: readonly Asset[]): ZoneHull[] {
  const groups = new Map<string, Point[]>();
  for (const asset of assets) {
    const name = asset.network.area.trim();
    if (!name) continue;
    const { x, y } = asset.physical;
    const corners = [
      { x: x - 19, y: y - 22 }, { x: x + 19, y: y - 22 },
      { x: x + 19, y: y + 22 }, { x: x - 19, y: y + 22 },
    ];
    const group = groups.get(name);
    if (group) group.push(...corners);
    else groups.set(name, corners);
  }
  return [...groups].map(([name, corners]) => ({ id: name, name, points: convexHull(corners) }));
}
