/** Checks the declared Purdue level against the plant area's placement profile. */
import type { Rule, RuleEvidence } from "../context";

export default {
  id: "ZONE-03",
  title: "Purdue level mismatches the area",
  kind: "cyber",
  references: ["IEC 62443-3-3 SR 5.1", "NIST SP 800-82r3 §5.2.3.1"],
  description: "The modeled asset level falls outside the site's typical Purdue levels for its declared physical area.",
  check(ctx) {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const area = ctx.areaById.get(asset.physical.area);
      if (!area?.typicalLevels.length || area.typicalLevels.includes(asset.network.level)) continue;
      const crossesTrust = area.typicalLevels.every((level) => (level <= 3) !== (asset.network.level <= 3));
      findings.push({
        assetId: asset.id,
        severity: crossesTrust ? 3 : 2,
        detail: `${area.name} is modeled for Purdue ${area.typicalLevels.join(", ")}. This asset is at Purdue ${asset.network.level}.`,
        fix: "Choose an area and network zone consistent with the device's function and site segmentation plan.",
      });
    }
    return findings;
  },
} satisfies Rule;
