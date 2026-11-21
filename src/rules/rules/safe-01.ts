/** Escalates modeled reachability of safety-critical targets after path evaluation. */
import { complianceReferences } from "../compliance";
import type { Rule, RuleEvidence } from "../context";
import { interlockLimitsSafetyPath } from "../protections";

export default {
  id: "SAFE-01",
  title: "Safety-critical asset is reachable",
  kind: "cyber",
  references: complianceReferences("iec61511-1-sis-independence", "iec61511-1-sis-security", "iec62443-3-3-sr-5.1"),
  description: "Modeled reachability of a safety-critical asset triggers severity 5 unless an independent hardwired valve interlock limits the network-mediated arrival.",
  check(ctx): RuleEvidence[] {
    const targets = new Map<string, number>();
    for (const path of ctx.paths) {
      const target = ctx.assetById.get(path.target);
      if (target?.safetyCritical && !interlockLimitsSafetyPath(target, path.steps.at(-1)?.via)) {
        targets.set(path.target, (targets.get(path.target) ?? 0) + 1);
      }
    }
    return Array.from(targets, ([assetId, count]) => ({
      assetId,
      severity: 5,
      detail: `${assetId} is reachable via ${count} modeled ${count === 1 ? "path" : "paths"}. Review its separation from other systems.`,
      techniqueId: "T0880",
      fix: "Review safety-system isolation and protect its approved interfaces through the site's functional-safety change process.",
    }));
  },
} satisfies Rule;
