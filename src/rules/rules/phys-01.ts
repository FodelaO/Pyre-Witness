/** Checks proximity of documented exposed ports to visitor-accessible space. */
import { complianceReferences } from "../compliance";
import { PUBLIC_PORT_RANGE, type Rule, type RuleEvidence } from "../context";
import { hasPhysicalPortProtection } from "../protections";

export default {
  id: "PHYS-01",
  title: "Exposed ports near visitor access",
  kind: "physical",
  references: complianceReferences("nist-800-82r3-5.2.2", "nist-csf-2.0-pr.aa"),
  description: "An asset with a documented port is inside a public-access area or within 5.5 m of its boundary. A locked port or cabinet lowers severity.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const ports = asset.cyber?.ports.filter((port) => port.trim().length > 0);
      if (!ports?.length || !ctx.nearPublic(asset, PUBLIC_PORT_RANGE)) continue;

      const protectedPort = hasPhysicalPortProtection(asset);
      const inOt = asset.network.level <= 3;
      const protection = protectedPort
        ? "A documented port safeguard limits direct access."
        : "Verify barriers and enclosure access.";
      findings.push({
        assetId: asset.id,
        severity: inOt ? (protectedPort ? 2 : 3) : (protectedPort ? 1 : 2),
        detail: `${protectedPort ? "Ports" : "Exposed ports"} (${ports.join(", ")}) are within 5.5 m of a public-access area. ${protection}`,
        fix: protectedPort
          ? "Verify the port safeguard and maintain controlled access."
          : "Move the asset behind controlled access or lock exposed ports in a suitable enclosure.",
      });
    }
    return findings;
  },
} satisfies Rule;
