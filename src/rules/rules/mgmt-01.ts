/** Flags devices explicitly outside plant asset and patch management in OT. */
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";

export default {
  id: "MGMT-01",
  title: "Unmanaged asset in OT",
  kind: "cyber",
  references: complianceReferences("iec62443-2-1-asset-program", "nist-csf-2.0-id.am"),
  description: "An OT asset's cyber profile explicitly indicates it is outside plant asset and patch management.",
  check(ctx) {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      if (asset.network.level > 3 || asset.cyber?.managed !== false) continue;
      findings.push({
        assetId: asset.id,
        severity: ctx.isNetworked(asset) ? 3 : 2,
        detail: `The asset is outside plant inventory and patch management at Purdue ${asset.network.level}.`,
        fix: "Assign an owner and enroll the asset in the OT inventory and approved maintenance process.",
      });
    }
    return findings;
  },
} satisfies Rule;
