/** Indexes the facts shared by the Inspector's rules and reachability checks. */
import { techniqueById } from "@/data/attack-ics";
import { containsPoint, distance, UNITS_PER_METRE, type Point } from "@/twin/geometry";
import type {
  Area, AreaId, Asset, AttackPath, Conduit, EntryPoint, RuleFinding, Severity, Technique, Twin,
} from "@/twin/types";

const RF_RANGE = 30 * UNITS_PER_METRE;
// The twin records symbol centers, so allow half a metre around the 5 m screening radius.
export const PUBLIC_PORT_RANGE = 5.5 * UNITS_PER_METRE;

export interface RuleEvidence {
  assetId: string;
  severity: Severity;
  detail: string;
  fix?: string;
  techniqueId?: string;
}

export interface Rule {
  id: string;
  title: string;
  kind: RuleFinding["kind"];
  references: readonly string[];
  description: string;
  check(ctx: RuleContext): RuleEvidence[];
}

export interface RuleContext {
  twin: Twin;
  assetById: ReadonlyMap<string, Asset>;
  areaById: ReadonlyMap<AreaId, Area>;
  conduitById: ReadonlyMap<string, Conduit>;
  zoneAssets: ReadonlyMap<string, readonly Asset[]>;
  paths: readonly AttackPath[];
  areasFor(asset: Asset): readonly Area[];
  nearPublic(asset: Asset, units: number): boolean;
  nearFoodContact(asset: Asset, units: number): boolean;
  rfExposed(asset: Asset): boolean;
  rfEntries(asset: Asset): EntryPoint[];
  visitorEntries(asset: Asset): EntryPoint[];
  links(asset: Asset): Asset[];
  crossingConduits(a: Asset, b: Asset): readonly Conduit[];
  isEnforced(conduit: Conduit): boolean;
  isNetworked(asset: Asset): boolean;
  hasEnforcedDmz(asset: Asset): boolean;
  technique(id: string): Technique | undefined;
}

function distanceToArea(point: Point, { bounds: b }: Area): number {
  const dx = Math.max(b.x - point.x, 0, point.x - (b.x + b.w));
  const dy = Math.max(b.y - point.y, 0, point.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

function addToIndex<K, V>(index: Map<K, V[]>, key: K, value: V) {
  const values = index.get(key);
  if (values) values.push(value);
  else index.set(key, [value]);
}

function unorderedPair(a: string, b: string): string {
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function otherZone(conduit: Conduit, zone: string): string | undefined {
  if (conduit.from === zone) return conduit.to;
  if (conduit.to === zone) return conduit.from;
}

export function createContext(twin: Twin): RuleContext {
  const assetById = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const areaById = new Map(twin.areas.map((area) => [area.id, area]));
  const conduitById = new Map(twin.conduits.map((conduit) => [conduit.id, conduit]));
  const zoneAssets = new Map<string, Asset[]>();
  const neighbors = new Map<string, Map<string, Asset>>();
  const conduitsByPair = new Map<string, Conduit[]>();
  const conduitsByZone = new Map<string, Conduit[]>();
  const dmzZones = new Set<string>();
  const localAreas = new Map<string, Area[]>();
  const disabledLinks = new Set<string>();

  for (const asset of twin.assets) {
    addToIndex(zoneAssets, asset.network.area, asset);
    neighbors.set(asset.id, new Map());
    if (asset.network.level === 3.5) dmzZones.add(asset.network.area);
    const { area, x, y } = asset.physical;
    localAreas.set(asset.id, twin.areas.filter((candidate) =>
      candidate.id === area || containsPoint(candidate, x, y),
    ));
    for (const link of asset.physical.connections) {
      if (link.medium === "network" && link.active === false) disabledLinks.add(unorderedPair(asset.id, link.to));
    }
  }
  for (const asset of twin.assets) {
    for (const link of asset.physical.connections) {
      if (link.medium !== "network" || link.to === asset.id || disabledLinks.has(unorderedPair(asset.id, link.to))) continue;
      const peer = assetById.get(link.to);
      if (!peer) continue;
      neighbors.get(asset.id)?.set(peer.id, peer);
      neighbors.get(peer.id)?.set(asset.id, asset);
    }
  }
  for (const conduit of twin.conduits) {
    addToIndex(conduitsByPair, unorderedPair(conduit.from, conduit.to), conduit);
    addToIndex(conduitsByZone, conduit.from, conduit);
    addToIndex(conduitsByZone, conduit.to, conduit);
  }

  const publicAreas = twin.areas.filter((area) => area.attrs.publicAccess);
  const untrustedAreas = twin.areas.filter((area) => area.attrs.publicAccess || area.attrs.outdoor);
  const foodAreas = twin.areas.filter((area) => area.attrs.foodContact);
  const rfPoints = twin.entryPoints.filter((entry) => entry.kind === "rf");
  const visitorPoints = twin.entryPoints.filter((entry) => entry.kind === "physical" && (
    publicAreas.some((area) => area.id === entry.area || containsPoint(area, entry.x, entry.y))
    || (!entry.area && entry.id === "visitor")
  ));

  const near = (asset: Asset, areas: readonly Area[], units: number) => areas.some((area) =>
    area.id === asset.physical.area || distanceToArea(asset.physical, area) <= units,
  );
  const rfInReach = (asset: Asset, entry: EntryPoint) =>
    distance(asset.physical, entry) <= (entry.reach ?? RF_RANGE);
  const links = (asset: Asset) => [...(neighbors.get(asset.id)?.values() ?? [])];
  const crossingConduits = (a: Asset, b: Asset) =>
    a.network.area === b.network.area ? [] : conduitsByPair.get(unorderedPair(a.network.area, b.network.area)) ?? [];

  function isEnforced(conduit: Conduit): boolean {
    const enforcer = conduit.enforcedBy ? assetById.get(conduit.enforcedBy) : undefined;
    const kind = enforcer?.physical.kind;
    return kind === "firewall" || kind === "network_switch";
  }

  function isNetworked(asset: Asset): boolean {
    const conduit = asset.network.conduit ? conduitById.get(asset.network.conduit) : undefined;
    return Boolean(asset.network.ip || asset.network.protocols?.length || neighbors.get(asset.id)?.size
      || (conduit && otherZone(conduit, asset.network.area)) || asset.cyber?.cloudConnected || asset.cyber?.remoteAccess);
  }

  function hasEnforcedDmz(asset: Asset): boolean {
    const zone = asset.network.area;
    const peers = links(asset);
    // Cellular service can bypass an otherwise protected wired egress.
    if (asset.cyber?.radios.includes("cellular")) return false;
    if (peers.some((peer) => peer.network.level >= 3.5 && (
      !dmzZones.has(peer.network.area) || !crossingConduits(asset, peer).length
      || crossingConduits(asset, peer).some((conduit) => !isEnforced(conduit))
    ))) return false;

    const toCheck: string[] = [];
    for (const member of [asset, ...peers]) {
      if (member.network.area !== zone || !member.network.conduit) continue;
      const conduit = conduitById.get(member.network.conduit);
      if (!conduit || !isEnforced(conduit)) continue;
      const next = otherZone(conduit, zone);
      if (next && next !== zone) toCheck.push(next);
    }
    for (const peer of peers) {
      const crossing = crossingConduits(asset, peer);
      if (crossing.length && crossing.every(isEnforced)) toCheck.push(peer.network.area);
    }

    const visited = new Set([zone]);
    for (const next of toCheck) {
      if (visited.has(next)) continue;
      visited.add(next);
      if (dmzZones.has(next)) return true;
      if (!zoneAssets.get(next)?.some((member) => member.network.level <= 3)) continue;
      for (const conduit of conduitsByZone.get(next) ?? []) {
        const destination = otherZone(conduit, next);
        if (destination && !visited.has(destination) && isEnforced(conduit)) toCheck.push(destination);
      }
    }
    return false;
  }

  return {
    twin, assetById, areaById, conduitById, zoneAssets, paths: [], links, crossingConduits, isEnforced,
    isNetworked, hasEnforcedDmz,
    areasFor: (asset) => localAreas.get(asset.id) ?? [],
    nearPublic: (asset, units) => near(asset, publicAreas, units),
    nearFoodContact: (asset, units) => near(asset, foodAreas, units),
    rfExposed: (asset) => rfPoints.some((entry) => rfInReach(asset, entry)) || near(asset, untrustedAreas, RF_RANGE),
    rfEntries(asset) {
      const withinReach = rfPoints.filter((entry) => rfInReach(asset, entry));
      if (withinReach.length || !near(asset, untrustedAreas, RF_RANGE)) return withinReach;
      const [nearest] = [...rfPoints].sort((a, b) =>
        distance(asset.physical, a) - distance(asset.physical, b) || compareText(a.id, b.id),
      );
      return nearest ? [nearest] : [];
    },
    visitorEntries(asset) {
      if (!near(asset, publicAreas, PUBLIC_PORT_RANGE)) return [];
      const nearby = visitorPoints.filter((point) => publicAreas.some((area) =>
        (area.id === point.area || containsPoint(area, point.x, point.y)) && near(asset, [area], PUBLIC_PORT_RANGE),
      ));
      return nearby.length ? nearby : visitorPoints.filter((point) => !point.area);
    },
    technique(id) {
      const found = techniqueById(id);
      return found ? { id: found.id, name: found.name } : undefined;
    },
  };
}
