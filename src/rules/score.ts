/** Converts independent finding and reachability evidence to the plant risk index. */
import type { AreaId, AttackPath, RiskBand, RiskReport, RuleFinding } from "@/twin/types";
import type { RuleContext } from "./context";

const HALF_RISK = 600;

function riskIndex(evidence: number): number {
  return Math.round((10_000 * evidence) / (HALF_RISK + evidence)) / 100;
}

function riskBand(score: number): RiskBand {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "elevated";
  if (score >= 20) return "guarded";
  return "low";
}

interface Contribution {
  weight: number;
  area?: AreaId;
}

function keepLargest(contributions: Map<string, Contribution>, key: string, value: Contribution) {
  const previous = contributions.get(key);
  if (!previous || value.weight > previous.weight
    || (value.weight === previous.weight && (value.area ?? "") < (previous.area ?? ""))) {
    contributions.set(key, value);
  }
}

export function scoreRisk(
  ctx: RuleContext, findings: readonly RuleFinding[], paths: readonly AttackPath[],
): Pick<RiskReport, "score" | "band" | "byArea"> {
  const evidence = new Map<string, Contribution>();
  for (const finding of findings) {
    // SAFE-01 describes the same consequence already scored by its path.
    if (finding.ruleId === "SAFE-01") continue;
    keepLargest(evidence, JSON.stringify([finding.ruleId, finding.assetId]), {
      weight: finding.severity ** 2,
      area: ctx.assetById.get(finding.assetId)?.physical.area,
    });
  }
  for (const path of paths) {
    const via = path.steps[0]?.via;
    if (!via) continue;
    keepLargest(evidence, JSON.stringify([path.entry, via, path.target]), {
      weight: path.severity * path.likelihood,
      area: ctx.assetById.get(path.target)?.physical.area,
    });
  }

  let total = 0;
  const areaWeights = new Map<AreaId, number>();
  for (const { weight, area } of evidence.values()) {
    total += weight;
    if (area) areaWeights.set(area, (areaWeights.get(area) ?? 0) + weight);
  }
  const score = riskIndex(total);
  const byArea = Object.fromEntries([...areaWeights].map(([area, weight]) => [area, riskIndex(weight)]));
  return { score, band: riskBand(score), byArea };
}
