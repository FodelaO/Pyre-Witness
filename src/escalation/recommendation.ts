/** Checks actionable controls against the current twin before a human can approve one. */
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import { useRunStore } from "@/pipeline/runStore";
import { evaluatePlacement, evaluateTwin } from "@/rules/engine";
import { useSimStore } from "@/sim/simStore";
import { ALL_SCENARIOS } from "@/sim/scenarios";
import { applyEffects } from "@/twin/effects";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset, Mitigation, MitigationEffect, Twin } from "@/twin/types";
import type { EscalationCause } from "./types";

export type ApprovalPlan =
  | { kind: "mitigation"; item: Mitigation; queued: boolean }
  | { kind: "move"; title: string; destination: Asset };

export function approvalTitle(plan: ApprovalPlan): string {
  return plan.kind === "move" ? plan.title : plan.item.title;
}

export function approvalSignature(plan: ApprovalPlan): string {
  if (plan.kind === "mitigation") return JSON.stringify([plan.kind, plan.item.title, plan.item.effects]);
  const { id, physical, network } = plan.destination;
  return JSON.stringify([plan.kind, plan.title, id, physical, network]);
}

function proposal(assetId: string, title: string, effects: MitigationEffect[], kind: Mitigation["kind"]): Mitigation {
  return {
    id: `escalation-${assetId}`, title, description: title, kind,
    targets: [assetId], effects, proposedBy: "inspector", status: "proposed",
  };
}

function improves(twin: Twin, cause: EscalationCause): boolean {
  const risk = evaluateTwin(twin);
  if (cause.kind === "risk") return risk.score < cause.score;
  return !risk.findings.some((finding) => finding.assetId === cause.assetId && finding.ruleId === cause.ruleId);
}

function doesMitigate(twin: Twin, cause: EscalationCause, item: Mitigation): boolean {
  return item.effects.some(({ type }) => type !== "note") && improves(applyEffects(twin, item.effects), cause);
}

export function planApproval(cause: EscalationCause): ApprovalPlan | null {
  const { twin, mitigations } = useTwinStore.getState();
  const sim = useSimStore.getState();
  if (cause.kind === "simulation") {
    const item = mitigations.find((candidate) => candidate.status === "proposed"
      && "simulationScenario" in candidate && candidate.simulationScenario === sim.run?.id
      && candidate.effects.some(({ type }) => type !== "note"));
    return item ? { kind: "mitigation", item, queued: true } : null;
  }

  const assetId = cause.assetId;
  const asset = assetId && assetById(twin, assetId);
  if (!assetId || !asset) return null;
  const known: Mitigation[] = [];
  const { assessment, placedAssetId, profile, selfCheck } = useRunStore.getState();
  if (asset.origin === "added" && placedAssetId === assetId && assessment && selfCheck?.passed) {
    const next = atRecommendedPlacement(twin, asset, assessment, profile?.object_class);
    const location = next && areaById(twin, next.physical.area);
    if (next && location && !evaluatePlacement(twin, next).findings.some(({ severity }) => severity >= 4)
      && improves({ ...twin, assets: twin.assets.map((entry) => entry.id === assetId ? next : entry) }, cause)) {
      return { kind: "move", title: `Move device to ${location.name}`, destination: { ...next, placement: "recommended" } };
    }
  }

  if (asset.cyber?.defaultCredentials && (cause.ruleId === "CRED-01" || cause.kind === "risk")) {
    known.push(proposal(assetId, "Replace default credentials", [
      { type: "patch_cyber", assetId, patch: { defaultCredentials: false } },
    ], "software"));
  }
  if (cause.ruleId === "USB-01" || cause.ruleId === "PHYS-01") {
    known.push(...ALL_SCENARIOS.cip.mitigations(twin).filter((item) => item.targets.includes(assetId)));
  }
  if (cause.ruleId === "SAFE-01") {
    known.push(...ALL_SCENARIOS.ransomware.mitigations(twin));
  }
  // A newly placed device may be taken out of the model while a safer installation is reviewed.
  if (asset.origin === "added") {
    known.push(proposal(assetId, "Remove from the modeled placement", [{ type: "remove_asset", assetId }], "physical"));
  }

  const queued = mitigations.find((item) => item.status === "proposed" && item.targets.includes(assetId) && doesMitigate(twin, cause, item));
  if (queued) return { kind: "mitigation", item: queued, queued: true };
  const item = known.find((candidate) => doesMitigate(twin, cause, candidate));
  return item ? { kind: "mitigation", item, queued: false } : null;
}

export function confirmApproval(plan: ApprovalPlan, cause: EscalationCause): ApprovalPlan | null {
  if (plan.kind === "move") {
    const next = planApproval(cause);
    return next && approvalSignature(plan) === approvalSignature(next) ? next : null;
  }
  const { twin, mitigations } = useTwinStore.getState();
  if (!plan.queued) return doesMitigate(twin, cause, plan.item) ? plan : null;
  const current = mitigations.find(({ id, status }) => id === plan.item.id && status === "proposed");
  if (!current) return null;
  const next: ApprovalPlan = { kind: "mitigation", item: current, queued: true };
  if (approvalSignature(plan) !== approvalSignature(next)) return null;
  if (cause.kind === "simulation") return "simulationScenario" in current ? next : null;
  return doesMitigate(twin, cause, current) ? next : null;
}

export function applyApproval(plan: ApprovalPlan): boolean {
  const store = useTwinStore.getState();
  if (plan.kind === "move") {
    const { destination } = plan;
    if (!assetById(store.twin, destination.id)) return false;
    store.updateAsset(destination.id, () => destination);
    store.select(destination.id);
    return true;
  }
  const id = plan.queued ? plan.item.id : (() => {
    store.proposeMitigations([plan.item]);
    return useTwinStore.getState().mitigations.at(-1)?.id;
  })();
  if (!id) return false;
  const current = useTwinStore.getState().mitigations.find((item) => item.id === id);
  if (current?.status !== "proposed") return false;
  store.decideMitigation(id, "approved");
  return useTwinStore.getState().mitigations.some((item) => item.id === id && item.status === "applied");
}
