/** Checks portable media and exposed removable-media interfaces in OT. */
import { PUBLIC_PORT_RANGE, type Rule, type RuleEvidence } from "../context";

const MEDIA_PORT = /\b(?:usb(?=\b|\d)|(?:micro[ -]?)?sd(?:hc|xc)?\b)/i;
const POWER_ONLY = /\b(?:charg(?:e|ing)|power)[ -]?only\b/i;

export default {
  id: "USB-01",
  title: "Removable media in OT",
  kind: "cyber",
  references: ["IEC 62443-3-3 SR 2.3", "NIST SP 800-82r3 §6.2.7", "NIST SP 1334"],
  description: "Portable storage or an exposed media port at Purdue levels 0–3, with higher severity within 5.5 m of public access.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      if (asset.network.level > 3) continue;
      const isMedia = asset.physical.kind === "usb_drive";
      const mediaPort = asset.cyber?.ports.find((port) => MEDIA_PORT.test(port) && !POWER_ONLY.test(port));
      if (!isMedia && !asset.cyber?.removableStorage && !mediaPort) continue;

      const nearPublic = ctx.nearPublic(asset, PUBLIC_PORT_RANGE);
      const exposure = isMedia
        ? "Portable USB storage is present in OT."
        : mediaPort
          ? `An exposed ${mediaPort} port may accept removable media in OT.`
          : "Removable storage is enabled in OT.";
      findings.push({
        assetId: asset.id,
        severity: nearPublic ? 4 : 3,
        detail: nearPublic ? `${exposure} A public-access zone is within 5.5 m.` : exposure,
        techniqueId: "T0847",
        fix: "Restrict removable media to approved devices and disable or physically secure unused media ports.",
      });
    }
    return findings;
  },
} satisfies Rule;
