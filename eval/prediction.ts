/** Projects each response onto comparable output fields and reruns placement rules. */
import { assetFromProfile, atRecommendedPlacement, resolveDropPoint } from "@/pipeline/assetFromProfile";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import { evaluatePlacement } from "@/rules/engine";
import type { AreaId, Twin } from "@/twin/types";
import { RISK_TAGS, type Observation, type Prediction, type RiskTag } from "./types";

const RISK_TERMS: Record<RiskTag, RegExp> = {
  wireless: /\b(?:wireless|wi[- ]?fi|wlan|radio(?:s| frequency)?|rf|bluetooth|cellular|lora(?:wan)?|zigbee|nfc|802\.11)\b/i,
  default_creds: /\b(?:default|factory(?:[- ]set)?|preset|out[- ]of[- ]box)[ -]+(?:\w+[ -]+){0,2}(?:credentials?|passwords?|logins?|accounts?|pin)\b/i,
  removable_media: /\b(?:removable (?:media|storages?)|(?:micro[ -]?)?sd(?:hc|xc)?(?: card| slot)|usb (?:drives?|sticks?|media|mass storage|storage)|flash drives?|thumb drives?)\b/i,
  cloud: /\b(?:cloud(?:[- ]connected)?|saas|hosted service)\b/i,
  remote_access: /\b(?:remote (?:access|support|maintenance|management|administration|control|diagnostics?|configuration)|vpn|vendor (?:tunnel|access))\b/i,
  transient: /\b(?:transient|temporary|portable|unmanaged|personal (?:device|phone|computer)|bring your own|byod|contractor (?:laptop|device))\b/i,
  hazardous_area: /\b(?:hazardous (?:zone|area|location|classification)|classified (?:zone|area|location)|atex|iecex|explosion[- ]proof|intrinsic(?:ally)? safe|class i div|ammonia|nh3)\b/i,
  washdown: /\b(?:wash[- ]?down|sanita(?:ry|tion)|hygienic|clean[- ]in[- ]place|cip|ingress protection|ip6[679]k?|high[- ]pressure (?:water|cleaning|wash))\b/i,
  physical_port: /\b(?:physical (?:port|interface|connector)|(?:exposed|service|maintenance|debug) (?:port|connector)|rj[- ]?45|usb(?:[- ]?[abc])? (?:port|connector|jack)|ethernet (?:port|connector|jack)|rs[- ]?485|serial (?:port|connector))\b/i,
  camera_view: /\b(?:field of view|line of sight|privacy|surveillance|(?:camera|video) (?:view|footage|feed|recording|coverage)|viewing angle|recording (?:workers|employees|sensitive))\b/i,
};

export function riskTags(risks: Pick<Assessment["risks"][number], "title" | "description">[]): RiskTag[] {
  return RISK_TAGS.filter((tag) => risks.some((risk) => RISK_TERMS[tag].test(`${risk.title}\n${risk.description}`)));
}

type AssessmentOutput = Pick<Assessment, "never_place" | "risks"> &
  Partial<Pick<Assessment, "placement" | "physical_placement" | "attack_paths">>;

export function makePrediction(
  accepted: boolean | null,
  profile: DeviceProfile | null,
  assessment?: AssessmentOutput | null,
  filteredUnknownTechniques: string[] = [],
): Prediction {
  const riskIds = assessment?.risks.map((risk) => risk.technique?.id) ?? [];
  const pathIds = assessment?.attack_paths?.flatMap((path) => path.steps.map((step) => step.technique?.id)) ?? [];
  const techniques = [...new Set([...riskIds, ...pathIds].filter((id) => id !== undefined).map((id) => id.trim().toUpperCase()))];
  return {
    accepted, profile,
    recommendation: assessment?.placement && assessment.physical_placement
      ? { placement: assessment.placement, physical_placement: assessment.physical_placement } : null,
    neverAreas: assessment?.never_place.map(({ area }) => area).filter((area): area is AreaId => area !== null) ?? [],
    riskTags: riskTags(assessment?.risks ?? []),
    techniques,
    filteredUnknownTechniques: [...new Set(filteredUnknownTechniques.map((id) => id.toUpperCase()))],
  };
}

export function checkRules(twin: Twin, prediction: Prediction | null): Observation["ruleCheck"] {
  if (!prediction?.recommendation) return null;
  if (!prediction.profile) return { passed: false, detail: ["The recommendation has no device profile to place."] };
  const candidate = assetFromProfile(prediction.profile, twin, "EVAL-CANDIDATE", resolveDropPoint(twin));
  const assessment: Assessment = {
    ...prediction.recommendation, never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 0,
  };
  const placed = atRecommendedPlacement(twin, candidate, assessment);
  if (!placed) return { passed: false, detail: ["No clear footprint or valid network location for the recommendation."] };
  const blocking = evaluatePlacement(twin, placed).findings.filter(({ severity }) => severity >= 4);
  return { passed: blocking.length === 0, detail: [...new Set(blocking.map(({ ruleId, title }) => `${ruleId} ${title}`))] };
}
