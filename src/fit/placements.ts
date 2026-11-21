/** Resolves the recommendation and any blocked current pin from the active twin. */
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { Assessment, SelfCheckResult } from "@/pipeline/types";
import { evaluatePlacement } from "@/rules/engine";
import { areaById, metres } from "@/twin/geometry";
import type { Asset, RiskReport, RuleFinding, Twin } from "@/twin/types";
import { fitScene } from "./scene";
import type { FitPlacement, FitScene, FitVariant } from "./types";

interface FitOption {
  variant: FitVariant;
  placement: FitPlacement;
  scene: FitScene;
  findings: string[];
}

function findingKey(finding: RuleFinding): string {
  return `${finding.ruleId}:${finding.assetId}`;
}

function blockingTitles(twin: Twin, placed: Asset, risk: RiskReport, selfCheck: SelfCheckResult | null): string[] {
  const observed = new Map([...(selfCheck?.findings ?? []), ...risk.findings]
    .filter(({ severity }) => severity >= 4)
    .map((finding) => [findingKey(finding), finding.title]));
  // The first self-check evaluates the recommendation. Scope all titles to the current asset
  // and its effects so peer findings are included only when this placement actually causes them.
  const titles = evaluatePlacement(twin, placed).findings.filter(({ severity }) => severity >= 4)
    .map((finding) => observed.get(findingKey(finding)) ?? finding.title);
  return [...new Set(titles)].slice(0, 2);
}

export function fitOptions(
  twin: Twin, placed: Asset | undefined, assessment: Assessment, risk: RiskReport, selfCheck: SelfCheckResult | null,
): FitOption[] {
  const physical = assessment.physical_placement;
  const recommendation: FitPlacement = {
    areaId: physical.area,
    nearAssetId: physical.near_asset_id ?? undefined,
    positionHint: physical.position_hint,
    constraints: physical.physical_constraints,
  };
  const recommended = placed && atRecommendedPlacement(twin, placed, assessment);
  const scene = fitScene(twin, recommendation, recommended?.physical, placed?.id);
  const options: FitOption[] = scene ? [{ variant: "recommended", placement: recommendation, scene, findings: [] }] : [];
  if (!placed) return options;

  const findings = blockingTitles(twin, placed, risk, selfCheck);
  const actual = placed.physical;
  const actualArea = areaById(twin, actual.area);
  if (findings.length && actualArea) {
    const east = metres(actual.x - actualArea.bounds.x).toFixed(1);
    const south = metres(actual.y - actualArea.bounds.y).toFixed(1);
    const placement: FitPlacement = {
      areaId: actual.area,
      positionHint: `At the current floor pin, ${east} m east of the area's west edge and ${south} m south of its north edge`,
      constraints: physical.physical_constraints,
    };
    const actualScene = fitScene(twin, placement, actual, placed.id);
    if (actualScene) options.push({ variant: "as_dropped", placement, scene: actualScene, findings });
  }
  return options;
}
