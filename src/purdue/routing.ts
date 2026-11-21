/** Computes the drawing geometry for network cables and risk overlays. */
import type { Point } from "@/twin/geometry";
import type { Asset } from "@/twin/types";
import type { Anchor } from "./layout";

export interface NetworkWire {
  from: string;
  to: string;
  active: boolean;
}

export function pairKey(first: string, second: string) {
  return JSON.stringify(first < second ? [first, second] : [second, first]);
}

export function networkWires(assets: readonly Asset[]): NetworkWire[] {
  const wires = new Map<string, NetworkWire>();
  for (const asset of assets) {
    for (const { to, medium, active } of asset.physical.connections) {
      if (medium !== "network" || to === asset.id) continue;
      const key = pairKey(asset.id, to);
      wires.set(key, { from: asset.id, to, active: active !== false || wires.get(key)?.active === true });
    }
  }
  return Array.from(wires.values());
}

export function center(box: Anchor): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function wirePoints(from: Anchor, to: Anchor): Point[] {
  const a = center(from);
  const b = center(to);
  const halfGap = (b.y - a.y) / 2;
  if (a.x === b.x && a.y === b.y) return [];
  if (Math.abs(halfGap) < 7) {
    const y = Math.min(from.y, to.y) - 7;
    return [{ x: a.x, y: from.y }, { x: a.x, y }, { x: b.x, y }, { x: b.x, y: to.y }];
  }
  const direction = Math.sign(halfGap);
  const start = { x: a.x, y: a.y + direction * from.h / 2 };
  const end = { x: b.x, y: b.y - direction * to.h / 2 };
  const mid = (start.y + end.y) / 2;
  return [start, { x: start.x, y: mid }, { x: end.x, y: mid }, end];
}

export function wirePath(points: readonly Point[]): string {
  return points.map(({ x, y }, i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}
