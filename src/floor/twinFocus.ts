/** Projects shared twin selection and hover onto physical areas and their members. */
import { useMemo } from "react";
import { containsPoint } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Area, Asset, AttackPath, EntryPoint, Twin } from "@/twin/types";

export function assetInArea(asset: Asset, area: Area): boolean {
  return asset.physical.area === area.id || containsPoint(area, asset.physical.x, asset.physical.y);
}

export function entryInArea(entry: EntryPoint, area: Area): boolean {
  return entry.area === area.id || containsPoint(area, entry.x, entry.y);
}

export function projectTwinFocus(
  { areas, assets, entryPoints }: Pick<Twin, "areas" | "assets" | "entryPoints">,
  selectedId: string | null,
  hoveredId: string | null,
  highlightIds: readonly string[],
) {
  const direct = new Set(highlightIds);
  if (hoveredId) direct.add(hoveredId);
  const highlighted = new Set(direct);
  const selectedArea = areas.find(({ id }) => id === selectedId);
  const focusedAreas = areas.filter(({ id }) => id === selectedId || direct.has(id));
  if (selectedArea) {
    for (const asset of assets) if (assetInArea(asset, selectedArea)) highlighted.add(asset.id);
    for (const entry of entryPoints) if (entryInArea(entry, selectedArea)) highlighted.add(entry.id);
  }
  const focused = new Set(highlighted);
  if (selectedId) focused.add(selectedId);
  return { selectedId, hoveredId, highlightIds, selectedArea, focusedAreas, direct, highlighted, focused };
}

export function useTwinFocus({ areas, assets, entryPoints }: Twin) {
  const selectedId = useTwinStore((state) => state.selectedId);
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const highlightIds = useTwinStore((state) => state.highlightIds);
  return useMemo(() => projectTwinFocus({ areas, assets, entryPoints }, selectedId, hoveredId, highlightIds),
    [areas, assets, entryPoints, selectedId, hoveredId, highlightIds]);
}

export function pathHasFocus(path: AttackPath, ids: ReadonlySet<string>): boolean {
  return (path.causedBy !== undefined && ids.has(path.causedBy))
    || ids.has(path.entry) || ids.has(path.target)
    || path.steps.some(({ from, to }) => ids.has(from) || ids.has(to));
}
