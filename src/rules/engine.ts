/** Evaluates plant risk and candidate placements with the Inspector's deterministic rules. */
import { applyEffect } from "@/twin/effects";
import type { AreaId, Asset, AttackPath, PurdueLevel, RiskReport, RuleFinding, Twin } from "@/twin/types";
import { compareText, createContext } from "./context";
import { buildGraph } from "./graph";
import { findPaths } from "./paths";
import { placementCandidates } from "./placement";
import { placementFindings, safetyFindings, sortFindings } from "./registry";
import { scoreRisk } from "./score";

export { explainRule } from "./registry";

function withCandidate(twin: Twin, candidate: Asset): Twin {
  const assets = twin.assets.some((asset) => asset.id === candidate.id)
    ? twin.assets.map((asset) => asset.id === candidate.id ? candidate : asset)
    : [...twin.assets, candidate];
  return { ...twin, assets };
}

function assess(twin: Twin, focusAssetId?: string) {
  const ctx = createContext(twin);
  const direct = placementFindings(ctx);
  const graph = buildGraph(ctx, direct);
  const paths = findPaths(ctx, graph, focusAssetId);
  return { ctx, direct, graph, paths };
}

function findingKey(finding: RuleFinding): string {
  return JSON.stringify([finding.ruleId, finding.assetId, finding.detail]);
}

function baselineFindings(twin: Twin, assetId: string): Map<string, number> {
  const baseline = applyEffect(twin, { type: "remove_asset", assetId });
  return new Map(placementFindings(createContext(baseline)).map((finding) => [findingKey(finding), finding.severity]));
}

function concernsPlacement(finding: RuleFinding, assetId: string, baseline: ReadonlyMap<string, number>): boolean {
  return finding.assetId === assetId || finding.severity > (baseline.get(findingKey(finding)) ?? 0);
}

export function evaluateTwin(twin: Twin): RiskReport {
  const { ctx, direct, paths } = assess(twin);
  const findings = sortFindings([...direct, ...safetyFindings({ ...ctx, paths })]);
  return { ...scoreRisk(ctx, findings, paths), findings, paths, computedAt: Date.now() };
}

export function evaluatePlacement(twin: Twin, asset: Asset): { findings: RuleFinding[]; paths: AttackPath[] } {
  const baseline = baselineFindings(twin, asset.id);
  const { ctx, direct, paths } = assess(withCandidate(twin, asset), asset.id);
  const findings = direct.filter((finding) => concernsPlacement(finding, asset.id, baseline));
  return { findings: sortFindings([...findings, ...safetyFindings({ ...ctx, paths })]), paths };
}

interface RankedPlacement {
  area: AreaId;
  level: PurdueLevel;
  networkArea: string;
  score: number;
  blocking: RuleFinding[];
}

export function rankPlacements(twin: Twin, asset: Asset): RankedPlacement[] {
  const baseline = baselineFindings(twin, asset.id);
  const ranked = Array.from(placementCandidates(twin, asset), ({ area, candidate }) => {
    const { ctx, direct, graph, paths } = assess(withCandidate(twin, candidate));
    const { score } = scoreRisk(ctx, direct, paths);
    const candidatePaths = findPaths(ctx, graph, asset.id);
    const blocking = sortFindings([
      ...direct.filter((finding) => finding.severity >= 4 && concernsPlacement(finding, asset.id, baseline)),
      ...safetyFindings({ ...ctx, paths: candidatePaths }),
    ]);
    return {
      placement: { area: area.id, level: candidate.network.level, networkArea: candidate.network.area, score, blocking },
      publicExposure: Number(area.attrs.publicAccess || area.attrs.outdoor),
      levelChange: Math.abs(asset.network.level - candidate.network.level),
      distanceMoved: Math.hypot(asset.physical.x - candidate.physical.x, asset.physical.y - candidate.physical.y),
    };
  });
  return ranked.sort((a, b) => a.placement.score - b.placement.score
    || a.placement.blocking.length - b.placement.blocking.length || a.publicExposure - b.publicExposure
    || a.levelChange - b.levelChange || a.distanceMoved - b.distanceMoved
    || compareText(a.placement.area, b.placement.area) || a.placement.level - b.placement.level
    || compareText(a.placement.networkArea, b.placement.networkArea)).map(({ placement }) => placement);
}
