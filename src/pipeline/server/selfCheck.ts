/** Checks the recommended position and the engineer's actual position with the rules engine. */
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { Assessment, SelfCheckResult } from "@/pipeline/types";
import { evaluatePlacement, evaluateTwin, rankPlacements } from "@/rules/engine";
import type { Asset, Twin } from "@/twin/types";

export function checkPlacement(
  twin: Twin,
  candidate: Asset,
  assessment: Assessment,
  disagreements: string[],
  checkCurrent: boolean,
  revised: boolean,
): SelfCheckResult {
  const recommended = atRecommendedPlacement(twin, candidate, assessment);
  const recommendation = recommended && evaluatePlacement(twin, recommended);
  const checked = checkCurrent ? evaluatePlacement(twin, candidate) : recommendation;
  const blocking = recommendation?.findings.filter((finding) => finding.severity >= 4) ?? [];
  const issues = [...disagreements];
  if (!recommended) {
    issues.push("The recommended room has no clear symbol position or its network zone or conduit does not exist in the twin.");
  }
  for (const finding of blocking) {
    issues.push(`${finding.ruleId} blocks the recommended spot: ${finding.detail}`);
  }
  if (recommended) {
    const assets = twin.assets.filter(({ id }) => id !== recommended.id);
    const score = evaluateTwin({ ...twin, assets: [...assets, recommended] }).score;
    const safer = rankPlacements(twin, recommended).find((option) => option.area !== recommended.physical.area
      && !option.blocking.length && (blocking.length > 0 || option.score <= score - 10));
    if (safer) {
      issues.push(`The rules engine ranks ${safer.area} (Purdue ${safer.level}, ${safer.networkArea}) safer at ${safer.score}/100 versus ${score}/100 for the recommendation. Check functional fit before moving.`);
    }
  }
  return {
    passed: Boolean(checked) && !checked?.findings.some((finding) => finding.severity >= 4),
    findings: checked?.findings ?? [],
    paths: checked?.paths ?? [],
    disagreements: [...new Set(issues)],
    revised,
  };
}
