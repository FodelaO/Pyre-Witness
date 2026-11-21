/** Selects the facts Carbon needs to recommend a placement in the fictional twin. */
import { placementEnvironment } from "@/pipeline/assetFromProfile";
import type { DeviceProfile, SelfCheckResult } from "@/pipeline/types";
import { isPlantHome } from "@/rules/engine";
import type { Area, Asset, Twin } from "@/twin/types";

export interface AssessmentContext {
  profile: DeviceProfile;
  twin: Twin;
  candidate: Asset;
  reassess: boolean;
  asDropped: SelfCheckResult;
}

type ContextSize = "standard" | "retry";

export function areaFacts({ bounds: { x, y, w, h }, attrs }: Area) {
  return [[x, y, w, h], [
    ...Object.entries(attrs).filter(([, value]) => value === true).map(([key]) => key),
    ...(attrs.hazard ? [attrs.hazard] : []),
  ]] as const;
}

export function conditionOverlays(twin: Twin) {
  return twin.areas
    .filter(({ id, kind }) => kind === "context" && !isPlantHome(id))
    .map(areaFacts);
}

function keySpecs(profile: DeviceProfile) {
  const short = (value: string | null) => value?.replace(/\s+/g, " ").trim().slice(0, 96) || undefined;
  return {
    capacity_or_size: short(profile.capacity_or_size),
    material: short(profile.material),
    ingress_protection: short(profile.ip_rating),
    hazardous_area_rating: short(profile.hazardous_area_rating),
    radios: profile.radios.length ? [...new Set(profile.radios)] : undefined,
    power: short(profile.power),
  };
}

function techniqueIds(asset: Asset, check: SelfCheckResult): string[] {
  const { cyber, physical } = asset;
  const ids = new Set(check.findings.flatMap(({ technique }) => technique ? [technique.id] : []));
  for (const { steps } of check.paths) {
    for (const { technique } of steps) if (technique) ids.add(technique.id);
  }
  if (cyber?.radios.length) ids.add("T0860");
  if (cyber?.removableStorage || cyber?.ports.some((port) => /usb/i.test(port))) ids.add("T0847");
  if (cyber?.cloudConnected) ids.add("T0883");
  if (cyber?.remoteAccess) ids.add("T0822");
  if (cyber?.defaultCredentials) ids.add("T1694.001");
  if (physical.kind === "ip_camera") ids.add("T0882");
  if (physical.kind === "laptop") ids.add("T0864");
  return [...ids].sort();
}

function compactTwin(twin: Twin, candidate: Asset, size: ContextSize) {
  const anchors = new Set(twin.conduits.flatMap(({ enforcedBy }) => enforcedBy ? [enforcedBy] : []));
  const linked = new Set(twin.assets.flatMap(({ physical }) => physical.connections
    .filter(({ medium, active }) => medium === "network" && active !== false).map(({ to }) => to)));
  const peers = twin.assets.filter(({ id, physical }) => id !== candidate.id && isPlantHome(physical.area));
  const relevance = (asset: Asset) =>
    Number(anchors.has(asset.id)) * 8
    + Number(asset.physical.area === candidate.physical.area) * 4
    + Number(asset.physical.kind === candidate.physical.kind) * 2
    + Number(asset.network.level === candidate.network.level)
    + asset.criticality / 10;
  const shortlist = new Set(peers.toSorted((a, b) => relevance(b) - relevance(a))
    .slice(0, size === "standard" ? 36 : 18).map(({ id }) => id));
  const omitted: Partial<Record<Asset["physical"]["area"], Partial<Record<Asset["physical"]["kind"], number>>>> = {};
  const assets = peers.flatMap((asset) => {
    const { id, physical, network, criticality, cyber, safetyCritical } = asset;
    const { area, kind, connections } = physical;
    const networkLinks = connections.filter(({ medium, active }) => medium === "network" && active !== false)
      .map(({ to }) => to);
    if (!shortlist.has(id)
      || (!cyber && network.level === 0 && !safetyCritical && !networkLinks.length && !linked.has(id)
      && !anchors.has(id) && kind !== candidate.physical.kind)) {
      const counts = omitted[area] ??= {};
      counts[kind] = (counts[kind] ?? 0) + 1;
      return [];
    }
    const flags = cyber ? [
      ...cyber.radios, cyber.cloudConnected && "cloud", cyber.remoteAccess && "remote",
      cyber.defaultCredentials && "default-credentials", cyber.removableStorage && "removable-storage",
      !cyber.managed && "unmanaged",
    ].filter(Boolean) : [];
    return [[id, kind, area, network.level, network.area, criticality, flags]];
  });
  return {
    area_columns: "id,name,levels,[x,y,width,height],restrictions",
    areas: twin.areas.filter(({ id }) => isPlantHome(id)).map((area) => [
      area.id, area.name, area.typicalLevels, ...areaFacts(area),
    ]),
    condition_overlays: conditionOverlays(twin),
    asset_columns: "id,kind,room,level,zone,criticality,cyber_flags",
    assets,
    other_equipment_counts: omitted,
    zones_by_level: Object.fromEntries([...new Set(peers.map(({ network }) => network.level))].map((level) =>
      [level, [...new Set(peers.flatMap(({ network }) => network.level === level ? [network.area] : []))]])),
    conduits: twin.conduits.map(({ id, from, to, enforcedBy, allows }) =>
      ({ id, from, to, enforcedBy, allows: size === "retry" ? undefined : allows })),
    entry_points: twin.entryPoints.map(({ id, kind, area, reach }) => ({ id, kind, area, reach })),
  };
}

export function reviewablePaths({ paths }: SelfCheckResult) {
  return paths.filter(({ steps }) => steps.length <= 4).slice(0, 4);
}

export function placementContext({ profile, twin, candidate, reassess, asDropped }: AssessmentContext, size: ContextSize = "standard") {
  const { id, physical: { area, x, y }, network } = candidate;
  return {
    request: reassess ? "Reassess this device after the move." : "Assess the proposed device.",
    device: {
      type: profile.device_type, kind: profile.physical_kind, category: profile.category, object_class: profile.object_class,
      identity: [profile.vendor, profile.model].filter(Boolean).join(" ") || undefined,
      ports: profile.ports.slice(0, 8).map((port) => port.slice(0, 64)), storage: profile.storage?.slice(0, 96),
      cloud: profile.cloud_connectivity, default_credentials: profile.default_credentials_visible,
      food_grade: profile.food_grade, key_specs: keySpecs(profile),
      evidence: profile.evidence.slice(0, size === "standard" ? 3 : 1).map(({ claim }) => claim.slice(0, 180)),
      unknowns: profile.unknowns.slice(0, size === "standard" ? 3 : 1).map((item) => item.slice(0, 140)),
      confidence: profile.confidence,
    },
    candidate_id: id,
    current_placement: {
      area, x, y, level: network.level, zone: network.area,
      environment: placementEnvironment(twin, candidate.physical),
    },
    inspector: {
      passed: asDropped.passed,
      findings: asDropped.findings.map(({ ruleId, assetId, severity, detail }) => [ruleId, assetId, severity, detail]),
      exposure_options: reviewablePaths(asDropped).map(({ severity, likelihood, impact }, index) =>
        [index + 1, severity, likelihood, impact]),
    },
    twin: compactTwin(twin, candidate, size),
    allowed_ics_techniques: techniqueIds(candidate, asDropped),
  };
}
