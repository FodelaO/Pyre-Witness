/** Maps physical rooms to the network zones and exposure origins represented in Purdue. */
import { assetInArea, entryInArea } from "@/floor/twinFocus";
import type { Area, Twin } from "@/twin/types";

export function linkPhysicalAreas({ areas, assets, entryPoints }: Twin) {
  return new Map(areas.map((area) => [area.id, {
    zones: new Set(assets.filter((asset) => assetInArea(asset, area)).map((asset) => asset.network.area)),
    entries: entryPoints.filter((entry) => entryInArea(entry, area)).map(({ id }) => id),
  }]));
}

export function physicalRoomForZone({ assets, areas }: Twin, zone: string): Area | undefined {
  const members = assets.filter((asset) => asset.network.area === zone);
  return members.length ? areas.find((area) => area.kind !== "context" && members.every((asset) => assetInArea(asset, area))) : undefined;
}
