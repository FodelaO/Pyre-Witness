/** Escalates modeled reachability of safety-critical targets after path evaluation. */
import type { Rule, RuleEvidence } from "../context";

export default {
  id: "SAFE-01",
  title: "Safety-critical asset is reachable",
  kind: "cyber",
  references: ["IEC 61511-1 §11.2", "IEC 62443-3-3 SR 5.1", "NIST SP 800-82r3 §2.3.7"],
  description: "One or more modeled exposure paths reach a safety-critical asset. The target receives a severity 5 finding.",
  check(ctx): RuleEvidence[] {
    const targets = new Map<string, number>();
    for (const path of ctx.paths) {
      if (ctx.assetById.get(path.target)?.safetyCritical) {
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
