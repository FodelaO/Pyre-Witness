/** Places the declared conduit gates on the edges of their destination zones. */
import type { Point } from "@/twin/geometry";
import { PURDUE_LEVELS, type Asset, type Conduit, type EquipmentKind } from "@/twin/types";
import { type Anchor, type PurdueLayout, type Zone, zoneWidthAt } from "./layout";
import { center, type NetworkWire, pairKey } from "./routing";

export interface ConduitRoute {
  conduit: Conduit;
  gate: Point;
  points: Point[];
  fromId?: string;
  toId?: string;
  wireKey?: string;
  enforcerKind?: EquipmentKind;
}

interface Port {
  id: string;
  box: Anchor;
}

function inset(value: number, start: number, size: number, gap: number) {
  return Math.max(start + gap, Math.min(start + size - gap, value));
}

function verticalRoute(layout: PurdueLayout, from: Zone, to: Zone, a?: Anchor, b?: Anchor) {
  const direction = from.first < to.first ? 1 : -1;
  const fromEdge = direction > 0 ? from.y + from.h : from.y;
  const toEdge = direction > 0 ? to.y : to.y + to.h;
  const toBand = direction > 0 ? to.first : to.last;
  const endBeyondGate = b && b.level !== layout.bands[toBand].level;
  const x = a ? center(a).x : inset(b ? center(b).x : center(from).x, from.x, zoneWidthAt(from, fromEdge), 9);
  const gate = {
    x: endBeyondGate ? to.x + 8 : inset(b ? center(b).x : x, to.x, zoneWidthAt(to, toEdge), 9),
    y: toEdge,
  };
  const start = { x, y: a ? direction > 0 ? a.y + a.h : a.y : fromEdge };
  const end = b ? { x: center(b).x, y: direction > 0 ? b.y : b.y + b.h } : gate;
  const space = (toEdge - fromEdge) * direction;
  const elbow = toEdge - direction * (space >= 0 ? Math.min(10, space / 2) : 5);
  let exitX = x;
  const points = [start];
  if (direction > 0 && from.head && start.y < from.head.bottom && elbow > from.head.bottom + 7) {
    exitX = from.x + from.w - 4;
    points.push({ x, y: from.head.bottom - 6 }, { x: exitX, y: from.head.bottom - 6 });
  }
  points.push({ x: exitX, y: elbow }, { x: gate.x, y: elbow }, gate);
  if (b && end.x !== gate.x) {
    const y = end.y - direction * 4;
    points.push({ x: gate.x, y }, { x: end.x, y });
  }
  points.push(end);
  return { gate, points };
}

function horizontalRoute(from: Zone, to: Zone, a?: Anchor, b?: Anchor) {
  const direction = from.x < to.x ? 1 : -1;
  const startY = a ? center(a).y : center(from).y;
  const gateY = inset(b ? center(b).y : startY, to.y, to.h, 10);
  const fromEdge = direction > 0 ? from.x + zoneWidthAt(from, startY) : from.x;
  const toEdge = direction > 0 ? to.x : to.x + zoneWidthAt(to, gateY);
  const start = { x: a ? direction > 0 ? a.x + a.w : a.x : fromEdge, y: startY };
  const gate = { x: toEdge, y: gateY };
  const end = b ? { x: direction > 0 ? b.x : b.x + b.w, y: center(b).y } : gate;
  const mid = (fromEdge + toEdge) / 2;
  const points = [start, { x: mid, y: start.y }, { x: mid, y: gate.y }, gate, { x: end.x, y: gate.y }, end];
  return { gate, points };
}

export function buildConduitRoutes(
  layout: PurdueLayout,
  conduits: readonly Conduit[],
  assets: readonly Asset[],
  wires: readonly NetworkWire[],
): ConduitRoute[] {
  const zones = new Map(layout.zones.map((zone) => [zone.name, zone]));
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const wiresByZonePair = new Map<string, NetworkWire[]>();
  for (const wire of wires) {
    const a = assetsById.get(wire.from)?.network.area;
    const b = assetsById.get(wire.to)?.network.area;
    if (a === undefined || b === undefined || a === b) continue;
    const key = pairKey(a, b);
    const group = wiresByZonePair.get(key) ?? [];
    group.push(wire);
    wiresByZonePair.set(key, group);
  }

  const routes: ConduitRoute[] = [];
  for (const conduit of conduits) {
    const from = zones.get(conduit.from);
    const to = zones.get(conduit.to);
    if (!from || !to || from === to) continue;
    const matches = (id: string) => assetsById.get(id)?.network.conduit === conduit.id;
    const score = (wire: NetworkWire) => 4 * Number(matches(wire.from) || matches(wire.to))
      + 2 * Number(wire.from === conduit.enforcedBy || wire.to === conduit.enforcedBy)
      + Number(wire.active);
    const candidates = wiresByZonePair.get(pairKey(from.name, to.name)) ?? [];
    const wire = candidates.filter((candidate) => layout.anchors.has(candidate.from) && layout.anchors.has(candidate.to))
      .reduce<NetworkWire | undefined>((best, candidate) =>
        !best || score(candidate) > score(best) ? candidate : best, undefined);

    const port = (zone: Zone): Port | undefined => {
      const wireId = wire && [wire.from, wire.to].find((id) => assetsById.get(id)?.network.area === zone.name);
      const id = wireId ?? assets.find((asset) => asset.network.area === zone.name && (
        asset.id === conduit.enforcedBy || matches(asset.id)
      ))?.id;
      const box = id ? layout.anchors.get(id) : undefined;
      return id && box ? { id, box } : undefined;
    };
    const a = port(from);
    const b = port(to);
    const disjointLevels = from.last < to.first || to.last < from.first;
    const differentLevels = a?.box.level !== undefined && b?.box.level !== undefined && a.box.level !== b.box.level;
    const useVertical = disjointLevels || (to.first !== from.first && differentLevels);
    const geometry = useVertical
      ? verticalRoute(layout, from, to, a?.box, b?.box)
      : horizontalRoute(from, to, a?.box, b?.box);
    routes.push({
      ...geometry, conduit, fromId: a?.id, toId: b?.id, wireKey: wire && pairKey(wire.from, wire.to),
      enforcerKind: conduit.enforcedBy ? assetsById.get(conduit.enforcedBy)?.physical.kind : undefined,
    });
  }
  return routes;
}

export function conduitForStep(routes: readonly ConduitRoute[], from: string, to: string, a: Anchor, b: Anchor) {
  const pair = pairKey(from, to);
  const direct = routes.find((route) => route.wireKey === pair);
  if (direct) return direct;
  const fromZone = a.zone ?? PURDUE_LEVELS.find(({ level }) => level === a.level)?.name;
  const toZone = b.zone ?? PURDUE_LEVELS.find(({ level }) => level === b.level)?.name;
  if (!fromZone || !toZone || fromZone === toZone) return undefined;
  const matches = routes.filter(({ conduit }) => pairKey(conduit.from, conduit.to) === pairKey(fromZone, toZone));
  return matches.length === 1 ? matches[0] : undefined;
}
