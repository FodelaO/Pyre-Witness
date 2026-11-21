/** Updates the twin for floor placement and hands completed moves to the pipeline. */
import { reassessAsset } from "@/pipeline/client";
import { useDropStore } from "@/twin/dropPoint";
import { areaAt, assetById, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { PhysicalPresence } from "@/twin/types";

type Placement = Pick<PhysicalPresence, "x" | "y" | "area">;

export interface AssetMove {
  id: string;
  start: Placement;
  last: Placement;
  offset: Point;
}

function samePlace(a: Placement, b: Placement): boolean {
  return a.x === b.x && a.y === b.y && a.area === b.area;
}

function writeLocation(id: string, next: Placement, expected: Placement): boolean {
  const store = useTwinStore.getState();
  const current = assetById(store.twin, id);
  if (current?.origin !== "added" || !samePlace(current.physical, expected) || samePlace(current.physical, next)) return false;
  store.updateAsset(id, (asset) => ({ ...asset, physical: { ...asset.physical, ...next } }));
  return true;
}

export function pinOnFloor(point: Point): boolean {
  const area = areaAt(useTwinStore.getState().twin, point.x, point.y);
  if (!area) return false;
  useDropStore.getState().setPoint({ ...point, area: area.id });
  return true;
}

export function beginAssetMove(id: string | null, point: Point): AssetMove | null {
  if (!id || useDropStore.getState().armed) return null;
  const asset = assetById(useTwinStore.getState().twin, id);
  if (asset?.origin !== "added") return null;
  const { x, y, area } = asset.physical;
  const start = { x, y, area };
  return { id, start, last: start, offset: { x: x - point.x, y: y - point.y } };
}

export function previewAssetMove(move: AssetMove, point: Point) {
  const x = Math.round((point.x + move.offset.x) * 10) / 10;
  const y = Math.round((point.y + move.offset.y) * 10) / 10;
  const area = areaAt(useTwinStore.getState().twin, x, y);
  if (!area) return;

  const next = { x, y, area: area.id };
  if (writeLocation(move.id, next, move.last)) {
    move.last = next;
    const store = useTwinStore.getState();
    if (store.selectedId !== move.id) store.select(move.id);
  }
}

export function completeAssetMove(move: AssetMove, canceled: boolean): Promise<void> | undefined {
  if (samePlace(move.start, move.last)) return;
  if (canceled) {
    writeLocation(move.id, move.start, move.last);
    return;
  }

  const asset = assetById(useTwinStore.getState().twin, move.id);
  if (asset?.origin === "added" && samePlace(asset.physical, move.last)) return reassessAsset(move.id);
}
