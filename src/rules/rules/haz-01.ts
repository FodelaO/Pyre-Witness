/** Checks ignition-source screening for the twin's modeled ammonia hazard area. */
import type { Asset } from "@/twin/types";
import type { Rule, RuleEvidence } from "../context";

const PASSIVE_KINDS = new Set(["vertical_tank", "bullet_tank", "heat_exchanger"]);
const NEGATIVE = /\b(?:not|unrated|uncertified|non[ -]?(?:atex|iecex|hazardous)|pending)\b/i;
const CLASS_I = /\b(?:class\s*(?:i|1)[\s,/-]+(?:div(?:ision)?\.?\s*[12]|zone\s*[012])|c1d[12])\b/i;
const ATEX_OR_IECEX = /\b(?:atex|iecex)[\s,:-]+zone\s*[012]\b/i;
const EX_GAS = /\ba?ex\s+[a-z]{1,3}\s+ii[abc]\s+t[1-6]\b/i;

function possibleIgnitionSource(asset: Asset): boolean {
  return !PASSIVE_KINDS.has(asset.physical.kind) || Boolean(asset.cyber) ||
    asset.physical.connections.some((connection) => connection.active !== false && connection.medium === "power");
}

export default {
  id: "HAZ-01",
  title: "Ammonia-area rating unverified",
  kind: "compliance",
  references: ["NFPA 70 (NEC) Articles 500–505", "IEC 60079-14", "ANSI/IIAR 2", "OSHA 29 CFR 1910.119", "OSHA 29 CFR 1910.307"],
  description: "Potential ignition sources in the modeled ammonia area need a recognizable gas-area marking and site-specific approval.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const area = ctx.areasFor(asset).find((candidate) => candidate.attrs.hazard === "NH3");
      if (!area || (!possibleIgnitionSource(asset) && !ctx.isNetworked(asset))) continue;

      const rating = asset.specs?.hazardRating?.trim();
      if (rating && !NEGATIVE.test(rating) && (CLASS_I.test(rating) || ATEX_OR_IECEX.test(rating) || EX_GAS.test(rating))) continue;
      findings.push({
        assetId: asset.id,
        severity: 5,
        detail: rating
          ? `The documented rating “${rating}” does not establish gas-area suitability for ${area.name}.`
          : `No gas-area rating is documented for this asset in ${area.name}. Review ignition protection before placement.`,
        fix: "Verify the site's area classification, then use equipment approved for that installation or move the asset outside the hazard area.",
      });
    }
    return findings;
  },
} satisfies Rule;
