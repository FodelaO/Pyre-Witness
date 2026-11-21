/** Checks the recommended position and the engineer's actual position with the rules engine. */
import { atRecommendedPlacement, passiveNetworkAt } from "@/pipeline/assetFromProfile";
import type { Assessment, SelfCheckResult } from "@/pipeline/types";
import { bestPlacement, evaluatePlacement, evaluateTwin, isPlantHome, rankPlacements } from "@/rules/engine";
import { areaById } from "@/twin/geometry";
import type { AreaId, Asset, PurdueLevel, Twin } from "@/twin/types";

function verdict(checked: ReturnType<typeof evaluatePlacement> | null, disagreements: string[], revised: boolean): SelfCheckResult {
  return {
    passed: Boolean(checked) && !checked?.findings.some((finding) => finding.severity >= 4),
    findings: checked?.findings ?? [],
    paths: checked?.paths ?? [],
    disagreements: [...new Set(disagreements)],
    revised,
  };
}

export function checkAsDropped(twin: Twin, candidate: Asset): SelfCheckResult {
  return verdict(evaluatePlacement(twin, candidate), [], false);
}

/** Keeps absolute exclusions consistent with the exact configurations the Inspector cleared. */
export function reconcilePlacementExclusions(
  twin: Twin,
  assessment: Assessment,
  checked: SelfCheckResult,
  candidate: Asset,
  asDropped: SelfCheckResult,
) {
  const normalize = (name: string) => name.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const cleared: { area: AreaId; level: PurdueLevel }[] = [];
  if (asDropped.passed) cleared.push({ area: candidate.physical.area, level: candidate.network.level });
  if (checked.passed && !assessment.placement.why.startsWith("HOLD:")) {
    cleared.push({ area: assessment.physical_placement.area, level: assessment.placement.level });
  }
  const superseded = assessment.never_place.filter((exclusion) => cleared.some(({ area, level }) => {
    if (exclusion.level !== null && exclusion.level !== level) return false;
    if (exclusion.area !== null) return exclusion.area === area;
    const name = areaById(twin, area)?.name;
    const where = normalize(exclusion.where);
    return where === normalize(area) || (name !== undefined && where === normalize(name));
  }));
  return {
    assessment: superseded.length
      ? { ...assessment, never_place: assessment.never_place.filter((exclusion) => !superseded.includes(exclusion)) }
      : assessment,
    superseded,
  };
}

export function reviewRecommendation(
  twin: Twin,
  candidate: Asset,
  assessment: Assessment,
  disagreements: string[],
  revised: boolean,
  passive = false,
) {
  const recommended = atRecommendedPlacement(twin, candidate, assessment, passive ? "passive_object" : undefined);
  const recommendation = recommended && evaluatePlacement(twin, recommended);
  const blocking = recommendation?.findings.filter((finding) => finding.severity >= 4) ?? [];
  const revisionReasons: string[] = [];
  if (!recommended) {
    revisionReasons.push("The recommended room has no clear position or names an unknown network zone or conduit.");
  }
  for (const finding of blocking) {
    revisionReasons.push(`${finding.ruleId} blocks the recommended spot: ${finding.detail}`);
  }
  if (recommended) {
    const assets = twin.assets.filter(({ id }) => id !== recommended.id);
    const score = evaluateTwin({ ...twin, assets: [...assets, recommended] }).score;
    const safer = rankPlacements(twin, recommended).find((option) => option.area !== recommended.physical.area
      && !option.blocking.length && (blocking.length > 0 || option.score <= score - 10));
    if (safer) {
      const location = passive ? safer.area : `${safer.area} (Purdue ${safer.level}, ${safer.networkArea})`;
      revisionReasons.push(`The rules engine ranks ${location} safer at ${safer.score}/100 versus ${score}/100 for the recommendation. Check functional fit before moving.`);
    }
  }
  return {
    result: verdict(recommendation, [...disagreements, ...revisionReasons], revised),
    revisionReasons,
  };
}

/** Keeps a blocked recommendation on hold while presenting the best usable room for review. */
export function holdBlockedPlacement(
  twin: Twin,
  candidate: Asset,
  assessment: Assessment,
  checked: SelfCheckResult,
  passive = false,
): { assessment: Assessment; check: () => SelfCheckResult } | null {
  if (checked.passed) return null;

  const mitigations = assessment.mitigations.filter((proposal) => !proposal.effects.some((effect) =>
    effect.type === "move_asset" && effect.assetId === candidate.id && effect.area === assessment.physical_placement.area));
  function usable(option: NonNullable<ReturnType<typeof bestPlacement>["placement"]>) {
    const room = areaById(twin, option.area);
    if (!room || !isPlantHome(room.id)) return null;
    const network = passive ? passiveNetworkAt(twin, room.id) : {
      level: option.level,
      area: option.networkArea,
      conduit: option.networkArea === candidate.network.area ? candidate.network.conduit : null,
    };
    const why = `HOLD: the Architect's placement was blocked. ${room.name} is the least-risk usable option found.`;
    const alternative: Assessment = {
      ...assessment, mitigations,
      placement: { level: network.level, network_area: network.area, conduit: network.conduit, why: room.name },
      physical_placement: {
        area: room.id, near_asset_id: null, connections: [], physical_constraints: [],
        position_hint: `Review placement in ${room.name} with a plant engineer.`,
      },
    };
    const placed = atRecommendedPlacement(twin, candidate, alternative, passive ? "passive_object" : undefined);
    return placed ? { assessment: { ...alternative, placement: { ...alternative.placement, why } }, placed } : null;
  }

  const { placement } = bestPlacement(twin, candidate);
  let option = placement && usable(placement);
  if (placement && !option) {
    for (const alternative of rankPlacements(twin, candidate).slice(1)) {
      option = usable(alternative);
      if (option) break;
    }
  }
  const reason = option?.assessment.placement.why ?? "HOLD: no usable alternative was found. Placement requires review.";
  const disagreements = [...checked.disagreements, reason];
  if (option) {
    return {
      assessment: option.assessment,
      check: () => verdict(evaluatePlacement(twin, option.placed), disagreements, checked.revised),
    };
  }

  return {
    assessment: { ...assessment, mitigations, placement: { ...assessment.placement, why: reason } },
    check: () => reviewRecommendation(twin, candidate, assessment, disagreements, checked.revised, passive).result,
  };
}

export function checkPlacement(
  twin: Twin,
  candidate: Asset,
  assessment: Assessment,
  disagreements: string[],
  checkCurrent: boolean,
  revised: boolean,
): SelfCheckResult {
  const { result } = reviewRecommendation(twin, candidate, assessment, disagreements, revised);
  return checkCurrent ? verdict(evaluatePlacement(twin, candidate), result.disagreements, revised) : result;
}
