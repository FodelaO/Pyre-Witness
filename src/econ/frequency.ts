/** Derives FAIR contact frequency and loss conversion from modeled exposure and controls. */
import { createContext, PUBLIC_PORT_RANGE, type RuleContext } from "@/rules/context";
import { evaluateTwin } from "@/rules/engine";
import { buildGraph, type AttackGraph } from "@/rules/graph";
import { hasPhysicalPortProtection } from "@/rules/protections";
import { applyEffects } from "@/twin/effects";
import type { Asset, AttackPath, AttackVia, EntryPoint, MitigationEffect, Twin } from "@/twin/types";
import { FREQUENCY, type ThreePoint } from "./economics";
import type { LossAssumption, LossScenario } from "./types";

type Exposure = keyof typeof FREQUENCY.exposure;
type Conversion = keyof typeof FREQUENCY.conversion;

const exposureLabels: Record<Exposure, string> = {
  internet: "Internet-facing",
  cloud: "Cloud connection",
  remote: "Vendor remote access",
  rf: "Radio within untrusted reach",
  visitor: "Visitor physical reach",
  removable: "Removable or transient media",
  internal: "Internal access",
};

const conversionLabels: Record<Conversion, string> = {
  kev: "CISA KEV prior",
  cvssBase: "CVSS 0 conversion prior",
  cvssMaximum: "CVSS 10 conversion prior",
  credential: "Default credentials prior",
  unmanaged: "Outside patch management prior",
  compliance: "Compliance gap prior",
  generic: "General detection prior",
};

interface Route {
  basis: "rules" | "modeled" | "internal";
  exposure: Exposure;
  entry?: EntryPoint;
  hops: number;
  conduits: readonly string[];
  assets: readonly string[];
}

function externalBoundary(context: RuleContext, asset: Asset): string[] {
  const boundary = asset.network.conduit ? context.conduitById.get(asset.network.conduit) : undefined;
  const touchesZone = boundary && (boundary.from === asset.network.area || boundary.to === asset.network.area);
  return touchesZone && context.isEnforced(boundary) && !asset.cyber?.radios.includes("cellular") ? [boundary.id] : [];
}

function mechanism(via: AttackVia, entry: EntryPoint | undefined, landing: Asset): Exposure {
  switch (via) {
    case "internet": return landing.network.level === 5 || !landing.cyber?.cloudConnected ? "internet" : "cloud";
    case "remote": return "remote";
    case "rf": return "rf";
    case "usb": return "removable";
    case "physical": return entry?.id === "visitor" ? "visitor" : "removable";
    default: return "internal";
  }
}

function shortest(routes: Map<Exposure, Route>, candidate: Route): boolean {
  const existing = routes.get(candidate.exposure);
  if (existing && ((existing.basis === "rules" && candidate.basis !== "rules")
    || (existing.basis === candidate.basis && (existing.hops < candidate.hops
      || (existing.hops === candidate.hops && existing.conduits.length <= candidate.conduits.length))))) return false;
  routes.set(candidate.exposure, candidate);
  return true;
}

function crossedBoundaries(context: RuleContext, from: Asset, to: Asset): string[] {
  const boundaries = context.crossingConduits(from, to);
  // Parallel conduits imply one crossing, and only when every alternative has enforcement.
  return boundaries.length && boundaries.every(context.isEnforced) ? [boundaries[0].id] : [];
}

function directRoutes(context: RuleContext, asset: Asset): Route[] {
  const result: Route[] = [];
  const add = (exposure: Exposure, entry?: EntryPoint, conduits: readonly string[] = []) => {
    if (entry) result.push({ basis: "modeled", exposure, entry, hops: 0, conduits, assets: [asset.id] });
  };
  const internet = context.entryPointsByKind.get("internet")?.[0];
  const remote = context.entryPointsByKind.get("remote")?.[0];
  const boundary = asset.network.conduit ? context.conduitById.get(asset.network.conduit) : undefined;
  const publicZone = boundary && [boundary.from, boundary.to].some((zone) =>
    context.zoneAssets.get(zone)?.some((peer) => peer.network.level === 5) || zone === "Internet / Cloud");
  if ((asset.network.level === 5 && context.isNetworked(asset)) || (publicZone && asset.physical.kind === "firewall")) {
    add("internet", internet, externalBoundary(context, asset));
  }
  if (asset.cyber?.cloudConnected) add("cloud", internet, externalBoundary(context, asset));
  if (asset.cyber?.remoteAccess) add("remote", remote, externalBoundary(context, asset));
  if (asset.cyber?.radios.some((radio) => radio !== "nfc")) {
    add("rf", context.rfEntries(asset)[0]);
  }

  const visitor = context.visitorEntries(asset)[0];
  const exposedPort = Boolean(asset.cyber?.ports.length) && !hasPhysicalPortProtection(asset);
  const physicalAccess = context.areasFor(asset).some((area) => area.attrs.publicAccess)
    || (exposedPort && context.nearPublic(asset, PUBLIC_PORT_RANGE));
  if (physicalAccess) add("visitor", visitor ?? context.twin.entryPoints.find((entry) => entry.id === "visitor"));

  const removable = !hasPhysicalPortProtection(asset) && (asset.cyber?.removableStorage
    || asset.cyber?.ports.some((port) => /\busb|\bsd\b|removable/i.test(port)));
  const portable = asset.physical.kind === "usb_drive"
    || ((asset.physical.kind === "laptop" || asset.physical.kind === "phone") && asset.cyber?.managed === false);
  if (removable || portable) {
    const entry = context.physicalEntries(asset).find((point) => point.id !== "visitor")
      ?? context.entryPointsByKind.get("supply")?.[0] ?? visitor;
    add("removable", entry);
  }
  return result;
}

interface ExposureTopology {
  graph: AttackGraph;
  routesByAsset: Map<string, Map<Exposure, Route>>;
}

const exposureCache = new WeakMap<Twin, ExposureTopology>();

/** Annotates the rules engine's existing graph with the shortest access route per mechanism. */
function exposureTopology(twin: Twin): ExposureTopology {
  const cached = exposureCache.get(twin);
  if (cached) return cached;
  const context = createContext(twin);
  const graph = buildGraph(context, evaluateTwin(twin).findings);
  const routesByAsset = new Map<string, Map<Exposure, Route>>();
  const queue: Route[] = [];
  function add(assetId: string, route: Route) {
    let routes = routesByAsset.get(assetId);
    if (!routes) routesByAsset.set(assetId, routes = new Map());
    if (shortest(routes, route)) queue.push(route);
  }

  for (const asset of twin.assets) {
    for (const candidate of directRoutes(context, asset)) add(asset.id, candidate);
  }
  for (const edge of graph.entries) {
    const asset = context.assetById.get(edge.to);
    if (!asset) continue;
    const exposure = mechanism(edge.via, edge.entry, asset);
    const conduits = exposure === "remote" || exposure === "cloud" || exposure === "internet"
      ? externalBoundary(context, asset) : [];
    add(asset.id, { basis: "rules", exposure, entry: edge.entry, hops: 0, conduits, assets: [asset.id] });
  }
  for (let i = 0; i < queue.length; i++) {
    const route = queue[i];
    const assetId = route.assets.at(-1)!;
    if (routesByAsset.get(assetId)?.get(route.exposure) !== route) continue;
    const from = context.assetById.get(assetId)!;
    for (const edge of graph.network.get(assetId) ?? []) {
      const to = context.assetById.get(edge.to);
      if (!to || route.assets.includes(to.id)) continue;
      const conduits = [...new Set([...route.conduits, ...crossedBoundaries(context, from, to)])];
      add(to.id, { ...route, hops: route.hops + 1, conduits, assets: [...route.assets, to.id] });
    }
  }

  const topology = { graph, routesByAsset };
  exposureCache.set(twin, topology);
  return topology;
}

function reportedRoute(context: RuleContext, graph: AttackGraph, asset: Asset, path: AttackPath | undefined): Route | undefined {
  const last = path?.steps.findIndex((step) => step.to === asset.id);
  const first = path?.steps[0];
  const entry = first && context.twin.entryPoints.find((candidate) => candidate.id === first.from);
  const landing = first && context.assetById.get(first.to);
  if (!first || !entry || !landing || last === undefined || last < 0 || !path) return undefined;
  if (!graph.entries.some((edge) => edge.from === first.from && edge.to === first.to && edge.via === first.via)) return undefined;
  const exposure = mechanism(first.via, entry, landing);
  const used = new Set(exposure === "remote" || exposure === "cloud" || exposure === "internet"
    ? externalBoundary(context, landing) : []);
  const assets = [landing.id];
  for (const step of path.steps.slice(1, last + 1)) {
    const from = context.assetById.get(step.from);
    const to = context.assetById.get(step.to);
    if (!from || !to || !graph.network.get(from.id)?.some((edge) => edge.to === to.id && edge.via === step.via)) return undefined;
    if (step.via === "network") crossedBoundaries(context, from, to).forEach((id) => used.add(id));
    assets.push(to.id);
  }
  return { basis: "rules", exposure, entry, hops: last, conduits: [...used], assets };
}

function evidenceFor(trigger: LossScenario["trigger"]): Conversion {
  if (trigger.knownExploited) return "kev";
  if (trigger.cvss !== undefined && Number.isFinite(trigger.cvss)) return "cvssBase";
  if (trigger.evidence === "credential") return "credential";
  if (trigger.evidence === "unmanaged") return "unmanaged";
  if (trigger.evidence === "compliance") return "compliance";
  return "generic";
}

function relevantEffect(effect: MitigationEffect, asset: Asset, route: Route): boolean {
  if ("assetId" in effect) {
    if (effect.type === "add_protection") return effect.assetId === asset.id;
    return route.assets.includes(effect.assetId);
  }
  if (effect.type === "enforce_conduit") return effect.conduitId === asset.network.conduit || route.conduits.includes(effect.conduitId);
  if (effect.type === "set_area_attr") return effect.areaId === asset.physical.area;
  return false;
}

function scale([low, mode, high]: ThreePoint, factor: number): ThreePoint {
  return [low * factor, mode * factor, high * factor];
}

function interpolate(from: ThreePoint, to: ThreePoint, fraction: number): ThreePoint {
  return [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction,
    from[2] + (to[2] - from[2]) * fraction,
  ];
}

function routeFactor(route: Route): number {
  return FREQUENCY.controls.lateralHop.value ** route.hops
    * FREQUENCY.controls.enforcedConduit.value ** route.conduits.length;
}

interface FrequencyInputs {
  /** Threat event frequency, events per year: contact prior x route factors. Exposure lives here only. */
  tef: ThreePoint;
  /** Probability in [0, 1] that a threat event becomes a loss event: trigger evidence x safeguards. */
  vulnerability: ThreePoint;
  drivers: string[];
  assumptions: LossAssumption[];
  path: { entryLabel: string; assetIds: string[]; basis: Route["basis"] };
}

/** Safeguards that resist an attack in progress. Port locks and locked cabinets already removed a route from TEF. */
function resistanceSafeguards(asset: Asset): number {
  const installed = new Set(asset.protections?.map((protection) => protection.trim()).filter(Boolean));
  return [...installed].filter((protection) => !hasPhysicalPortProtection({ ...asset, protections: [protection] })).length;
}

function derive(twin: Twin, asset: Asset, scenario: LossScenario): FrequencyInputs & { route: Route } {
  const context = createContext(twin);
  const { graph, routesByAsset } = exposureTopology(twin);
  const routes = new Map(routesByAsset.get(asset.id));
  const explicit = reportedRoute(context, graph, asset, scenario.path);
  if (explicit) shortest(routes, explicit);
  // Retain the strongest access mechanism after comparing shortest routes by origin class.
  // Exposure estimates represent overlapping opportunities, so they cannot be added.
  let route: Route = { basis: "internal", exposure: "internal", hops: 0, conduits: [], assets: [asset.id] };
  let tef = FREQUENCY.exposure.internal.value;
  const alternatives = [...routes.values()];
  const verified = alternatives.filter((candidate) => candidate.basis === "rules");
  const named = scenario.trigger.exposure?.flatMap((exposure) => routes.get(exposure) ?? [])[0];
  const candidates = explicit ? [routes.get(explicit.exposure) ?? explicit]
    : named ? [named] : verified.length ? verified : alternatives;
  for (const candidate of candidates) {
    const adjusted = scale(FREQUENCY.exposure[candidate.exposure].value, routeFactor(candidate));
    if (route.basis === "internal" || adjusted[1] > tef[1]) {
      route = candidate;
      tef = adjusted;
    }
  }
  const exposureLabel = exposureLabels[route.exposure];
  const drivers = [route.entry && route.entry.name !== exposureLabel ? `${exposureLabel} · ${route.entry.name}` : exposureLabel];
  const assumptions: LossAssumption[] = [{ label: `${exposureLabel} contact prior`, ...FREQUENCY.exposure[route.exposure] }];
  if (route.hops) {
    drivers.push(`Shortest route · ${route.hops} lateral ${route.hops === 1 ? "hop" : "hops"}`);
    assumptions.push({ label: "Per lateral hop", ...FREQUENCY.controls.lateralHop });
  }
  if (route.conduits.length) {
    drivers.push(`Enforced ${route.conduits.join(", ")}`);
    assumptions.push({ label: "Per enforced conduit", ...FREQUENCY.controls.enforcedConduit });
  }

  const conversion = evidenceFor(scenario.trigger);
  const prior = FREQUENCY.conversion[conversion];
  let probability = prior.value;
  assumptions.push({ label: conversionLabels[conversion], ...prior });
  if (conversion === "cvssBase") {
    const score = Math.max(0, Math.min(10, scenario.trigger.cvss ?? 0));
    probability = interpolate(prior.value, FREQUENCY.conversion.cvssMaximum.value, score / 10);
    drivers.push(`Advisory CVSS ${score}`);
    assumptions.push({ label: conversionLabels.cvssMaximum, ...FREQUENCY.conversion.cvssMaximum });
  } else {
    drivers.push(conversionLabels[conversion]);
  }

  let reduction = 1;
  const protectionCount = resistanceSafeguards(asset);
  if (protectionCount) {
    reduction *= FREQUENCY.controls.protection.value ** protectionCount;
    drivers.push(`${protectionCount} installed ${protectionCount === 1 ? "safeguard" : "safeguards"}`);
    assumptions.push({ label: "Per installed safeguard", ...FREQUENCY.controls.protection });
  }
  const [low, mode, high] = scale(probability, reduction);
  return {
    tef, vulnerability: [Math.min(1, low), Math.min(1, mode), Math.min(1, high)], drivers, assumptions, route,
    path: { entryLabel: route.entry?.name ?? exposureLabel, assetIds: [...route.assets], basis: route.basis },
  };
}

export function frequencyInputs(twin: Twin, asset: Asset, scenario: LossScenario): FrequencyInputs {
  const { route, ...current } = derive(twin, asset, scenario);
  const mitigation = scenario.mitigation;
  // An applied mitigation is already in the twin, so the route and safeguards above carry it.
  // An approved one is priced on the twin as it will be, so no control is credited twice.
  if (mitigation?.status !== "approved" || !mitigation.effects.some((effect) => relevantEffect(effect, asset, route))) {
    return current;
  }
  const projectedTwin = applyEffects(twin, mitigation.effects);
  const projectedAsset = projectedTwin.assets.find(({ id }) => id === asset.id);
  const { route: _projectedRoute, ...projected } = projectedAsset ? derive(projectedTwin, projectedAsset, scenario) : { ...current, route };
  const driver = `Approved mitigation · ${mitigation.title}`;
  if (projected.tef[1] !== current.tef[1] || projected.vulnerability[1] !== current.vulnerability[1]) {
    return { ...projected, drivers: [...projected.drivers, driver] };
  }
  // The exposure graph cannot see this effect (for example a credential or patch change).
  return {
    ...current,
    vulnerability: scale(current.vulnerability, FREQUENCY.controls.approvedMitigation.value),
    drivers: [...current.drivers, driver],
    assumptions: [...current.assumptions, { label: "Approved mitigation", ...FREQUENCY.controls.approvedMitigation }],
  };
}
