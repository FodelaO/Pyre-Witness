/** Screens cameras for possible views of operator interfaces and OT cloud disclosure. */
import { distance, UNITS_PER_METRE } from "@/twin/geometry";
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";

const VIEW_RANGE = 10 * UNITS_PER_METRE;

export default {
  id: "CAM-01",
  title: "Camera may disclose operator information",
  kind: "cyber",
  references: complianceReferences("iec62443-3-3-sr-4.1", "nist-800-82r3-5.2.2"),
  description: "A camera is within 10 m of an HMI or keypad in the same room, or is cloud-connected at Purdue levels 0–3.",
  check(ctx): RuleEvidence[] {
    const panels = ctx.twin.assets.filter((asset) =>
      asset.physical.kind === "hmi" || /\bkeypad\b/i.test(`${asset.name} ${asset.cyber?.model ?? ""}`),
    );
    const findings: RuleEvidence[] = [];
    for (const camera of ctx.twin.assets) {
      if (camera.physical.kind !== "ip_camera") continue;
      const rooms = ctx.areasFor(camera).filter((area) => area.kind !== "context");
      const panel = panels.find((target) =>
        target.id !== camera.id &&
        distance(camera.physical, target.physical) <= VIEW_RANGE &&
        (target.physical.area === camera.physical.area ||
          ctx.areasFor(target).some((area) => rooms.includes(area))),
      );
      const usesOtCloud = camera.network.level <= 3 && camera.cyber?.cloudConnected;
      if (!panel && !usesOtCloud) continue;

      const detail = [];
      if (panel) detail.push(`Camera is within 10 m of ${panel.id} in the same room. Verify the view of its display or keypad.`);
      if (usesOtCloud) detail.push("Cloud-connected OT camera may relay video or metadata outside the plant.");
      findings.push({
        assetId: camera.id,
        severity: usesOtCloud ? 4 : 3,
        detail: detail.join(" "),
        techniqueId: panel ? "T0882" : undefined,
        fix: "Position or mask the camera away from operator interfaces and keep video on an approved local recorder.",
      });
    }
    return findings;
  },
} satisfies Rule;
