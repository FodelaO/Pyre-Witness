/** Checks portable media and exposed removable-media interfaces in OT. */
import { complianceReferences } from "../compliance";
import { PUBLIC_PORT_RANGE, type Rule, type RuleEvidence } from "../context";
import { hasPhysicalPortProtection } from "../protections";

const MEDIA_PORT = /\b(?:usb(?=\b|\d)|(?:micro[ -]?)?sd(?:hc|xc)?\b)/i;
const POWER_ONLY = /\b(?:charg(?:e|ing)|power)[ -]?only\b/i;

export default {
  id: "USB-01",
  title: "Removable media in OT",
  kind: "cyber",
  references: complianceReferences("iec62443-3-3-sr-2.3", "nist-800-82r3-6.2.7"),
  description: "Portable storage or a media port at Purdue levels 0–3, with higher severity within 5.5 m of public access and reduced severity for a locked interface.",
  check(ctx): RuleEvidence[] {
    const findings: RuleEvidence[] = [];
    for (const asset of ctx.twin.assets) {
      if (asset.network.level > 3) continue;
      const isMedia = asset.physical.kind === "usb_drive";
      const mediaPort = asset.cyber?.ports.find((port) => MEDIA_PORT.test(port) && !POWER_ONLY.test(port));
      if (!isMedia && !asset.cyber?.removableStorage && !mediaPort) continue;

      const nearPublic = ctx.nearPublic(asset, PUBLIC_PORT_RANGE);
      const protectedPort = !isMedia && hasPhysicalPortProtection(asset);
      const exposure = isMedia
        ? "Portable USB storage is present in OT."
        : mediaPort
          ? `${protectedPort ? "The" : "An exposed"} ${mediaPort} port may accept removable media in OT.`
          : "Removable storage is enabled in OT.";
      const details = [exposure];
      if (nearPublic) details.push("A public-access zone is within 5.5 m.");
      if (protectedPort) details.push("A documented port safeguard limits direct access.");
      findings.push({
        assetId: asset.id,
        severity: protectedPort ? 2 : nearPublic ? 4 : 3,
        detail: details.join(" "),
        techniqueId: "T0847",
        fix: protectedPort
          ? "Verify the port safeguard and restrict removable media to approved devices."
          : "Restrict removable media to approved devices and disable or physically secure unused media ports.",
      });
    }
    return findings;
  },
} satisfies Rule;
