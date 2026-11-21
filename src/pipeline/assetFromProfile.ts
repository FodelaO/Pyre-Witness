/** Maps captured evidence to a provisional asset and finds clear floor positions. */
import { FOOTPRINT } from "@/equipment/types";
import { isPlantHome } from "@/rules/engine";
import { areaAt, areaById, areaCenter, areasAt, assetById, containsPoint, distance, type Point } from "@/twin/geometry";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import type { Area, Asset, Connection, EquipmentKind, NetworkPresence, PurdueLevel, Twin } from "@/twin/types";
import type { Assessment, DeviceProfile, DropPoint, ObjectClass } from "./types";

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

const KIND_TAG: Record<EquipmentKind, string> = {
  vertical_tank: "TK", bullet_tank: "VSL", agitated_tank: "MX", pump: "P", valve: "V",
  instrument: "INST", ro_skid: "RO", uv_reactor: "UV", carbo_cooler: "CARB", heat_exchanger: "HX",
  rotary_filler: "FLR", conveyor: "CV", labeler: "LBL", palletizer: "PAL", chiller_compressor: "CMP",
  condenser: "COND", plc_cabinet: "PLC", hmi: "HMI", workstation: "WS", server_rack: "SRV",
  firewall: "FW", network_switch: "SW", wifi_ap: "AP", ip_camera: "CAM", gateway: "GW", laptop: "LT",
  phone: "PH", usb_drive: "USB", generic_device: "DEV",
};

function tagPrefix(profile: DeviceProfile): string {
  if (profile.object_class !== "passive_object") return KIND_TAG[profile.physical_kind];
  const item = profile.device_type;
  if (/\b(mug|cup)s?\b/i.test(item)) return "MUG";
  if (/\bbottles?\b/i.test(item)) return "BTL";
  if (/\b(backpack|bag)s?\b/i.test(item)) return "BAG";
  if (/\bpallets?\b/i.test(item)) return "PLT";
  if (/\blighters?\b/i.test(item)) return "LTR";
  return "OBJ";
}

const rememberedTags = new Map<string, string>();

/** Keeps the browser's run-to-asset receipt available to existing voice tools. */
export function rememberCapturedAssetId(runId: string, id: string): void {
  if (typeof window === "undefined") return;
  rememberedTags.set(runId, id);
  if (rememberedTags.size > 64) {
    const oldest = rememberedTags.keys().next().value;
    if (oldest !== undefined) rememberedTags.delete(oldest);
  }
}

export function capturedAssetId(runId: string, profile?: DeviceProfile, twin?: Twin): string {
  if (!profile || !twin) return rememberedTags.get(runId) ?? `NEW-${runId.slice(0, 8).toUpperCase()}`;
  const used = new Set(twin.assets.flatMap(({ id }) => {
    const match = /^[a-z]+-(\d{3,})$/i.exec(id);
    return match ? [Number(match[1])] : [];
  }));
  let sequence = 901;
  while (used.has(sequence)) sequence += 1;
  return `${tagPrefix(profile)}-${sequence}`;
}

export function resolveDropPoint(twin: Twin, dropPoint?: DropPoint | null): DropPoint {
  if (dropPoint) return dropPoint;
  const preferred = areaById(twin, DEFAULT_DROP.area);
  if (preferred && containsPoint(preferred, DEFAULT_DROP.x, DEFAULT_DROP.y)) return DEFAULT_DROP;
  const plantAreas = twin.areas.filter(({ id }) => isPlantHome(id));
  const area = plantAreas.find((candidate) => candidate.kind !== "context") ?? plantAreas[0];
  if (!area) throw new Error("The plant has no placement areas.");
  return { ...areaCenter(area), area: area.id };
}

export function networkAt(
  twin: Twin,
  point: DropPoint,
  kind: EquipmentKind,
  level?: PurdueLevel,
): NetworkPresence {
  const area = areasAt(twin, point.x, point.y).find(({ id }) => id === point.area);
  const typical = area?.typicalLevels ?? [];
  const preferred = DEVICE_LEVEL[kind] ?? (IT_KINDS.has(kind) || kind === "generic_device" ? 2 : 0);
  const chosenLevel = level ?? (typical.includes(preferred) ? preferred : (typical[0] ?? preferred));
  const peers = twin.assets.filter((asset) => asset.network.level === chosenLevel
    && (asset.physical.area === point.area || (area && containsPoint(area, asset.physical.x, asset.physical.y))));
  const nearest = peers.sort((a, b) => distance(a.physical, point) - distance(b.physical, point))[0];
  return { level: chosenLevel, area: nearest?.network.area ?? area?.name ?? point.area, conduit: null };
}

export function passiveNetworkAt(twin: Twin, area: Area["id"]): NetworkPresence {
  return { level: 0, area: areaById(twin, area)?.name ?? area, conduit: null };
}

/** Reapply passive placement after an asset moves on either view of the twin. */
export function asPassiveObject(twin: Twin, asset: Asset): Asset {
  return {
    ...asset,
    physical: { ...asset.physical, kind: "generic_device", connections: [] },
    network: passiveNetworkAt(twin, asset.physical.area),
    cyber: undefined,
    process: undefined,
  };
}

/** Derives restrictions at the exact point so they follow an asset when it moves. */
export function placementEnvironment(twin: Twin, { x, y }: Point) {
  const areas = areasAt(twin, x, y);
  return {
    zones: areas.map(({ id }) => id),
    hazards: [...new Set(areas.flatMap(({ attrs }) => attrs.hazard ? [attrs.hazard] : []))],
    washdown: areas.some(({ attrs }) => attrs.washdown),
    publicAccess: areas.some(({ attrs }) => attrs.publicAccess),
    restricted: areas.some(({ attrs }) => attrs.restricted),
    outdoor: areas.some(({ attrs }) => attrs.outdoor),
    foodContact: areas.some(({ attrs }) => attrs.foodContact),
  };
}

const MODELED_PLC_LINK = "Simulated PLC Ethernet link. Physical connection unverified.";
const ETHERNET_PORT = /\b(?:ether[ -]?net|profi[ -]?net)\b/i;

function modeledControllerLink(twin: Twin, asset: Asset): Connection | undefined {
  // A serial fieldbus port, or a connector shape alone, does not establish Ethernet compatibility.
  if (asset.physical.kind !== "plc_cabinet" || !asset.cyber?.ports.some((port) => ETHERNET_PORT.test(port))) return;
  let nearest: Asset | undefined;
  let nearestDistance = Infinity;
  for (const peer of twin.assets) {
    if (peer.physical.kind !== "network_switch" || peer.status === "offline" || peer.physical.area !== asset.physical.area
      || peer.network.area !== asset.network.area || peer.network.level !== asset.network.level) continue;
    const separation = distance(peer.physical, asset.physical);
    if (separation < nearestDistance || (separation === nearestDistance && nearest && peer.id < nearest.id)) {
      nearest = peer;
      nearestDistance = separation;
    }
  }
  if (nearest) return { to: nearest.id, medium: "network", label: MODELED_PLC_LINK };
}

/** Keep a capture-time simulated link local after a move without changing deliberate wiring. */
export function refreshModeledControllerLink(twin: Twin, asset: Asset): Asset {
  const isModeled = (link: Connection) => link.medium === "network" && link.label === MODELED_PLC_LINK;
  const { connections } = asset.physical;
  const previous = connections.find(isModeled);
  if (!previous || previous.active === false) return asset;
  const retained = connections.filter((link) => !isModeled(link));
  const next = retained.some(({ medium }) => medium === "network") ? undefined : modeledControllerLink(twin, asset);
  if (next?.to === previous.to) return asset;
  return { ...asset, physical: { ...asset.physical, connections: next ? [...retained, next] : retained } };
}

export function assetFromProfile(profile: DeviceProfile, twin: Twin, id: string, point: DropPoint): Asset {
  const location = { ...point, area: areaAt(twin, point.x, point.y)?.id ?? point.area };
  const passive = profile.object_class === "passive_object";
  const kind = passive ? "generic_device" : profile.physical_kind;
  const hasRemovableStorage = profile.category === "removable_storage"
    || /\b(?:removable|(?:micro[ -]?)?sd(?:hc|xc)?|usb (?:drive|storage))\b/i.test(profile.storage ?? "");
  const hasCyber = !passive && (IT_KINDS.has(kind) || profile.radios.length > 0 || profile.ports.length > 0
    || profile.cloud_connectivity === true || profile.default_credentials_visible || hasRemovableStorage);
  const asset: Asset = {
    id,
    name: [profile.vendor, profile.model].filter(Boolean).join(" ") || profile.device_type,
    description: profile.device_type,
    physical: { ...location, kind, rotation: 0, connections: [] },
    network: passive ? passiveNetworkAt(twin, location.area) : networkAt(twin, location, kind),
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
    // Use the control equipment's provisional operational consequence without assuming a safety role.
    criticality: kind === "plc_cabinet" ? 4 : 2,
    origin: "added",
    status: "ok",
    placement: "neutral",
  };
  const link = modeledControllerLink(twin, asset);
  if (link) asset.physical.connections.push(link);
  return asset;
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
export function atRecommendedPlacement(twin: Twin, asset: Asset, assessment: Assessment, objectClass?: ObjectClass): Asset | null {
  const { physical_placement: physical, placement: network } = assessment;
  if (network.why.startsWith("HOLD:")) return null;
  const area = areaById(twin, physical.area);
  const passive = objectClass === "passive_object";
  if (!area || !isPlantHome(area.id) || (!passive && !knownNetworkLocation(twin, network.network_area, network.conduit))) return null;
  const candidate = passive ? asPassiveObject(twin, asset) : asset;
  const near = physical.near_asset_id ? assetById(twin, physical.near_asset_id) : undefined;
  const preferred = near?.physical ?? (asset.physical.area === area.id ? asset.physical : areaCenter(area));
  const point = clearPlacementPoint(twin, candidate, area, preferred);
  if (!point) return null;
  return {
    ...candidate,
    physical: {
      ...candidate.physical, ...point, area: area.id,
      connections: passive ? [] : physical.connections.filter(({ to }) => to !== asset.id && assetById(twin, to)),
    },
    network: passive
      ? passiveNetworkAt(twin, area.id)
      : { ...candidate.network, level: network.level, area: network.network_area, conduit: network.conduit },
  };
}
