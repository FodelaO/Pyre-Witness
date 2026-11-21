/** Checks washdown enclosure and hygienic material evidence near open product. */
import { UNITS_PER_METRE } from "@/twin/geometry";
import type { Asset, Severity } from "@/twin/types";
import type { Rule, RuleEvidence } from "../context";

const PASSIVE_KINDS = new Set(["vertical_tank", "bullet_tank", "valve", "heat_exchanger"]);
const HIGH_PRESSURE = /\bip\s*6k?9k?\b/i;
const WATER_JET = /\bip\s*66\b/i;
const HYGIENIC_STEEL = /\b(?:316[ -]?l|1\.44(?:04|32|35)|s31603)\b/i;
const NEGATIVE = /\b(?:not|non|unrated|pending)\b/i;

function needsEnclosureRating(asset: Asset): boolean {
  return !PASSIVE_KINDS.has(asset.physical.kind) || Boolean(asset.cyber) ||
    asset.physical.connections.some((connection) => connection.active !== false && connection.medium === "power");
}

export default {
  id: "WASH-01",
  title: "Washdown or food-contact design gap",
  kind: "compliance",
  references: ["FDA 21 CFR 117.40(a)", "EHEDG Guideline 13", "3-A 00-02", "IEC 60529", "ISO 20653 (IP code reference)"],
  description: "Washdown placements need documented hygienic material and suitable enclosure protection. Explicitly non-food-grade equipment within 5 m of open product is flagged.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const washdown = ctx.areasFor(asset).some((area) => area.attrs.washdown);
      const details: string[] = [];
      let severity: Severity = 2;
      if (washdown) {
        const ipRating = asset.specs?.ipRating ?? "";
        const rating = NEGATIVE.test(ipRating) ? "" : ipRating;
        if ((needsEnclosureRating(asset) || ctx.isNetworked(asset)) && !HIGH_PRESSURE.test(rating)) {
          if (WATER_JET.test(rating)) {
            details.push("IP66 documents water-jet resistance. Confirm IP69/IP69K for this high-pressure washdown area.");
          } else {
            details.push("No IP66 or IP69/IP69K water-jet rating is documented for this washdown placement.");
            severity = 3;
          }
        }
        const material = asset.specs?.material ?? "";
        if (!HYGIENIC_STEEL.test(material) || NEGATIVE.test(material)) {
          details.push("The plant's 316L hygienic material specification is undocumented for this asset.");
          severity = 3;
        }
      }
      if (asset.specs?.foodGrade === false && ctx.nearFoodContact(asset, 5 * UNITS_PER_METRE)) {
        details.push("Equipment documented as non-food-grade is within 5 m of an open-product area.");
        severity = 4;
      }
      if (details.length) {
        findings.push({
          assetId: asset.id,
          severity,
          detail: details.join(" "),
          fix: "Use equipment rated for the cleaning regime and hygienic requirements, or relocate it away from washdown and open product.",
        });
      }
    }
    return findings;
  },
} satisfies Rule;
