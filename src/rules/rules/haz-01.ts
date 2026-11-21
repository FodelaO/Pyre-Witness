/** Screens equipment ratings in the twin's modeled ammonia hazard area. */
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";
import { hasGasAreaMarking, sourceForHazardReview } from "../hazard-rating";

export default {
  id: "HAZ-01",
  title: "Ammonia-area rating unverified",
  kind: "compliance",
  references: complianceReferences(
    "nfpa-70-art-500", "nfpa-70-art-505", "iec60079-14", "iiar-2-ch6-machinery-room", "osha-1910.119-d",
  ),
  description: "Electrical equipment and industrial instrumentation in the modeled ammonia area need a recognizable gas-area marking and site-specific approval.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const area = ctx.areasFor(asset).find((candidate) => candidate.attrs.hazard === "NH3");
      if (!area || sourceForHazardReview(ctx, asset)?.type !== "equipment" || hasGasAreaMarking(asset)) continue;

      const rating = asset.specs?.hazardRating?.trim();
      findings.push({
        assetId: asset.id,
        severity: 5,
        detail: rating
          ? `The documented rating “${rating}” does not establish gas-area suitability for ${area.name}.`
          : `No gas-area rating is documented for this equipment in ${area.name}. Verify site approval before placement.`,
        fix: "Verify the site's area classification, then use equipment approved for that installation or move the asset outside the hazard area.",
      });
    }
    return findings;
  },
} satisfies Rule;
