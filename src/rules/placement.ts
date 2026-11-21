/** Enumerates supported room and network-placement combinations for equipment and passive objects. */
import { areaCenter, containsPoint } from "@/twin/geometry";
import type { Area, AreaId, Asset, EquipmentKind, PurdueLevel, RuleFinding, Twin } from "@/twin/types";
import type { Rule } from "./context";

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

export const placementHomeRule = {
  id: "PLACE-01",
  title: "Ineligible plant destination",
  kind: "physical",
  references: [],
  description: "The AI crew office is virtual. The washdown and ammonia overlays describe conditions within real plant areas.",
} satisfies Omit<Rule, "check">;

export function isPlantHome(area: AreaId): boolean {
  return area !== "crew_office" && area !== "washdown" && area !== "nh3_hazard";
}

export function checkPlacementHome(asset: Asset, area?: Area): RuleFinding[] {
  if (isPlantHome(asset.physical.area)) return [];
  const areaType = asset.physical.area === "crew_office" ? "a virtual crew area" : "a condition overlay";
  return [{
    ruleId: placementHomeRule.id,
    title: placementHomeRule.title,
    kind: placementHomeRule.kind,
    severity: 4,
    assetId: asset.id,
    detail: `${area?.name ?? asset.physical.area} is ${areaType}.`,
    fix: "Choose a physical plant area and check the conditions at the destination.",
    references: [...placementHomeRule.references],
  }];
}

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

export function* placementCandidates(twin: Twin, asset: Asset, passive = false): Generator<{ area: Area; candidate: Asset }> {
  const allowedLevels = CONTROL_LEVELS[asset.physical.kind]
    ?? (PROCESS_EQUIPMENT.has(asset.physical.kind) ? [0, 1] : undefined);

  for (const area of twin.areas) {
    if (!isPlantHome(area.id) || (passive && area.kind !== "support")) continue;
    const point = area.id === asset.physical.area ? asset.physical : areaCenter(area);
    if (passive && twin.areas.some((room) => room.kind === "process" && containsPoint(room, point.x, point.y))) continue;
    // Purdue fields are nominal placement metadata for offline objects.
    const nominalLevel = area.typicalLevels.includes(asset.network.level) ? asset.network.level : area.typicalLevels[0];
    const levels = passive ? [nominalLevel ?? asset.network.level] : new Set(area.typicalLevels);
    for (const level of levels) {
      if (allowedLevels && !allowedLevels.includes(level)) continue;
      const zones = passive ? [area.name] : candidateZones(twin, asset, area, level);
      for (const zone of zones) {
        yield {
          area,
          candidate: {
            ...asset,
            physical: { ...asset.physical, area: area.id, x: point.x, y: point.y },
            network: {
              ...asset.network,
              area: zone,
              level,
              conduit: !passive && zone === asset.network.area ? asset.network.conduit : null,
            },
          },
        };
      }
    }
  }
}
