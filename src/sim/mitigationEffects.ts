/** Stable mitigation identity and evidence-based deduplication for simulation proposals. */
import { compareText, createContext } from "@/rules/context";
import type { MitigationEffect, RiskReport, Twin } from "@/twin/types";
import { PHYSICAL_INGRESS_PROTECTIONS } from "./scenarios/evidence";
import type { SimRun, SimulationMitigation } from "./types";

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]));
  });
}

function scope(effect: MitigationEffect): string {
  if ("assetId" in effect) return `asset:${effect.assetId}`;
  if (effect.type === "enforce_conduit") return `conduit:${effect.conduitId}`;
  if (effect.type === "set_area_attr") return `area:${effect.areaId}`;
  return "";
}

export function mitigationEffectKey(effects: readonly MitigationEffect[]): string {
  // Independent edits commute. Asset removal can also edit other assets and conduits.
  const ordered = effects.some(({ type }) => type === "remove_asset")
    ? effects : [...effects].sort((left, right) => compareText(scope(left), scope(right)));
  return stableJson(ordered);
}

const physicalAccessGuards = new Set<string>(PHYSICAL_INGRESS_PROTECTIONS);

function effectiveState(twin: Twin): string {
  const assets = twin.assets.map((asset) => {
    if (!asset.protections?.length) return asset;
    // The rules and the exercises model these hardware choices as the same port guard.
    const protections = [...new Set(asset.protections.map((guard) =>
      physicalAccessGuards.has(guard) ? PHYSICAL_INGRESS_PROTECTIONS[0] : guard,
    ))].sort();
    return { ...asset, protections };
  });
  return stableJson({ ...twin, assets });
}

export interface MitigationProjection {
  mitigation: SimulationMitigation;
  twin: Twin;
  run: Omit<SimRun, "counterfactual">;
  risk: RiskReport;
}

function comparisonEvidence({ run, risk }: MitigationProjection): string {
  const stages = run.stages.map((stage) => ({ ...stage, by: undefined }));
  const { score, band, findings, paths, byArea } = risk;
  return stableJson({ stages, containedAt: run.containedAt, metrics: run.consequence.metrics, score, band, findings, paths, byArea });
}

function redundantLinkRemoval(context: ReturnType<typeof createContext>, effect: MitigationEffect): boolean {
  if (effect.type !== "remove_connection" || effect.medium !== "network") return false;
  const from = context.assetById.get(effect.assetId);
  const to = context.assetById.get(effect.to);
  if (!from || !to || from.network.area === to.network.area) return false;
  const boundaries = context.crossingConduits(from, to);
  return boundaries.length > 0 && boundaries.every((boundary) =>
    context.isEnforced(boundary) && boundary.allows.length === 0,
  );
}

export function uniqueMitigationProjections(twin: Twin, projections: MitigationProjection[]): SimulationMitigation[] {
  if (projections.length < 2) return projections.map(({ mitigation }) => mitigation);
  const context = createContext(twin);
  const ranked = projections.map((projection, index) => ({
    index,
    mitigation: projection.mitigation,
    state: effectiveState(projection.twin),
    evidence: comparisonEvidence(projection),
    effects: new Map(projection.mitigation.effects.map((effect) => [stableJson(effect), effect])),
  })).sort((left, right) => left.effects.size - right.effects.size || left.index - right.index);
  const distinct: typeof ranked = [];

  for (const candidate of ranked) {
    const duplicate = distinct.some((kept) => {
      if (kept.evidence !== candidate.evidence) return false;
      if (kept.state === candidate.state) return true;
      // Keep the smaller equivalent control when the larger one only disconnects an already denied link.
      return kept.effects.size < candidate.effects.size
        && [...kept.effects.keys()].every((key) => candidate.effects.has(key))
        && [...candidate.effects].every(([key, effect]) => kept.effects.has(key) || redundantLinkRemoval(context, effect));
    });
    if (!duplicate) distinct.push(candidate);
  }
  return distinct.sort((left, right) => left.index - right.index).map(({ mitigation }) => mitigation);
}
