/**
 * Floor geometry helpers shared by the floor view, the crew, the rules engine and placement.
 * Pure functions over the Twin. 10 floor units = 1 metre.
 */
import type { Area, AreaId, Asset, EntryPoint, Twin } from "./types";

export interface Point {
  x: number;
  y: number;
}

export const UNITS_PER_METRE = 10;

export function areaById(twin: Twin, id: AreaId): Area | undefined {
  return twin.areas.find((a) => a.id === id);
}

export function assetById(twin: Twin, id: string): Asset | undefined {
  return twin.assets.find((a) => a.id === id);
}

export function entryPointById(twin: Twin, id: string): EntryPoint | undefined {
  return twin.entryPoints.find((e) => e.id === id);
}

/** Position of an asset or an entry point by id (attack-path nodes can be either). */
export function nodePosition(twin: Twin, id: string): Point | undefined {
  const asset = assetById(twin, id);
  if (asset) return { x: asset.physical.x, y: asset.physical.y };
  const entry = entryPointById(twin, id);
  if (entry) return { x: entry.x, y: entry.y };
  return undefined;
}

export function areaCenter(area: Area): Point {
  return { x: area.bounds.x + area.bounds.w / 2, y: area.bounds.y + area.bounds.h / 2 };
}

export function containsPoint(area: Area, x: number, y: number): boolean {
  const b = area.bounds;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

/** Every area containing the point, including overlays such as washdown / nh3_hazard. */
export function areasAt(twin: Twin, x: number, y: number): Area[] {
  return twin.areas.filter((a) => containsPoint(a, x, y));
}

/**
 * The area an asset dropped at (x, y) belongs to: the smallest non-context area containing the
 * point, otherwise the smallest context area (corridor, parking lot), otherwise undefined.
 *
 * NOTE: this is the asset's HOME area (physical.area). Overlay zones such as nh3_hazard and
 * washdown also apply at that point: anything that reasons about hazard / washdown / public
 * access must use areasAt(twin, x, y) and merge the attrs, never only the home area.
 */
export function areaAt(twin: Twin, x: number, y: number): Area | undefined {
  const hits = areasAt(twin, x, y).sort((a, b) => a.bounds.w * a.bounds.h - b.bounds.w * b.bounds.h);
  return hits.find((a) => a.kind !== "context") ?? hits[0];
}

export function isOutdoors(twin: Twin, x: number, y: number): boolean {
  const b = twin.plant.building;
  return !(x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function metres(units: number): number {
  return units / UNITS_PER_METRE;
}

export function clampToArea(area: Area, x: number, y: number, pad = 18): Point {
  const b = area.bounds;
  // An area narrower than two paddings has no padded interior: use its centre line.
  const clamp = (value: number, start: number, size: number) =>
    size < 2 * pad ? start + size / 2 : Math.min(Math.max(value, start + pad), start + size - pad);
  return { x: clamp(x, b.x, b.w), y: clamp(y, b.y, b.h) };
}
