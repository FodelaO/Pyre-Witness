/** Prices equipment by installed scope and derives line reliance from the plant graph. */
import { MEDIA, type Asset, type Medium, type Twin } from "@/twin/types";
import { equipmentCosts, plantEconomics, valuationEconomics, type Assumption, type Consequence } from "./economics";

const capacityPattern = "([0-9][0-9,]*(?:\\.[0-9]+)?)";

function positive(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
}

function quantity(text: string, units: string): number | undefined {
  const match = new RegExp(`${capacityPattern}\\s*(?:${units})`, "i").exec(text);
  return match ? positive(Number(match[1].replaceAll(",", ""))) : undefined;
}

function nameplate(asset: Asset): number | undefined {
  const specification = asset.specs?.capacity ?? "";
  return quantity(specification, "(?:bottles?\\s*/\\s*h|bph|[×x]\\s*\\d+(?:\\.\\d+)?\\s*mL\\s*/\\s*h)\\b");
}

export function lineNameplate(twin: Twin): number {
  const ratings = twin.assets
    .filter(({ physical }) => physical.kind === "rotary_filler")
    .flatMap((asset) => nameplate(asset) ?? []);
  // This twin represents one production line, with one rated filler as its throughput anchor.
  return ratings[0] ?? plantEconomics.nameplateBph.value;
}

type SizingUnit = NonNullable<(typeof equipmentCosts)[Asset["physical"]["kind"]]["reference"]>["unit"];

function sizingValue(asset: Asset, unit: SizingUnit): number | undefined {
  const specification = asset.specs?.capacity ?? "";
  switch (unit) {
    case "L": {
      const cubicMetres = quantity(specification, "m[³3](?!\\s*/)");
      return positive(asset.process?.capacityL)
        ?? quantity(specification, "L(?:itres?)?\\b")
        ?? (cubicMetres === undefined ? undefined : cubicMetres * 1_000);
    }
    case "m³/h": {
      const massFlow = quantity(specification, "kg\\s*/\\s*h\\b");
      return quantity(specification, "m[³3]\\s*/\\s*h\\b")
        ?? (massFlow === undefined ? undefined : massFlow / valuationEconomics.liquidDensityProxy.value);
    }
    case "kg/h": return quantity(specification, "kg\\s*/\\s*h\\b");
    case "kW": return quantity(specification, "kW\\b");
    case "bottles/h": return nameplate(asset);
    case "trays/pallet": return quantity(specification, "trays?\\s*/\\s*pallet\\b");
    case "drawing scale": return positive(asset.physical.scale);
  }
}

function isLineMachinery(asset: Asset): boolean {
  return asset.physical.kind === "generic_device" && asset.process?.running !== undefined
    && (asset.physical.area === "filler3" || asset.physical.area === "packaging");
}

function pricing(asset: Asset) {
  const kind = asset.physical.kind;
  let { base, reference } = equipmentCosts[kind];
  if (isLineMachinery(asset)) {
    // The generic glyph also depicts production machinery whose I/O and install scope are larger.
    base = valuationEconomics.processEquipmentBase;
    reference = { ...valuationEconomics.processEquipmentSize, unit: "drawing scale" };
  }
  if (kind === "heat_exchanger" && !sizingValue(asset, "kW") && sizingValue(asset, "kg/h")) {
    reference = { ...valuationEconomics.kilogramsPerHourReference, unit: "kg/h" };
  }
  const size = reference ? sizingValue(asset, reference.unit) : undefined;
  const ratio = size !== undefined && reference ? size / reference.value : 1;
  const { minSizeRatio, maxSizeRatio, sizeExponent, stainlessPremium, washdownPremium, hazardPremium } = valuationEconomics;
  const factors = [
    { label: "Stainless installation", applies: /stainless|316L\b/i.test(asset.specs?.material ?? ""), assumption: stainlessPremium },
    { label: "Washdown installation", applies: /IP69K/i.test(asset.specs?.ipRating ?? ""), assumption: washdownPremium },
    { label: "Classified installation", applies: Boolean(asset.specs?.hazardRating), assumption: hazardPremium },
  ].filter(({ applies }) => applies);
  const sizeFactor = Math.min(maxSizeRatio.value, Math.max(minSizeRatio.value, ratio)) ** sizeExponent.value;
  return { base, reference, size, factors, replacement: factors.reduce((cost, { assumption }) => cost * assumption.value, base.value * sizeFactor) };
}

export function valuationAssumptions(asset: Asset): { label: string; value: Assumption }[] {
  const { base, reference, size, factors } = pricing(asset);
  const assumptions = [{ label: "Installed cost benchmark", value: base }];
  if (reference && size !== undefined) {
    assumptions.push(
      { label: "Equipment size from twin", value: { ...reference, value: size } },
      { label: "Reference equipment size", value: reference },
      { label: "Size scaling exponent", value: valuationEconomics.sizeExponent },
    );
  }
  assumptions.push(...factors.map(({ label, assumption }) => ({ label, value: assumption })));
  return assumptions;
}

type Feed = { source: Asset; medium: Medium; standby: boolean; active: boolean };
type MaterialGraph = Map<string, string[][]>;

function lineRoots(twin: Twin): Asset[] {
  return twin.assets.filter((asset) => {
    const { kind, area } = asset.physical;
    return kind === "rotary_filler" || kind === "palletizer" || kind === "labeler" || isLineMachinery(asset)
      || (kind === "conveyor" && (area === "filler3" || area === "packaging"));
  });
}

function materialGraph(twin: Twin): MaterialGraph {
  const feeds = new Map<string, Feed[]>();
  for (const source of twin.assets) {
    for (const edge of source.physical.connections) {
      const standby = /standby|redundan|backup/i.test(edge.label ?? "")
        || (edge.active === false && /\bstandby\b/i.test(source.description ?? ""));
      if (!MEDIA[edge.medium].process || (edge.active === false && !standby)) continue;
      if (standby && source.status === "offline") continue;
      const candidates = feeds.get(edge.to) ?? [];
      candidates.push({ source, medium: edge.medium, standby, active: edge.active !== false });
      feeds.set(edge.to, candidates);
    }
  }
  const inputs: MaterialGraph = new Map();
  for (const [target, candidates] of feeds) {
    // Match explicitly identified standby branches to equivalent duty devices at a shared feed.
    // Independent streams of one medium (e.g. syrup and concentrate) remain required together.
    const groups: string[][] = [];
    for (const candidate of candidates) {
      const peers = candidates.filter(({ source, medium }) =>
        medium === candidate.medium && source.physical.kind === candidate.source.physical.kind);
      const alternative = peers.some(({ standby }) => standby) && peers.some(({ active, standby }) => active && !standby);
      if (alternative) {
        if (groups.some((group) => group.includes(candidate.source.id))) continue;
        groups.push([...new Set(peers.map(({ source }) => source.id))]);
      } else if (candidate.active) {
        groups.push([candidate.source.id]);
      }
    }
    inputs.set(target, groups);
  }
  return inputs;
}

function materialOutage(ids: Iterable<string>, inputs: MaterialGraph): Set<string> {
  const unavailable = new Set(ids);
  // Propagate unavailability to a fixed point. Returning utility flow can form cycles.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [target, feeds] of inputs) {
      if (!unavailable.has(target) && feeds.some((group) => group.every((source) => unavailable.has(source)))) {
        unavailable.add(target);
        changed = true;
      }
    }
  }
  return unavailable;
}

function causesLineStop(id: string, roots: Asset[], inputs: MaterialGraph): boolean {
  const unavailable = materialOutage([id], inputs);
  return roots.some(({ id: root }) => unavailable.has(root));
}

function controlNetwork(twin: Twin): Map<string, Set<string>> {
  const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const neighbours = new Map(twin.assets.map(({ id }) => [id, new Set<string>()]));
  for (const asset of twin.assets) {
    for (const link of asset.physical.connections) {
      if (link.medium !== "network" || link.active === false) continue;
      const peer = assets.get(link.to);
      if (!peer || peer.network.area !== asset.network.area) continue;
      neighbours.get(asset.id)?.add(peer.id);
      neighbours.get(peer.id)?.add(asset.id);
    }
  }
  return neighbours;
}

function reachesController(id: string, network: Map<string, Set<string>>, controlIds: Set<string>): boolean {
  const seen = new Set([id]);
  for (const current of seen) {
    for (const peer of network.get(current) ?? []) {
      if (controlIds.has(peer)) return true;
      seen.add(peer);
    }
  }
  return false;
}

const dependencyCache = new WeakMap<Twin, Map<string, number>>();

function dependencies(twin: Twin): Map<string, number> {
  const cached = dependencyCache.get(twin);
  if (cached) return cached;
  const roots = lineRoots(twin);
  const inputs = materialGraph(twin);
  const lineAssets = twin.assets.filter(({ id }) => causesLineStop(id, roots, inputs));
  const lineIds = new Set(lineAssets.map(({ id }) => id));
  const lineZones = new Set(lineAssets.map(({ network }) => network.area));
  const lineAreas = new Set(lineAssets.map(({ physical }) => physical.area));
  const network = controlNetwork(twin);
  const result = new Map<string, number>();

  // The seed stores local PLC roles by cell; most hardwired I/O is described rather than cabled.
  const controllers = twin.assets.filter((asset) =>
    asset.physical.kind === "plc_cabinet" && asset.network.level === 1 && lineZones.has(asset.network.area)
    && (asset.origin === "seed" || network.get(asset.id)?.size));
  const controlIds = new Set(controllers.map(({ id }) => id));
  const permissives = twin.assets.filter((asset) => asset.safetyCritical && asset.physical.connections.some((link) =>
    link.medium === "cip" && lineIds.has(link.to)));

  for (const asset of twin.assets) {
    const { id, network: location, physical: { kind, area } } = asset;
    const neighbours = network.get(id);
    let dependency = 0;
    if (lineIds.has(id) || controlIds.has(id) || permissives.some((safety) =>
      safety.id === id || (asset.safetyCritical && safety.description?.includes(id)))) {
      dependency = 1;
    } else if (kind === "network_switch" && [...(neighbours ?? [])].some((id) => controlIds.has(id) || lineIds.has(id))) {
      dependency = valuationEconomics.switchDisruption.value;
    } else if (kind === "hmi" && reachesController(id, network, controlIds)) {
      dependency = valuationEconomics.operatorDisruption.value;
    } else if (kind === "instrument" && lineZones.has(location.area) && asset.process?.medium !== "cip") {
      dependency = valuationEconomics.instrumentationDisruption.value;
    } else if (asset.origin === "added" && lineAreas.has(area) && twin.areas.some((room) =>
      room.id === area && room.attrs.foodContact)) {
      // An unintegrated object can force a local hygiene stop. It cannot stop a whole control train.
      dependency = valuationEconomics.areaDisruption.value;
    }
    result.set(id, dependency);
  }
  dependencyCache.set(twin, result);
  return result;
}

export function lineDependency(twin: Twin, asset: Asset): number {
  return dependencies(twin).get(asset.id) ?? 0;
}

export function assetValuation(twin: Twin, asset: Asset) {
  const { oee, contributionMargin } = plantEconomics;
  return {
    replacement: pricing(asset).replacement,
    throughputPerHour: lineNameplate(twin) * oee.value * contributionMargin.value,
    dependency: lineDependency(twin, asset),
  };
}

/** Locates process equipment idled by a local control failure or interrupted material flow. */
export function affectedProduction(twin: Twin, origin: Asset, explicitIds: readonly string[], entireLine = false): Asset[] {
  const inputs = materialGraph(twin);
  const roots = lineRoots(twin);
  const localNetwork = controlNetwork(twin);
  const nodes = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const activeMaterial = (asset: Asset) => asset.physical.connections.some(({ medium, active }) =>
    MEDIA[medium].process && active !== false);
  const production = new Set(twin.assets.filter((asset) =>
    asset.process?.running !== false && asset.physical.kind !== "instrument" && asset.physical.kind !== "plc_cabinet"
    && (activeMaterial(asset) || roots.includes(asset))).map(({ id }) => id));
  const explicit = new Set(explicitIds.filter((id) => nodes.has(id)));
  const starting = new Set(explicit);
  if (production.has(origin.id)) starting.add(origin.id);
  if (origin.physical.kind === "plc_cabinet" || origin.physical.kind === "hmi" || origin.physical.kind === "network_switch") {
    const reached = new Set([origin.id]);
    for (const id of reached) for (const peer of localNetwork.get(id) ?? []) reached.add(peer);
    const controlled = origin.physical.kind === "plc_cabinet" || [...reached].some((id) =>
      nodes.get(id)?.physical.kind === "plc_cabinet");
    if (controlled) for (const asset of twin.assets) {
      // Local cell ownership also covers seed equipment whose hardwired I/O has no network edge.
      if (production.has(asset.id) && asset.network.area === origin.network.area) starting.add(asset.id);
    }
  }
  if (origin.safetyCritical) for (const edge of origin.physical.connections) {
    if (edge.medium === "cip" && production.has(edge.to)) starting.add(edge.to);
  }
  if (entireLine) for (const root of roots) starting.add(root.id);
  if (!starting.size) {
    for (const root of roots) if (root.physical.area === origin.physical.area) starting.add(root.id);
    // A modeled shutdown can still have an identified loss locus outside the production cells.
    if (!starting.size) for (const root of roots) if (root.physical.kind === "rotary_filler") starting.add(root.id);
  }

  const unavailable = materialOutage(starting, inputs);
  if (roots.some(({ id, physical }) => physical.kind === "rotary_filler" && unavailable.has(id))) {
    // The seed describes the post-filler conveyor sequence but carries no discrete bottle links.
    for (const { id, physical } of roots) if (physical.area === "filler3" || physical.area === "packaging") unavailable.add(id);
  }
  for (const target of unavailable) {
    for (const group of inputs.get(target) ?? []) for (const id of group) {
      const asset = nodes.get(id);
      const feeding = asset?.physical.connections.some(({ to, medium, active }) =>
        to === target && MEDIA[medium].process && active !== false);
      // Buffered upstream inventory can continue to hold independently of the downstream stop.
      if (feeding && asset && !asset.process?.capacityL && production.has(id)) unavailable.add(id);
    }
  }
  return twin.assets.filter(({ id }) => unavailable.has(id) && (production.has(id) || explicit.has(id)));
}

export function heldProductLitres(asset: Asset): number {
  const { capacityL, levelPct, medium } = asset.process ?? {};
  const capacity = positive(capacityL);
  if (medium !== "product" || capacity === undefined) return 0;
  const filled = levelPct !== undefined && Number.isFinite(levelPct) ? Math.min(100, Math.max(0, levelPct)) / 100 : 1;
  return capacity * filled;
}

/** Inventory vessels on the modeled product path of the affected process equipment. */
export function connectedProductVessels(twin: Twin, affected: readonly Asset[]): Asset[] {
  const links = new Map<string, string[]>();
  for (const { id, physical } of twin.assets) {
    for (const { to, medium, active } of physical.connections) {
      if (medium !== "product" || active === false) continue;
      links.set(id, [...(links.get(id) ?? []), to]);
      links.set(to, [...(links.get(to) ?? []), id]);
    }
  }
  const reachable = new Set(affected.map(({ id }) => id));
  for (const id of reachable) for (const peer of links.get(id) ?? []) reachable.add(peer);
  return twin.assets.filter((asset) => reachable.has(asset.id) && heldProductLitres(asset) > 0);
}

export function productAtRisk(twin: Twin, asset: Asset, consequence: Consequence, recallBatches?: number): number {
  const { bottleLitres, bottlingBatch, recallBatches: batches } = plantEconomics;
  if (consequence === "device") return 0;
  if (consequence === "productRecall") return (recallBatches ?? batches.value[1]) * bottlingBatch.value;
  const { capacityL, levelPct, medium } = asset.process ?? {};
  const capacity = positive(capacityL);
  if ((medium === "product" || medium === "syrup") && capacity !== undefined) {
    const filled = levelPct !== undefined && Number.isFinite(levelPct) ? Math.min(100, Math.max(0, levelPct)) / 100 : 1;
    return capacity * filled / bottleLitres.value;
  }
  return lineDependency(twin, asset) || consequence === "productHold" || consequence === "ammoniaRelease"
    ? bottlingBatch.value : 0;
}
