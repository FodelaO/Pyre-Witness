/** Flags cloud and remote connectivity below the DMZ without documented enforcement. */
import type { Rule, RuleEvidence } from "../context";

export default {
  id: "ZONE-01",
  title: "External connectivity below the DMZ",
  kind: "cyber",
  references: ["IEC 62443-3-3 SR 5.1", "IEC 62443-3-3 SR 5.2", "NIST SP 800-82r3 §6.2.10"],
  description: "Cloud or remote access is modeled on a Purdue 0–3 asset without an enforced route through Level 3.5.",
  check(ctx) {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      const cyber = asset.cyber;
      if (!cyber || asset.network.level > 3 || (!cyber.cloudConnected && !cyber.remoteAccess)) continue;
      if (ctx.hasEnforcedDmz(asset)) continue;

      const access = cyber.cloudConnected && cyber.remoteAccess
        ? "Cloud connectivity and remote access are"
        : cyber.remoteAccess ? "Remote access is" : "Cloud connectivity is";
      findings.push({
        assetId: asset.id,
        severity: cyber.remoteAccess || asset.safetyCritical ? 4 : 3,
        detail: `${access} declared at Purdue ${asset.network.level} without a verified Level 3.5 conduit in the twin.`,
        fix: "Disable the external service or route it through an approved, enforced Level 3.5 broker.",
        techniqueId: cyber.remoteAccess ? "T0822" : "T0883",
      });
    }
    return findings;
  },
} satisfies Rule;
