/** Shares position-dependent rule evidence across immutable plant drag frames. */
import { areasAt, containsPoint, distance, UNITS_PER_METRE, type Point } from "@/twin/geometry";
import type { Area, Asset, EntryPoint, Twin } from "@/twin/types";

const RF_RANGE = 30 * UNITS_PER_METRE;
// The twin records symbol centers, so allow half a metre around the 5 m screening radius.
export const PUBLIC_PORT_RANGE = 5.5 * UNITS_PER_METRE;

function distanceToAreas(point: Point, areas: readonly Area[]): number {
  let closest = Infinity;
  for (const { bounds: b } of areas) {
    const dx = Math.max(b.x - point.x, 0, point.x - (b.x + b.w));
    const dy = Math.max(b.y - point.y, 0, point.y - (b.y + b.h));
    closest = Math.min(closest, Math.hypot(dx, dy));
  }
  return closest;
}

interface PositionEvidence {
  areas: readonly Area[];
  publicDistance: number;
  foodDistance: number;
  rf?: { exposed: boolean; entries: readonly EntryPoint[] };
  visitors?: readonly EntryPoint[];
  physicalEntries?: readonly EntryPoint[];
}

function indexSpatialEvidence(twin: Twin) {
  const publicAreas = twin.areas.filter((area) => area.attrs.publicAccess);
  const untrustedAreas = twin.areas.filter((area) => area.attrs.publicAccess || area.attrs.outdoor);
  const foodAreas = twin.areas.filter((area) => area.attrs.foodContact);
  const entriesByKind = new Map<EntryPoint["kind"], EntryPoint[]>();
  for (const entry of twin.entryPoints) {
    const entries = entriesByKind.get(entry.kind);
    if (entries) entries.push(entry);
    else entriesByKind.set(entry.kind, [entry]);
  }
  const rfPoints = entriesByKind.get("rf") ?? [];
  const physicalPoints = entriesByKind.get("physical") ?? [];
  const visitorPoints = physicalPoints.flatMap((point) => {
    const areas = publicAreas.filter((area) => area.id === point.area || containsPoint(area, point.x, point.y));
    return areas.length || (!point.area && point.id === "visitor") ? [{ point, areas }] : [];
  });
  const unzonedVisitors = visitorPoints.filter(({ point }) => !point.area).map(({ point }) => point);
  const positions = new WeakMap<Asset["physical"], PositionEvidence>();

  function positionEvidence(physical: Asset["physical"]): PositionEvidence {
    const cached = positions.get(physical);
    if (cached) return cached;
    const evidence = {
      areas: areasAt(twin, physical.x, physical.y),
      publicDistance: distanceToAreas(physical, publicAreas),
      foodDistance: distanceToAreas(physical, foodAreas),
    };
    positions.set(physical, evidence);
    return evidence;
  }

  function rfEvidence(physical: Asset["physical"]) {
    const evidence = positionEvidence(physical);
    if (evidence.rf) return evidence.rf;
    const entries: EntryPoint[] = [];
    let nearest: EntryPoint | undefined;
    let nearestDistance = Infinity;
    for (const point of rfPoints) {
      const d = distance(physical, point);
      if (d <= (point.reach ?? RF_RANGE)) entries.push(point);
      if (!nearest || d < nearestDistance || (d === nearestDistance && point.id < nearest.id)) {
        nearest = point;
        nearestDistance = d;
      }
    }
    const exposed = entries.length > 0 || distanceToAreas(physical, untrustedAreas) <= RF_RANGE;
    if (exposed && entries.length === 0 && nearest) entries.push(nearest);
    return evidence.rf = { exposed, entries };
  }

  function visitorEntries(asset: Asset): readonly EntryPoint[] {
    const evidence = positionEvidence(asset.physical);
    if (evidence.visitors) return evidence.visitors;
    if (evidence.publicDistance > PUBLIC_PORT_RANGE) return evidence.visitors = [];
    const entries = visitorPoints.filter(({ areas }) => distanceToAreas(asset.physical, areas) <= PUBLIC_PORT_RANGE);
    return evidence.visitors = entries.length ? entries.map(({ point }) => point) : unzonedVisitors;
  }

  return {
    entryPointsByKind: entriesByKind as ReadonlyMap<EntryPoint["kind"], readonly EntryPoint[]>,
    areasFor: (asset: Asset) => positionEvidence(asset.physical).areas,
    nearPublic: (asset: Asset, units: number) => positionEvidence(asset.physical).publicDistance <= units,
    nearFoodContact: (asset: Asset, units: number) => positionEvidence(asset.physical).foodDistance <= units,
    rfExposed: (asset: Asset) => rfEvidence(asset.physical).exposed,
    rfEntries: (asset: Asset) => rfEvidence(asset.physical).entries,
    visitorEntries,
    physicalEntries(asset: Asset): readonly EntryPoint[] {
      const evidence = positionEvidence(asset.physical);
      if (evidence.physicalEntries) return evidence.physicalEntries;
      const visitors = visitorEntries(asset);
      return evidence.physicalEntries = [...visitors, ...physicalPoints.filter((entry) =>
        entry.id !== "visitor" && entry.area === asset.physical.area && !visitors.includes(entry),
      )];
    },
  };
}

type SpatialEvidence = ReturnType<typeof indexSpatialEvidence>;
const spatialByAreas = new WeakMap<Twin["areas"], WeakMap<Twin["entryPoints"], SpatialEvidence>>();

export function spatialEvidence(twin: Twin): SpatialEvidence {
  let byEntries = spatialByAreas.get(twin.areas);
  if (!byEntries) {
    byEntries = new WeakMap();
    spatialByAreas.set(twin.areas, byEntries);
  }
  const cached = byEntries.get(twin.entryPoints);
  if (cached) return cached;
  // Keep the static arrays, without retaining the first frame's asset inventory.
  const evidence = indexSpatialEvidence({ ...twin, assets: [], conduits: [] });
  byEntries.set(twin.entryPoints, evidence);
  return evidence;
}
