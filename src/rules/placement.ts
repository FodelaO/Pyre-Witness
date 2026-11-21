/** Enumerates supported room, Purdue level and network-zone combinations for a device. */
import { areaCenter, containsPoint } from "@/twin/geometry";
import type { Area, Asset, EquipmentKind, PurdueLevel, Twin } from "@/twin/types";

const CONTROL_LEVELS: Partial<Record<EquipmentKind, readonly PurdueLevel[]>> = {
  instrument: [0, 1],
  plc_cabinet: [1],
  hmi: [2, 3],
  usb_drive: [0, 1, 2, 3, 3.5, 4],
};
const PROCESS_EQUIPMENT: ReadonlySet<EquipmentKind> = new Set([
  "vertical_tank", "bullet_tank", "agitated_tank", "pump", "valve", "ro_skid", "uv_reactor", "carbo_cooler",
  "heat_exchanger", "rotary_filler", "conveyor", "labeler", "palletizer", "chiller_compressor", "condenser",
]);

function candidateZones(twin: Twin, asset: Asset, area: Area, level: PurdueLevel): string[] {
  const { x, y, w, h } = area.bounds;
  const local = twin.assets.filter((peer) => peer.id !== asset.id && peer.network.level === level
    && (peer.physical.area === area.id || containsPoint(area, peer.physical.x, peer.physical.y)));
  const related = local.length ? local : twin.assets.filter((peer) => peer.id !== asset.id && peer.network.level === level
    && twin.areas.some((room) => room.id === peer.physical.area && room.kind !== "context"
      && room.bounds.x <= x && room.bounds.y <= y && room.bounds.x + room.bounds.w >= x + w
      && room.bounds.y + room.bounds.h >= y + h));
  const zones = new Set(related.map((peer) => peer.network.area));
  if (area.id === asset.physical.area && level === asset.network.level) zones.add(asset.network.area);
  if (!zones.size) zones.add(area.name);
  return [...zones].sort();
}

export function* placementCandidates(twin: Twin, asset: Asset): Generator<{ area: Area; candidate: Asset }> {
  const allowedLevels = CONTROL_LEVELS[asset.physical.kind]
    ?? (PROCESS_EQUIPMENT.has(asset.physical.kind) ? [0, 1] : undefined);

  for (const area of twin.areas) {
    const point = area.id === asset.physical.area ? asset.physical : areaCenter(area);
    for (const level of new Set(area.typicalLevels)) {
      if (allowedLevels && !allowedLevels.includes(level)) continue;
      for (const zone of candidateZones(twin, asset, area, level)) {
        yield {
          area,
          candidate: {
            ...asset,
            physical: { ...asset.physical, area: area.id, x: point.x, y: point.y },
            network: {
              ...asset.network,
              area: zone,
              level,
              conduit: zone === asset.network.area ? asset.network.conduit : null,
            },
          },
        };
      }
    }
  }
}
