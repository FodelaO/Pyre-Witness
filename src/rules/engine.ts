/**
 * Deterministic plant rules engine ("Inspector"). NOT a model.
 * STUB — the real engine replaces the bodies below and keeps these two signatures.
 *
 *  - evaluateTwin(twin): full risk report for the whole plant (score, findings, attack paths).
 *  - evaluatePlacement(twin, asset): findings + attack paths that ONE asset introduces where it sits.
 */
import type { Asset, AttackPath, RiskReport, RuleFinding, Twin } from "@/twin/types";

export function evaluateTwin(twin: Twin): RiskReport {
  void twin;
  return { score: 0, band: "low", findings: [], paths: [], byArea: {}, computedAt: Date.now() };
}

export function evaluatePlacement(twin: Twin, asset: Asset): { findings: RuleFinding[]; paths: AttackPath[] } {
  void twin;
  void asset;
  return { findings: [], paths: [] };
}
