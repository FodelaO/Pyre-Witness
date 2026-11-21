/** Resolves model references against the twin and prepares human-reviewable proposals. */
import { techniqueById } from "@/data/attack-ics";
import type { ModelAssessment } from "@/gemini/schemas";
import { clearPlacementPoint, knownNetworkLocation } from "@/pipeline/assetFromProfile";
import type { Assessment } from "@/pipeline/types";
import { evaluateTwin, explainRule } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { areaById, areaCenter, containsPoint } from "@/twin/geometry";
import type { Asset, MitigationEffect, Technique, Twin } from "@/twin/types";

function groundEffect(effect: MitigationEffect, twin: Twin, assets: Map<string, Asset>, candidate: Asset): MitigationEffect | null {
  switch (effect.type) {
    case "note":
      return effect;
    case "disable_radio":
      return assets.get(effect.assetId)?.cyber?.radios.includes(effect.radio) ? effect : null;
    case "patch_cyber":
      return assets.get(effect.assetId)?.cyber && Object.keys(effect.patch).length ? effect : null;
    case "remove_connection":
      return effect.medium === "network" && assets.get(effect.assetId)?.physical.connections.some(
        ({ to, medium }) => to === effect.to && medium === effect.medium,
      ) ? effect : null;
    case "remove_asset":
      return effect.assetId === candidate.id ? effect : null;
    case "move_asset": {
      const asset = assets.get(effect.assetId);
      const area = areaById(twin, effect.area);
      if (!asset || !area || !knownNetworkLocation(twin, effect.networkArea, effect.conduit)) return null;
      const preferred = effect.x !== undefined && effect.y !== undefined ? { x: effect.x, y: effect.y } : areaCenter(area);
      const point = clearPlacementPoint(twin, asset, area, preferred);
      return point ? { ...effect, ...point } : null;
    }
    case "enforce_conduit": {
      const asset = assets.get(effect.enforcedBy);
      const conduit = twin.conduits.find(({ id }) => id === effect.conduitId);
      return conduit && asset && ["firewall", "network_switch"].includes(asset.physical.kind)
        && effect.allows.every((flow) => conduit.allows.includes(flow)) ? effect : null;
    }
    case "set_area_attr":
      return null;
    case "add_protection":
      // Installing an independent safeguard is a physical change: only on an asset that exists.
      return assets.has(effect.assetId) && effect.protection.trim() ? effect : null;
  }
}

export function groundAssessment(twin: Twin, candidate: Asset, model: ModelAssessment, runId: string) {
  const disagreements = new Set<string>();
  const assets = new Map(twin.assets.map((asset) => [asset.id, asset]));
  assets.set(candidate.id, candidate);
  const current = { ...twin, assets: [...assets.values()] };
  const entries = new Set<string>(twin.entryPoints.map(({ id }) => id));
  const nodes = new Set([...assets.keys(), ...entries]);
  const knownTargets = new Set([...assets.keys(), ...twin.areas.map(({ id }) => id), ...twin.conduits.map(({ id }) => id)]);

  function canonical(technique: Technique | null | undefined): Technique | undefined {
    if (!technique) return undefined;
    const known = techniqueById(technique.id);
    if (known) return { id: known.id, name: known.name };
    disagreements.add(`Removed unknown ATT&CK for ICS technique ${technique.id}.`);
    return undefined;
  }

  const paths: Assessment["attack_paths"] = [];
  for (const [index, path] of model.attack_paths.entries()) {
    const pathNumber = index + 1;
    const steps = path.steps.map((step) => ({ ...step, technique: canonical(step.technique) }));
    const ids = [path.entry, path.target, ...steps.flatMap(({ from, to }) => [from, to])];
    const unknown = [...new Set(ids.filter((id) => !nodes.has(id)))];
    if (unknown.length) {
      disagreements.add(`Removed model path ${pathNumber} referencing unknown nodes: ${unknown.join(", ")}.`);
      continue;
    }
    const continuous = steps[0]?.from === path.entry && steps[steps.length - 1]?.to === path.target
      && steps.every((step, index) => index === 0 || step.from === steps[index - 1].to);
    if (!continuous || !assets.has(path.target) || !ids.includes(candidate.id)) {
      disagreements.add(`Removed model path ${pathNumber}. It must connect known nodes through ${candidate.id} to a plant asset.`);
      continue;
    }
    paths.push({
      ...path, id: `${runId}:path:${pathNumber}`, steps, source: "model", causedBy: candidate.id,
      ruleIds: path.ruleIds?.filter((id) => explainRule(id)),
    });
  }

  const placement = model.physical_placement;
  const room = areaById(twin, placement.area);
  const near = placement.near_asset_id ? assets.get(placement.near_asset_id) : undefined;
  const validAnchor = near && near.id !== candidate.id && room && containsPoint(room, near.physical.x, near.physical.y);
  if (placement.near_asset_id && !validAnchor) {
    disagreements.add(`Removed placement anchor ${placement.near_asset_id}. Choose an asset in ${placement.area}.`);
  }
  const connections = placement.connections.filter(({ to }) => {
    if (assets.has(to) && to !== candidate.id) return true;
    disagreements.add(`Removed connection to invalid asset ${to}.`);
    return false;
  });

  const baseline = model.mitigations.length ? evaluateTwin(current).score : 0;
  const mitigations = model.mitigations.flatMap((proposal, index) => {
    const effects = proposal.effects.flatMap((effect) => {
      const grounded = groundEffect(effect, current, assets, candidate);
      if (grounded) return [grounded];
      disagreements.add(`Removed inapplicable ${effect.type} effect from mitigation ${index + 1}.`);
      return [];
    });
    if (!effects.length) return [];
    const targets = new Set(proposal.targets.filter((id) => knownTargets.has(id)));
    for (const effect of effects) {
      if ("assetId" in effect) targets.add(effect.assetId);
      if ("conduitId" in effect) targets.add(effect.conduitId);
    }
    return [{
      ...proposal, id: `${runId}:mitigation:${index + 1}`, effects, targets: [...targets],
      status: "proposed" as const, proposedBy: "architect",
      riskDelta: Math.round((evaluateTwin(applyEffects(current, effects)).score - baseline) * 100) / 100,
    }];
  });

  const assessment: Assessment = {
    ...model,
    physical_placement: { ...placement, near_asset_id: validAnchor ? near.id : null, connections },
    never_place: model.never_place.map((item) => ({
      ...item, area: item.area && areaById(twin, item.area) ? item.area : null,
    })),
    risks: model.risks.map((risk, index) => ({
      ...risk, id: `${runId}:risk:${index + 1}`, technique: canonical(risk.technique) ?? null,
    })),
    attack_paths: paths,
    mitigations,
  };
  return { assessment, disagreements: [...disagreements] };
}
