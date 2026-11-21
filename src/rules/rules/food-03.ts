/** Screens passive items with no production role for unsuitable floor placement. */
import { complianceDocument, complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";
import { isPassiveObject } from "../objects";

const STORAGE = "Store personal or non-production items in an office or designated support area away from production.";

export default {
  id: "FOOD-03",
  title: "Non-production item in a process area",
  kind: "compliance",
  references: [complianceDocument("fda-21cfr117-35"), ...complianceReferences("fda-21cfr117-35")],
  description: `A passive item with no modeled production role is placed in a process area. ${STORAGE}`,
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      if (!isPassiveObject(asset, ctx)) continue;
      const areas = ctx.areasFor(asset);
      const production = areas.find((area) => area.kind === "process");
      if (!production) continue;
      const openProduct = areas.some((area) => area.attrs.foodContact);
      findings.push({
        assetId: asset.id,
        severity: openProduct ? 3 : 2,
        detail: openProduct
          ? `This item has no modeled production role and is in ${production.name} near open product.`
          : `This item has no modeled production role and is in the ${production.name} production area.`,
        fix: STORAGE,
      });
    }
    return findings;
  },
} satisfies Rule;
