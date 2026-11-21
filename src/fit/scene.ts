/** Extracts visual context from the twin, including overlays at the exact floor position. */
import { areaById, areaCenter, areasAt, assetById, containsPoint, distance, metres, type Point } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { FitPlacement, FitScene } from "./types";

function relativePosition(asset: Point, pin: Point): string {
  const x = Math.round(metres(asset.x - pin.x) * 10) / 10;
  const y = Math.round(metres(asset.y - pin.y) * 10) / 10;
  const eastWest = x ? `${Math.abs(x)} m ${x > 0 ? "east" : "west"}` : "";
  const northSouth = y ? `${Math.abs(y)} m ${y > 0 ? "south" : "north"}` : "";
  return [eastWest, northSouth].filter(Boolean).join(" and ") || "at the device position";
}

export function fitScene(
  twin: Twin,
  { areaId, nearAssetId }: Pick<FitPlacement, "areaId" | "nearAssetId">,
  pin?: Point,
  excludeAssetId?: string,
): FitScene | null {
  const room = areaById(twin, areaId);
  if (!room) return null;
  const anchor = nearAssetId ? assetById(twin, nearAssetId) : undefined;
  const anchorPoint = anchor?.physical;
  const focus = pin ?? (anchorPoint && containsPoint(room, anchorPoint.x, anchorPoint.y) ? anchorPoint : areaCenter(room));
  const localAttrs = [room, ...areasAt(twin, focus.x, focus.y)].map(({ attrs }) => attrs);
  const matches = twin.assets
    .filter((asset) => asset.id !== excludeAssetId)
    .map((asset) => ({ asset, separation: distance(focus, asset.physical) }))
    .filter(({ asset, separation }) => asset.id === nearAssetId || separation <= 80
      || asset.physical.area === areaId || containsPoint(room, asset.physical.x, asset.physical.y))
    .sort((a, b) => Number(b.asset.id === nearAssetId) - Number(a.asset.id === nearAssetId)
      || a.separation - b.separation);
  const windowPanel = matches.find(({ asset, separation }) => separation <= 80 && asset.physical.kind === "hmi"
    && /observation window/i.test(asset.description ?? ""))?.asset;
  const observationWindow = windowPanel && (areaId === "visitor_corridor" ? "corridor"
    : areaId === windowPanel.physical.area ? "production" : undefined);

  return {
    areaName: room.name,
    attrs: {
      washdown: localAttrs.some((attrs) => attrs.washdown),
      restricted: localAttrs.some((attrs) => attrs.restricted),
      publicAccess: localAttrs.some((attrs) => attrs.publicAccess),
      foodContact: localAttrs.some((attrs) => attrs.foodContact),
      outdoor: localAttrs.some((attrs) => attrs.outdoor),
    },
    hazards: [...new Set(localAttrs.flatMap(({ hazard }) => hazard ? [hazard] : []))],
    nearby: matches.slice(0, 3).map(({ asset }) => ({
      name: asset.name,
      kind: asset.physical.kind,
      position: relativePosition(asset.physical, focus),
    })),
    ...(pin && { pin: { x: pin.x, y: pin.y } }),
    ...(observationWindow && { observationWindow }),
  };
}
