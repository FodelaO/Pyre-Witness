/** Ranks pending plant decisions by recomputed risk and annual loss changes. */
import { plantExposure } from "@/econ/model";
import { useRunStore } from "@/pipeline/runStore";
import { compareText } from "@/rules/context";
import { evaluateTwin } from "@/rules/engine";
import { mitigationEffectKey } from "@/sim/mitigationEffects";
import { applyEffects } from "@/twin/effects";
import { useTwinStore } from "@/twin/store";
import type { EquipmentKind, Mitigation, MitigationEffect, RiskReport, Twin } from "@/twin/types";
import { captureProposal, checkedCapture, type CaptureReview } from "./captureProposal";
import { ruleProposals } from "./ruleProposals";

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  kind: "move" | "protect" | "patch" | "purchase" | "isolate" | "advisory";
  assets: { id: string; kind: EquipmentKind; tag: string; name: string }[];
  purchase?: { kind: EquipmentKind; name: string; where: string };
  /** Signed after-minus-before changes. Negative values indicate reductions. */
  predicted: { riskDelta: number; lossDeltaPerYear: number };
  source: "mitigation" | "simulation" | "watch" | "capture" | "rules";
  apply(): boolean;
}

function sourceOf(item: Mitigation): TodoItem["source"] {
  if ("simulationScenario" in item && "simulationContainment" in item) return "simulation";
  if (item.proposedBy === "threat-watch") return "watch";
  if (item.proposedBy === "architect") return "capture";
  return "mitigation";
}

function kindOf(effects: MitigationEffect[]): TodoItem["kind"] {
  if (effects.some(({ type }) => type === "move_asset")) return "move";
  if (effects.some((effect) => effect.type === "disable_radio" || effect.type === "enforce_conduit"
    || effect.type === "remove_connection" || effect.type === "remove_asset"
    || (effect.type === "patch_cyber" && (effect.patch.remoteAccess === false || effect.patch.cloudConnected === false)))) return "isolate";
  if (effects.some(({ type }) => type === "add_protection" || type === "set_area_attr")) return "protect";
  if (effects.some(({ type }) => type === "patch_cyber")) return "patch";
  return "advisory";
}

function affectedAssets(twin: Twin, item: Pick<Mitigation, "targets" | "effects">): TodoItem["assets"] {
  const ids = new Set(item.targets);
  const areas = new Set<string>();
  for (const effect of item.effects) {
    if ("assetId" in effect) ids.add(effect.assetId);
    if (effect.type === "remove_connection") ids.add(effect.to);
    if (effect.type === "enforce_conduit") ids.add(effect.enforcedBy);
    if (effect.type === "set_area_attr") areas.add(effect.areaId);
  }
  return twin.assets.filter(({ id, physical }) => ids.has(id) || areas.has(physical.area))
    .map(({ id, physical, name }) => ({ id, kind: physical.kind, tag: id, name }));
}

function rank(a: TodoItem, b: TodoItem): number {
  return a.predicted.riskDelta - b.predicted.riskDelta
    || a.predicted.lossDeltaPerYear - b.predicted.lossDeltaPerYear
    || compareText(a.id, b.id);
}

export function buildTodos(
  twin: Twin, mitigations: readonly Mitigation[], capture?: CaptureReview | null,
  risk: RiskReport = evaluateTwin(twin),
): TodoItem[] {
  const annualLoss = plantExposure(twin, risk).totalAnnualised;
  const predict = (next: Twin): TodoItem["predicted"] => {
    const after = evaluateTwin(next);
    return {
      riskDelta: after.score - risk.score,
      lossDeltaPerYear: plantExposure(next, after).totalAnnualised - annualLoss,
    };
  };

  function row(item: Mitigation, source: TodoItem["source"], apply: () => boolean): TodoItem {
    return {
      id: item.id, source,
      description: source === "simulation" ? `Simulation proposal. ${item.description}` : item.description,
      title: item.title.trim().split(/\s+/).slice(0, 4).join(" ") || "Review proposal",
      kind: kindOf(item.effects), assets: affectedAssets(twin, item),
      predicted: predict(applyEffects(twin, item.effects)), apply,
    };
  }

  const pending = mitigations.filter(({ status }) => status === "proposed");
  // Simulation replays and admitted threat-watch reports both publish to this queue.
  // The queue owns decisions, including replacement of stale proposals and watch receipts.
  const items = pending.map((item) => row(item, sourceOf(item), () => {
    const live = useTwinStore.getState();
    if (live.risk !== risk || !live.mitigations.includes(item)) return false;
    live.decideMitigation(item.id, "approved");
    return true;
  }));

  if (capture) {
    const proposal = captureProposal(twin, capture);
    if (proposal) items.push({
      id: `todo:capture:${capture.runId ?? proposal.assetId}`,
      title: "Move there", description: proposal.description, kind: "move", source: "capture",
      assets: affectedAssets(twin, { targets: [proposal.assetId], effects: proposal.effects }),
      predicted: predict(proposal.twin),
      apply: () => {
        const live = useTwinStore.getState();
        const current = checkedCapture(useRunStore.getState());
        if (live.risk !== risk || !current || current.runId !== capture.runId
          || current.assessment !== capture.assessment || current.placedAssetId !== capture.placedAssetId
          || current.objectClass !== capture.objectClass) return false;
        const next = captureProposal(live.twin, current);
        if (!next) return false;
        live.setTwin(next.twin);
        return true;
      },
    });
  }

  const queuedEffects = new Set(pending.map(({ effects }) => mitigationEffectKey(effects)));
  function ruleRow(item: Mitigation) {
    return row(item, "rules", () => {
      const live = useTwinStore.getState();
      if (live.risk !== risk || live.mitigations.some((queued) =>
        queued.status === "proposed" && mitigationEffectKey(queued.effects) === mitigationEffectKey(item.effects))) return false;
      const existingIds = new Set(live.mitigations.map(({ id }) => id));
      live.proposeMitigations([item]);
      const proposed = useTwinStore.getState().mitigations.find(({ id, effects }) => !existingIds.has(id) && effects === item.effects);
      if (!proposed) return false;
      live.decideMitigation(proposed.id, "approved");
      return true;
    });
  }

  const controls = ruleProposals(twin, risk).map((item) => ({ item, todo: ruleRow(item) }))
    .filter(({ todo }) => todo.predicted.riskDelta < 0 || (todo.predicted.riskDelta === 0 && todo.predicted.lossDeltaPerYear < 0));
  items.push(...controls.filter(({ item }) => !queuedEffects.has(mitigationEffectKey(item.effects))).map(({ todo }) => todo));

  const riskControls = controls.filter(({ todo }) => todo.predicted.riskDelta < 0).sort((a, b) => rank(a.todo, b.todo));
  if (riskControls.length > 1 && items.every(({ predicted }) => predicted.riskDelta > -10)) {
    const group: Mitigation = {
      id: "todo:rules:combined", title: "Apply priority controls", kind: "procedural",
      description: riskControls.map(({ item }) => item.description).join(" "),
      targets: riskControls.flatMap(({ item }) => item.targets),
      effects: riskControls.flatMap(({ item }) => item.effects),
      status: "proposed", proposedBy: "rules engine",
    };
    const combined = ruleRow(group);
    if (riskControls.every(({ todo }) => combined.predicted.riskDelta < todo.predicted.riskDelta)
      && !queuedEffects.has(mitigationEffectKey(group.effects))) items.push(combined);
  }
  return items.sort(rank);
}
