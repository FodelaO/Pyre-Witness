/** Interprets gas-area marking evidence and identifies equipment for hazard screening. */
import type { Asset, EquipmentKind } from "@/twin/types";
import type { RuleContext } from "./context";
import { ignitionEvidence, isElectricalEquipmentKind } from "./objects";

const SCREENED_PROCESS_KINDS = new Set<EquipmentKind>(["instrument", "agitated_tank", "ro_skid"]);

const NEGATIVE = /\b(?:not|unrated|uncertified|non[ -]?(?:atex|iecex|hazardous|rated|certified)|pending)\b/i;
const CLASS_I = /\b(?:class\s*(?:i|1)[\s,/-]+(?:div(?:ision)?\.?\s*[12]|zone\s*[012])|c1d[12])\b/i;
const ATEX_OR_IECEX = /\b(?:atex|iecex)[\s,:-]+zone\s*[012]\b/i;
const EX_GAS = /\ba?ex\s+[a-z]{1,3}\s+ii[abc]\s+t[1-6]\b/i;

export function hasGasAreaMarking(asset: Asset): boolean {
  const rating = asset.specs?.hazardRating?.trim();
  return Boolean(rating && !NEGATIVE.test(rating) && (CLASS_I.test(rating) || ATEX_OR_IECEX.test(rating) || EX_GAS.test(rating)));
}

export function sourceForHazardReview(ctx: RuleContext, asset: Asset): { type: "equipment" | "portable"; label: string } | undefined {
  const evidence = ignitionEvidence(asset);
  if (evidence === "lighter" || evidence === "aerosol") return { type: "portable", label: evidence };

  const equipment = isElectricalEquipmentKind(asset.physical.kind) || SCREENED_PROCESS_KINDS.has(asset.physical.kind)
    || ctx.hasPowerLink(asset) || ctx.hasNetworkLink(asset);
  if (equipment || evidence === "electrical equipment") return { type: "equipment", label: "equipment" };
  if (evidence) return { type: "portable", label: evidence };

  const cyber = asset.cyber;
  if (ctx.hasCyberSurface(asset) && cyber && (cyber.radios.length || cyber.ports.length || cyber.cloudConnected || cyber.remoteAccess)) {
    return { type: "equipment", label: "equipment" };
  }
}
