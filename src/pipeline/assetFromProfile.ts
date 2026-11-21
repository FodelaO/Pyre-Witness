/** Maps captured evidence to a provisional asset and finds clear floor positions. */
import { FOOTPRINT } from "@/equipment/types";
import { areaById, areaCenter, assetById, containsPoint, distance, type Point } from "@/twin/geometry";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import type { Area, Asset, EquipmentKind, NetworkPresence, PurdueLevel, Twin } from "@/twin/types";
import type { Assessment, DeviceProfile, DropPoint } from "./types";

const DEVICE_LEVEL: Partial<Record<EquipmentKind, PurdueLevel>> = {
  plc_cabinet: 1,
  hmi: 2,
  instrument: 0,
  workstation: 3,
  server_rack: 3,
  firewall: 3.5,
  laptop: 4,
  phone: 4,
};

const IT_KINDS = new Set<EquipmentKind>([
  "plc_cabinet", "hmi", "workstation", "server_rack", "firewall", "network_switch",
  "wifi_ap", "ip_camera", "gateway", "laptop", "phone", "usb_drive",
]);

export function capturedAssetId(runId: string): string {
  return `NEW-${runId.slice(0, 8).toUpperCase()}`;
}

export function resolveDropPoint(twin: Twin, dropPoint?: DropPoint | null): DropPoint {
  if (dropPoint) return dropPoint;
  const preferred = areaById(twin, DEFAULT_DROP.area);
  if (preferred && containsPoint(preferred, DEFAULT_DROP.x, DEFAULT_DROP.y)) return DEFAULT_DROP;
  const area = twin.areas.find((candidate) => candidate.kind !== "context") ?? twin.areas[0];
  if (!area) throw new Error("The plant has no placement areas.");
  return { ...areaCenter(area), area: area.id };
}

export function networkAt(
  twin: Twin,
  point: DropPoint,
  kind: EquipmentKind,
  level?: PurdueLevel,
): NetworkPresence {
  const area = areaById(twin, point.area);
  const typical = area?.typicalLevels ?? [];
  const preferred = DEVICE_LEVEL[kind] ?? (IT_KINDS.has(kind) || kind === "generic_device" ? 2 : 0);
  const chosenLevel = level ?? (typical.includes(preferred) ? preferred : (typical[0] ?? preferred));
  const peers = twin.assets.filter((asset) => asset.network.level === chosenLevel
    && (asset.physical.area === point.area || (area && containsPoint(area, asset.physical.x, asset.physical.y))));
  const nearest = peers.sort((a, b) => distance(a.physical, point) - distance(b.physical, point))[0];
  return { level: chosenLevel, area: nearest?.network.area ?? area?.name ?? point.area, conduit: null };
}

export function assetFromProfile(profile: DeviceProfile, twin: Twin, id: string, point: DropPoint): Asset {
  const hasRemovableStorage = profile.category === "removable_storage"
    || /\b(?:removable|(?:micro[ -]?)?sd(?:hc|xc)?|usb (?:drive|storage))\b/i.test(profile.storage ?? "");
  const hasCyber = IT_KINDS.has(profile.physical_kind) || profile.radios.length > 0 || profile.ports.length > 0
    || profile.cloud_connectivity === true || profile.default_credentials_visible || hasRemovableStorage;
  return {
    id,
    name: [profile.vendor, profile.model].filter(Boolean).join(" ") || profile.device_type,
    description: profile.device_type,
    physical: { ...point, kind: profile.physical_kind, rotation: 0, connections: [] },
    network: networkAt(twin, point, profile.physical_kind),
    cyber: hasCyber ? {
      vendor: profile.vendor ?? undefined,
      model: profile.model ?? undefined,
      radios: [...profile.radios],
      ports: [...profile.ports],
      removableStorage: hasRemovableStorage,
      cloudConnected: profile.cloud_connectivity === true,
      defaultCredentials: profile.default_credentials_visible,
      remoteAccess: false,
      managed: false,
    } : undefined,
    specs: {
      capacity: profile.capacity_or_size,
      material: profile.material,
      foodGrade: profile.food_grade,
      hazardRating: profile.hazardous_area_rating,
      ipRating: profile.ip_rating,
    },
    criticality: 2,
    origin: "added",
    status: "ok",
    placement: "neutral",
  };
}

function halfFootprint(asset: Asset): Point {
  const { w, h } = FOOTPRINT[asset.physical.kind];
  const angle = asset.physical.rotation * Math.PI / 180;
  const scale = (asset.physical.scale ?? 1) / 2;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return { x: scale * (w * cos + h * sin), y: scale * (w * sin + h * cos) };
}

export function clearPlacementPoint(twin: Twin, asset: Asset, area: Area, preferred: Point): Point | null {
  const half = halfFootprint(asset);
  const { x, y, w, h } = area.bounds;
  const minX = x + half.x + 6;
  const maxX = x + w - half.x - 6;
  const minY = y + half.y + 6;
  const maxY = y + h - half.y - 6;
  if (minX > maxX || minY > maxY) return null;

  const obstacles = twin.assets.filter((peer) => peer.id !== asset.id).map((peer) => ({
    point: peer.physical,
    half: halfFootprint(peer),
  }));
  const clear = (point: Point) => obstacles.every((obstacle) =>
    Math.abs(point.x - obstacle.point.x) >= half.x + obstacle.half.x + 8
    || Math.abs(point.y - obstacle.point.y) >= half.y + obstacle.half.y + 8,
  );
  const anchor = {
    x: Math.min(maxX, Math.max(minX, preferred.x)),
    y: Math.min(maxY, Math.max(minY, preferred.y)),
  };
  if (clear(anchor)) return anchor;

  const columns = Math.min(80, Math.max(1, Math.ceil((maxX - minX) / 10)));
  const rows = Math.min(80, Math.max(1, Math.ceil((maxY - minY) / 10)));
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (let column = 0; column <= columns; column += 1) {
    for (let row = 0; row <= rows; row += 1) {
      const point = { x: minX + column * (maxX - minX) / columns, y: minY + row * (maxY - minY) / rows };
      const separation = distance(point, preferred);
      if (separation < bestDistance && clear(point)) {
        best = point;
        bestDistance = separation;
      }
    }
  }
  return best;
}

export function knownNetworkLocation(twin: Twin, area: string, conduit: string | null): boolean {
  const touches = (link: Twin["conduits"][number]) => link.from === area || link.to === area;
  if (conduit !== null) return twin.conduits.some((link) => link.id === conduit && touches(link));
  return twin.areas.some((room) => room.name === area) || twin.assets.some((asset) => asset.network.area === area)
    || twin.conduits.some(touches);
}

/** Build the same modeled recommendation for the Inspector and the Move button. */
export function atRecommendedPlacement(twin: Twin, asset: Asset, assessment: Assessment): Asset | null {
  const { physical_placement: physical, placement: network } = assessment;
  const area = areaById(twin, physical.area);
  if (!area || !knownNetworkLocation(twin, network.network_area, network.conduit)) return null;
  const near = physical.near_asset_id ? assetById(twin, physical.near_asset_id) : undefined;
  const preferred = near?.physical ?? (asset.physical.area === area.id ? asset.physical : areaCenter(area));
  const point = clearPlacementPoint(twin, asset, area, preferred);
  if (!point) return null;
  return {
    ...asset,
    physical: {
      ...asset.physical, ...point, area: area.id,
      connections: physical.connections.filter(({ to }) => to !== asset.id && assetById(twin, to)),
    },
    network: { ...asset.network, level: network.level, area: network.network_area, conduit: network.conduit },
  };
}
