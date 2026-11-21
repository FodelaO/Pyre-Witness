/** Reviews portable ignition sources and equipment suitability in modeled hazard areas. */
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";
import { hasGasAreaMarking, sourceForHazardReview } from "../hazard-rating";

export default {
  id: "HAZ-02",
  title: "Hazard-area suitability needs review",
  kind: "physical",
  references: complianceReferences("osha-1910.119-d", "osha-1910.119-l"),
  description: "Checks portable ignition sources in the modeled ammonia area and flags equipment or ignition sources for a site suitability review in CO₂ or caustic areas.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const areas = ctx.areasFor(asset);
      const ammonia = areas.find((area) => area.attrs.hazard === "NH3");
      const other = areas.find((area) => area.attrs.hazard === "CO2" || area.attrs.hazard === "caustic");
      if (!ammonia && !other) continue;
      const source = sourceForHazardReview(ctx, asset);
      if (!source) continue;

      if (ammonia && !hasGasAreaMarking(asset)) {
        if (source.type === "portable") {
          findings.push({
            assetId: asset.id,
            severity: source.label === "aerosol" ? 4 : 5,
            detail: `The identified ${source.label} needs ignition-source review before entering ${ammonia.name}.`,
            fix: "Keep the item outside the hazard area until site personnel verify it is permitted.",
          });
        }
        continue;
      }
      if (other) {
        const hazard = other.attrs.hazard === "CO2" ? "CO₂" : "caustic";
        findings.push({
          assetId: asset.id,
          severity: 3,
          detail: `${other.name} is flagged for ${hazard}. Review the ${source.label} for compatibility with its documented site conditions.`,
          fix: "Confirm site hazard controls and equipment compatibility before placement.",
        });
      }
    }
    return findings;
  },
} satisfies Rule;
