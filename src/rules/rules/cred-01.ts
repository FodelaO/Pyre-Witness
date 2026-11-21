/** Flags networked assets whose modeled credential state includes vendor defaults. */
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";

export default {
  id: "CRED-01",
  title: "Default credentials on a networked asset",
  kind: "cyber",
  references: complianceReferences("iec62443-3-3-sr-1.5", "nist-800-82r3-6.2.1"),
  description: "A networked asset explicitly has visible or known default credentials in its cyber profile.",
  check(ctx) {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      if (!asset.cyber?.defaultCredentials || !ctx.isNetworked(asset)) continue;
      findings.push({
        assetId: asset.id,
        severity: asset.criticality >= 4 || asset.safetyCritical || asset.cyber.remoteAccess ? 4 : 3,
        detail: "The asset's cyber profile identifies default credentials and a network presence.",
        fix: "Replace or disable vendor defaults before connecting the asset. Verify the resulting authentication settings.",
        techniqueId: "T1694.001",
      });
    }
    return findings;
  },
} satisfies Rule;
