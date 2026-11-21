/** Indexes the facts shared by the Inspector's rules and reachability checks. */
import { techniqueById } from "@/data/attack-ics";
import type {
  Area, AreaId, Asset, AttackPath, Conduit, EntryPoint, RuleFinding, Severity, Technique, Twin,
} from "@/twin/types";
import { spatialEvidence } from "./spatial";

export { PUBLIC_PORT_RANGE } from "./spatial";

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
  highConsequenceTargets: ReadonlyMap<string, Asset>;
  networkPairs: readonly (readonly [Asset, Asset])[];
  entryPointsByKind: ReadonlyMap<EntryPoint["kind"], readonly EntryPoint[]>;
  paths: readonly AttackPath[];
  areasFor(asset: Asset): readonly Area[];
  nearPublic(asset: Asset, units: number): boolean;
  nearFoodContact(asset: Asset, units: number): boolean;
  rfExposed(asset: Asset): boolean;
  rfEntries(asset: Asset): readonly EntryPoint[];
  visitorEntries(asset: Asset): readonly EntryPoint[];
  physicalEntries(asset: Asset): readonly EntryPoint[];
  links(asset: Asset): readonly Asset[];
  hasNetworkLink(asset: Asset): boolean;
  hasPowerLink(asset: Asset): boolean;
  hasCyberSurface(asset: Asset): boolean;
  hasDeclaredLocalLink(asset: Asset): boolean;
  hasActiveLocalLink(asset: Asset): boolean;
  hasDisabledLink(aId: string, bId: string): boolean;
  hasDeclaredZoneLink(aZone: string, bZone: string): boolean;
  crossingConduits(a: Asset, b: Asset): readonly Conduit[];
  isEnforced(conduit: Conduit): boolean;
  isNetworked(asset: Asset): boolean;
  hasEnforcedDmz(asset: Asset): boolean;
  technique(id: string): Technique | undefined;
}

function addToIndex<K, V>(index: Map<K, V[]>, key: K, value: V) {
  const values = index.get(key);
  if (values) values.push(value);
  else index.set(key, [value]);
}

function addPair(index: Map<string, Set<string>>, a: string, b: string) {
  const [first, second] = a < b ? [a, b] : [b, a];
  const values = index.get(first);
  if (values) values.add(second);
  else index.set(first, new Set([second]));
}

function hasPair(index: ReadonlyMap<string, ReadonlySet<string>>, a: string, b: string): boolean {
  return (a < b ? index.get(a)?.has(b) : index.get(b)?.has(a)) ?? false;
}

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function otherZone(conduit: Conduit, zone: string): string | undefined {
  if (conduit.from === zone) return conduit.to;
  if (conduit.to === zone) return conduit.from;
}

const contexts = new WeakMap<Twin, RuleContext>();
const techniques = new Map<string, Technique>();
const NO_LINKS: readonly Asset[] = [];
const NO_CONDUITS: readonly Conduit[] = [];

function technique(id: string): Technique | undefined {
  const cached = techniques.get(id);
  if (cached) return cached;
  const found = techniqueById(id);
  if (!found) return undefined;
  const result = Object.freeze({ id: found.id, name: found.name });
  techniques.set(id, result);
  return result;
}

function indexTwin(twin: Twin): RuleContext {
  const assetById = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const areaById = new Map(twin.areas.map((area) => [area.id, area]));
  const conduitById = new Map(twin.conduits.map((conduit) => [conduit.id, conduit]));
  const zoneAssets = new Map<string, Asset[]>();
  const highConsequenceTargets = new Map<string, Asset>();
  const neighbors = new Map<string, Set<Asset>>();
  const conduitsByPair = new Map<string, Map<string, Conduit[]>>();
  const conduitsByZone = new Map<string, Conduit[]>();
  const enforcedConduits = new Set<Conduit>();
  const dmzZones = new Set<string>();
  const otZones = new Set<string>();
  const declaredLocalLinks = new Set<string>();
  const activeLocalLinks = new Set<string>();
  const declaredZoneLinks = new Map<string, Set<string>>();
  const disabledLinks = new Map<string, Set<string>>();
  const powerLinked = new Set<string>();
  const activeConnections: [from: Asset, to: Asset][] = [];

  for (const asset of twin.assets) {
    addToIndex(zoneAssets, asset.network.area, asset);
    for (const link of asset.physical.connections) {
      if (link.medium === "power" && link.active !== false && link.to !== asset.id && assetById.has(link.to)) {
        powerLinked.add(asset.id);
        powerLinked.add(link.to);
      }
      if (link.medium !== "network" || link.to === asset.id) continue;
      const peer = assetById.get(link.to);
      if (!peer) continue;
      if (asset.network.area === peer.network.area) {
        declaredLocalLinks.add(asset.id);
        declaredLocalLinks.add(peer.id);
      } else {
        addPair(declaredZoneLinks, asset.network.area, peer.network.area);
      }
      if (link.active === false) addPair(disabledLinks, asset.id, peer.id);
      else activeConnections.push([asset, peer]);
    }
  }
  function addNeighbor(from: Asset, to: Asset) {
    const known = neighbors.get(from.id);
    if (known) known.add(to);
    else neighbors.set(from.id, new Set([to]));
  }
  const networkPairs: [Asset, Asset][] = [];
  for (const pair of activeConnections) {
    const [a, b] = pair;
    if (hasPair(disabledLinks, a.id, b.id) || neighbors.get(a.id)?.has(b)) continue;
    networkPairs.push(pair);
    if (a.network.area === b.network.area) {
      activeLocalLinks.add(a.id);
      activeLocalLinks.add(b.id);
    }
    addNeighbor(a, b);
    addNeighbor(b, a);
  }
  const activePeers = new Map<string, readonly Asset[]>();
  for (const [id, peers] of neighbors) activePeers.set(id, [...peers]);

  for (const conduit of twin.conduits) {
    const [from, to] = conduit.from < conduit.to ? [conduit.from, conduit.to] : [conduit.to, conduit.from];
    let destinations = conduitsByPair.get(from);
    if (!destinations) {
      destinations = new Map();
      conduitsByPair.set(from, destinations);
    }
    addToIndex(destinations, to, conduit);
    addToIndex(conduitsByZone, conduit.from, conduit);
    addToIndex(conduitsByZone, conduit.to, conduit);
    const kind = conduit.enforcedBy ? assetById.get(conduit.enforcedBy)?.physical.kind : undefined;
    if (kind === "firewall" || kind === "network_switch") enforcedConduits.add(conduit);
  }

  const links = (asset: Asset) => activePeers.get(asset.id) ?? NO_LINKS;
  const hasNetworkLink = (asset: Asset) => activePeers.has(asset.id);
  // Placement metadata alone can describe an offline asset's location.
  const hasCyberSurface = (asset: Asset) => Boolean(asset.cyber) || hasNetworkLink(asset);
  const isEnforced = (conduit: Conduit) => enforcedConduits.has(conduit);

  function crossingConduits(a: Asset, b: Asset): readonly Conduit[] {
    const from = a.network.area;
    const to = b.network.area;
    if (from === to) return NO_CONDUITS;
    return (from < to ? conduitsByPair.get(from)?.get(to) : conduitsByPair.get(to)?.get(from)) ?? NO_CONDUITS;
  }

  const networked = new Set<string>();
  for (const asset of twin.assets) {
    if (hasCyberSurface(asset)) {
      if (asset.criticality >= 4 || asset.safetyCritical) highConsequenceTargets.set(asset.id, asset);
      if (asset.network.level === 3.5) dmzZones.add(asset.network.area);
      if (asset.network.level <= 3) otZones.add(asset.network.area);
    }
    const conduit = asset.network.conduit ? conduitById.get(asset.network.conduit) : undefined;
    if (asset.network.ip || asset.network.protocols?.length || hasNetworkLink(asset)
      || (conduit && otherZone(conduit, asset.network.area)) || asset.cyber?.cloudConnected || asset.cyber?.remoteAccess) {
      networked.add(asset.id);
    }
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
      if (!otZones.has(next)) continue;
      for (const conduit of conduitsByZone.get(next) ?? []) {
        const destination = otherZone(conduit, next);
        if (destination && !visited.has(destination) && isEnforced(conduit)) toCheck.push(destination);
      }
    }
    return false;
  }

  return {
    ...spatialEvidence(twin),
    twin, assetById, areaById, conduitById, zoneAssets, highConsequenceTargets, networkPairs,
    paths: [], links, hasNetworkLink, hasPowerLink: (asset) => powerLinked.has(asset.id), hasCyberSurface,
    crossingConduits, isEnforced,
    isNetworked: (asset) => networked.has(asset.id),
    hasDeclaredLocalLink: (asset) => declaredLocalLinks.has(asset.id),
    hasActiveLocalLink: (asset) => activeLocalLinks.has(asset.id),
    hasDisabledLink: (aId, bId) => hasPair(disabledLinks, aId, bId),
    hasDeclaredZoneLink: (aZone, bZone) => hasPair(declaredZoneLinks, aZone, bZone),
    hasEnforcedDmz, technique,
  };
}

export function createContext(twin: Twin): RuleContext {
  const cached = contexts.get(twin);
  if (cached) return cached;
  const context = indexTwin(twin);
  contexts.set(twin, context);
  return context;
}
