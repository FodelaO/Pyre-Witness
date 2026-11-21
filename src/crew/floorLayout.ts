/** Places crew callouts inside the viewport and around occupied screen regions. */
import { FOOTPRINT } from "@/equipment/types";
import { assetLabel } from "@/floor/assetLabel";
import type { Point } from "@/twin/geometry";
import type { Asset } from "@/twin/types";

export interface Box extends Point { w: number; h: number }
const clamp = (n: number, low: number, high: number) => Math.min(Math.max(n, low), Math.max(low, high));
export const collides = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && a.x + a.w > b.x - pad
  && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;

export const MAX_AVATAR_SCALE = 1.2;
export const DESK_AVATAR_WIDTH = 74;

export function avatarScale(inverse: number, limit = MAX_AVATAR_SCALE): number {
  return Math.min(limit, Math.min(1.16 * inverse, Math.max(.72 * inverse, .53 + .53 * inverse)));
}

export function avatarBounds({ x, y }: Point, scale: number): Box {
  return { x: x - 35 * scale, y: y - 33 * scale, w: 70 * scale, h: 85 * scale };
}

export function equipmentBounds(asset: Asset, inverse: number): Box {
  const { x, y, kind, scale = 1, rotation } = asset.physical;
  const size = FOOTPRINT[kind];
  const angle = rotation * Math.PI / 180;
  const width = scale * (Math.abs(size.w * Math.cos(angle)) + Math.abs(size.h * Math.sin(angle)));
  const height = scale * (Math.abs(size.w * Math.sin(angle)) + Math.abs(size.h * Math.cos(angle)));
  const w = Math.max(width + 6, (assetLabel(asset).length * 6 + 6) * inverse);
  return { x: x - w / 2, y: y - height / 2 - 12 * inverse, w, h: height + 34 * inverse };
}

export function placePatrolCallout(anchor: Point, size: Pick<Box, "w" | "h">, viewport: Box,
  occupied: Box[], equipment: Box[], scale: number, portraitScale: number): Box | null {
  const { w, h } = size;
  const inset = 8 * scale;
  if (w + 2 * inset > viewport.w) return null;
  const nearest = equipment.reduce<{ distance: number; x: number }>((best, box) => {
    const x = box.x + box.w / 2;
    const distance = Math.hypot(anchor.x - x, anchor.y - box.y - box.h / 2);
    return distance < best.distance ? { x, distance } : best;
  }, { distance: Infinity, x: anchor.x });
  const away = anchor.x < nearest.x ? -1 : 1;
  const center = anchor.x - w / 2;
  const above = anchor.y - 33 * portraitScale - h - 6 * scale;
  for (const lift of [0, 16, 34, 56]) {
    const y = above - lift * scale;
    if (y < viewport.y + inset || y + h > viewport.y + viewport.h - inset) continue;
    for (const shift of [.36 * away, 0, .66 * away, -.36 * away, -.66 * away]) {
      const x = clamp(center + w * shift, viewport.x + inset, viewport.x + viewport.w - w - inset);
      const box = { x, y, w, h };
      if (![...occupied, ...equipment].some((obstacle) => collides(box, obstacle, 4 * scale))) return box;
    }
  }
  return null;
}

export function placeCallout(anchor: Point, size: Pick<Box, "w" | "h">, viewport: Box, occupied: Box[], scale: number, preferLeft = false): Box | null {
  const { w, h } = size;
  const inset = 10 * scale;
  if (w + 2 * inset > viewport.w || h + 2 * inset > viewport.h) return null;
  const x0 = viewport.x + inset;
  const y0 = viewport.y + inset;
  const x1 = viewport.x + viewport.w - w - inset;
  const y1 = viewport.y + viewport.h - h - inset;
  const left = anchor.x - 41 * scale - w;
  const right = anchor.x + 41 * scale;
  const middle = anchor.x - w / 2;
  const above = anchor.y - 37 * scale - h;
  const below = anchor.y + 61 * scale;
  const sameLine = anchor.y - h / 2;
  const first = preferLeft ? left : right;
  const second = preferLeft ? right : left;
  const options = [
    { x: first, y: sameLine }, { x: middle, y: above }, { x: second, y: sameLine }, { x: middle, y: below },
    { x: first, y: above }, { x: second, y: above }, { x: first, y: below }, { x: second, y: below },
  ];
  for (const offset of [.2, .5, .8]) {
    options.push({ x: x0, y: y0 + (y1 - y0) * offset }, { x: x1, y: y0 + (y1 - y0) * offset });
  }
  for (const { x, y } of options) {
    const box = { x: clamp(x, x0, x1), y: clamp(y, y0, y1), w, h };
    if (!occupied.some((obstacle) => collides(box, obstacle, 8 * scale))) return box;
  }
  return null;
}

export function placeFloorLabel(preferred: Box, anchor: Point, viewport: Box, occupied: Box[], scale: number): Box | null {
  const clear = (label: Box) => label.x >= viewport.x && label.y >= viewport.y
    && label.x + label.w <= viewport.x + viewport.w && label.y + label.h <= viewport.y + viewport.h
    && !occupied.some((box) => collides(label, box, 4 * scale));
  if (clear(preferred)) return preferred;
  const { w, h } = preferred;
  const x = anchor.x - w / 2;
  const y = anchor.y - h / 2;
  for (const spacing of [24, 48, 72, 96, 120, 144, 168]) {
    const gap = spacing * scale;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const label = { x: x + dx * gap, y: y + dy * gap, w, h };
      if (clear(label)) return label;
    }
  }
  return null;
}
