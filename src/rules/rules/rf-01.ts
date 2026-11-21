/** Flags an OT radio within modeled reach of an untrusted location. */
import type { Radio } from "@/twin/types";
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";

const exposedRadios = new Set<Radio>(["wifi", "bluetooth", "cellular", "zigbee", "lora"]);

export default {
  id: "RF-01",
  title: "Wireless within untrusted reach",
  kind: "cyber",
  references: complianceReferences("iec62443-3-3-sr-1.6", "iec62443-3-3-sr-2.2", "nist-800-82r3-6.2.9"),
  description: "An OT radio falls within a modeled RF entry radius or 30 m of a public or outdoor area.",
  check(ctx) {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      if (asset.network.level > 3 || !asset.cyber) continue;
      const radios = asset.cyber.radios.filter((radio) => exposedRadios.has(radio));
      if (radios.length === 0 || !ctx.rfExposed(asset)) continue;
      findings.push({
        assetId: asset.id,
        severity: asset.safetyCritical || !asset.cyber.managed ? 4 : 3,
        detail: `The ${radios.join(", ")} radio at Purdue ${asset.network.level} is within modeled reach of untrusted space.`,
        fix: "Disable unused radios, or isolate required wireless access and verify coverage with an RF survey.",
        techniqueId: "T0860",
      });
    }
    return findings;
  },
} satisfies Rule;
