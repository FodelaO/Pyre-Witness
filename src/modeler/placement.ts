/** Reuses the floor footprint search and validates Purdue zones for a proposed asset. */
import { clearPlacementPoint, networkAt } from "@/pipeline/assetFromProfile";
import { areaById, areaCenter, assetById } from "@/twin/geometry";
import { PURDUE_LEVELS, type Asset, type PurdueLevel, type Twin } from "@/twin/types";
import type { ModelDecision } from "./schemas";
import type { ObservedItem } from "./types";

export function hasZone(twin: Twin, physicalArea: Asset["physical"]["area"], level: PurdueLevel, zone: string) {
  return areaById(twin, physicalArea)?.name === zone
    || twin.assets.some(({ network }) => network.area === zone && network.level === level);
}

export function modelPlacement(
  twin: Twin,
  item: ObservedItem,
  decision: ModelDecision,
  assetId: string,
  report: (reason: string) => void,
): Asset | undefined {
  const area = twin.areas.find(({ id, kind }) => id === decision.area && kind !== "context");
  if (!area) {
    report(`Unknown placement room ${decision.area ?? "(none)"}.`);
    return;
  }
  const level = PURDUE_LEVELS.find((entry) => entry.level === decision.level)?.level;
  if (level === undefined) {
    report("Missing or invalid Purdue level.");
    return;
  }
  const anchor = decision.near_asset_id ? assetById(twin, decision.near_asset_id) : undefined;
  if (decision.near_asset_id && (!anchor || anchor.physical.area !== area.id)) {
    report(`Ignored unavailable room anchor ${decision.near_asset_id}.`);
  }
  const preferred = anchor?.physical.area === area.id ? anchor.physical : areaCenter(area);
  const asset: Asset = {
    id: assetId, name: item.label,
    physical: { area: area.id, x: preferred.x, y: preferred.y, kind: item.kind, rotation: 0, connections: [] },
    network: { level, area: area.name, conduit: null },
    origin: "added", status: "ok", placement: "neutral", criticality: 2,
  };
  const point = clearPlacementPoint(twin, asset, area, preferred);
  if (!point) {
    report(`No clear footprint in ${area.name}.`);
    return;
  }
  Object.assign(asset.physical, point);
  if (decision.network_zone && hasZone(twin, area.id, asset.network.level, decision.network_zone)) {
    asset.network.area = decision.network_zone;
  } else {
    if (decision.network_zone) report(`Ignored unknown Purdue ${asset.network.level} zone ${decision.network_zone}.`);
    asset.network = networkAt(twin, asset.physical, item.kind, asset.network.level);
  }
  return asset;
}

export function stillFits(twin: Twin, asset: Asset): boolean {
  const area = areaById(twin, asset.physical.area);
  if (!area) return false;
  const { x, y } = asset.physical;
  const point = clearPlacementPoint(twin, asset, area, { x, y });
  return Boolean(point && Math.abs(point.x - x) < 0.001 && Math.abs(point.y - y) < 0.001);
}
