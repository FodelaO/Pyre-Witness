/** Flags unmanaged portable endpoints with modeled connectivity in Purdue levels 0–2. */
import type { Rule, RuleEvidence } from "../context";

export default {
  id: "TRANS-01",
  title: "Unmanaged transient device on control network",
  kind: "cyber",
  references: ["IEC 62443-3-3 SR 2.3", "NIST SP 800-82r3 §6.2.1"],
  description: "An explicitly unmanaged laptop or phone has a network presence at Purdue Level 0, 1, or 2.",
  check(ctx) {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const kind = asset.physical.kind;
      if (kind !== "laptop" && kind !== "phone") continue;
      if (asset.network.level > 2 || asset.cyber?.managed !== false || !ctx.isNetworked(asset)) continue;
      findings.push({
        assetId: asset.id,
        severity: 4,
        detail: `An unmanaged ${kind} has modeled network connectivity at Purdue ${asset.network.level}.`,
        fix: "Disconnect the endpoint and use an approved, managed maintenance device and access procedure.",
        techniqueId: "T0864",
      });
    }
    return findings;
  },
} satisfies Rule;
