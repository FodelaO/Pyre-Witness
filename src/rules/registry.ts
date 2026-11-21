/** Registers explainable rule metadata and attaches canonical MITRE techniques to findings. */
import type { RuleFinding } from "@/twin/types";
import { compareText, type Rule, type RuleContext } from "./context";
import { placementHomeRule } from "./placement";
import camera from "./rules/cam-01";
import credentials from "./rules/cred-01";
import foreignMaterial from "./rules/food-02";
import nonProductionItem from "./rules/food-03";
import hazard from "./rules/haz-01";
import ignitionSource from "./rules/haz-02";
import management from "./rules/mgmt-01";
import physical from "./rules/phys-01";
import radio from "./rules/rf-01";
import safety from "./rules/safe-01";
import transient from "./rules/trans-01";
import usb from "./rules/usb-01";
import washdown from "./rules/wash-01";
import dmz from "./rules/zone-01";
import segmentation from "./rules/zone-02";
import level from "./rules/zone-03";

const PLACEMENT_RULES: readonly Rule[] = [
  camera, credentials, foreignMaterial, nonProductionItem, hazard, ignitionSource, management,
  physical, radio, transient, usb, washdown, dmz, segmentation, level,
];

export const RULES: readonly Rule[] = [...PLACEMENT_RULES, safety];

export function explainRule(ruleId: string): Omit<Rule, "check"> | undefined {
  const id = ruleId.trim().toUpperCase();
  const rule = id === placementHomeRule.id ? placementHomeRule : RULES.find((rule) => rule.id === id);
  if (!rule) return undefined;
  return {
    id: rule.id, title: rule.title, kind: rule.kind, description: rule.description, references: [...rule.references],
  };
}

function applyRules(ctx: RuleContext, rules: readonly Rule[]): RuleFinding[] {
  const findings: RuleFinding[] = [];
  for (const rule of rules) {
    for (const { techniqueId, ...evidence } of rule.check(ctx)) {
      const asset = ctx.assetById.get(evidence.assetId);
      if (rule.kind === "cyber" && (!asset || !ctx.hasCyberSurface(asset))) continue;
      const technique = techniqueId ? ctx.technique(techniqueId) : undefined;
      findings.push({
        ...evidence,
        ruleId: rule.id,
        title: rule.title,
        kind: rule.kind,
        references: [...rule.references],
        ...(technique ? { technique } : {}),
      });
    }
  }
  return findings;
}

export function placementFindings(ctx: RuleContext): RuleFinding[] {
  return applyRules(ctx, PLACEMENT_RULES);
}

export function safetyFindings(ctx: RuleContext): RuleFinding[] {
  return applyRules(ctx, [safety]);
}

export function sortFindings(findings: RuleFinding[]): RuleFinding[] {
  return findings.sort((a, b) => b.severity - a.severity || compareText(a.ruleId, b.ruleId)
    || compareText(a.assetId, b.assetId) || compareText(a.detail, b.detail));
}
