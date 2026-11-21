/** Checks proximity of documented exposed ports to visitor-accessible space. */
import { PUBLIC_PORT_RANGE, type Rule, type RuleEvidence } from "../context";

export default {
  id: "PHYS-01",
  title: "Exposed ports near visitor access",
  kind: "physical",
  references: ["NIST SP 800-82r3 §5.2.2", "NIST SP 800-53 Rev. 5 PE-3"],
  description: "An asset with an exposed port is inside a public-access area or within 5.5 m of its boundary.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const ports = asset.cyber?.ports.filter((port) => port.trim().length > 0);
      if (!ports?.length || !ctx.nearPublic(asset, PUBLIC_PORT_RANGE)) continue;

      findings.push({
        assetId: asset.id,
        severity: asset.network.level <= 3 ? 3 : 2,
        detail: `Exposed ports (${ports.join(", ")}) are within 5.5 m of a public-access area. Verify barriers and enclosure access.`,
        fix: "Move the asset behind controlled access or lock exposed ports in a suitable enclosure.",
      });
    }
    return findings;
  },
} satisfies Rule;
