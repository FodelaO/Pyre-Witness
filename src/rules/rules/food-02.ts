/** Screens documented fragment- and fiber-shedding materials in open-product areas. */
import type { Asset } from "@/twin/types";
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";

const MATERIALS = [
  ["glass", /\bglass\b/i],
  ["ceramic", /\b(?:ceramics?|porcelain|earthenware|stoneware)\b/i],
  ["brittle plastic", /\bbrittle[ -]+plastics?\b/i],
  ["wood", /\b(?:wood(?:en)?|plywood|timber)\b/i],
  ["cardboard", /\b(?:cardboard|paperboard|corrugated board)\b/i],
  ["fabric", /\b(?:fabric|textiles?|cloth|canvas|cotton)\b/i],
] as const;
const COMPOSITE_GLASS = /\b(?:fib(?:er|re)[ -]*glass|glass[ -]+(?:fib(?:er|re)s?|filled|reinforced))\b/gi;
const SIGHT_GLASS = /\bsight[ -]*glass\b/i;
const SIGHT_GLASS_MATERIAL = /\b(?:(?:(?:borosilicate|tempered|laminated)[ -]+)?glass[ -]+)?sight[ -]*glass\b/gi;
const SINGLE_GLASS_MATERIAL = /^(?:(?:borosilicate|tempered|laminated)[ -]+)?glass$/i;

function documentsMaterial(text: string, material: RegExp): boolean {
  const match = material.exec(text);
  if (!match) return false;
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + match[0].length);
  return !/\b(?:no|not|non|without)[ -]*$/i.test(prefix) && !/^[ -]*(?:free|like|look)\b/i.test(suffix);
}

function hasFixedFoodGradeSightGlass(asset: Asset): boolean {
  if (asset.specs?.foodGrade !== true) return false;
  const label = `${asset.name} ${asset.specs.material ?? ""}`;
  if (!SIGHT_GLASS.test(label)) return false;
  return asset.physical.kind === "instrument" || asset.process?.medium === "product" ||
    asset.physical.connections.some((connection) => connection.active !== false && connection.medium === "product") ||
    /\b(?:fixed|installed)\b/i.test(asset.name);
}

export default {
  id: "FOOD-02",
  title: "Foreign-material risk near open product",
  kind: "compliance",
  references: complianceReferences("fda-21cfr117-35", "fda-21cfr117-40", "fda-21cfr117-130"),
  description: "Documented glass, ceramic, brittle plastic, wood, cardboard or fabric within an open-product area can contribute fragments or fibers.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const material = asset.specs?.material;
      if (!material) continue;
      const area = ctx.areasFor(asset).find((candidate) => candidate.attrs.foodContact);
      if (!area) continue;
      let exposedMaterial = material.replace(COMPOSITE_GLASS, "");
      if (hasFixedFoodGradeSightGlass(asset)) {
        exposedMaterial = SINGLE_GLASS_MATERIAL.test(material.trim()) ? "" : exposedMaterial.replace(SIGHT_GLASS_MATERIAL, "");
      }
      const sources = MATERIALS.filter(([, pattern]) => documentsMaterial(exposedMaterial, pattern)).map(([name]) => name);
      if (!sources.length) continue;

      findings.push({
        assetId: asset.id,
        severity: 4,
        detail: `Documented material (${sources.join(", ")}) could contribute fragments or fibers in ${area.name}, an open-product area.`,
        fix: "Keep the item away from open product or use an approved, controlled material for the production task.",
      });
    }
    return findings;
  },
} satisfies Rule;
