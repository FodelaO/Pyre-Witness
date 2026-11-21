/** Grounds watch output in the live evidence and measures each proposal in an isolated twin. */
import { techniqueById } from "@/data/attack-ics";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { areaCenter, areasAt } from "@/twin/geometry";
import type { Asset, Twin } from "@/twin/types";
import type { Reassessment } from "./reassessmentSchema";
import { threatKey } from "./sources";
import type { TriagedCandidate } from "./triage";
import type { WatchFinding, WatchReport } from "./types";

type Effect = Reassessment["recommendations"][number]["effects"][number];

function validateMove(effect: Extract<Effect, { type: "move_asset" }>, asset: Asset, twin: Twin): boolean {
  const area = twin.areas.find(({ id }) => id === effect.area);
  const zone = twin.assets.some(({ network }) => network.area === effect.networkArea && network.level === effect.level);
  if (!area || !zone) return false;
  const conduit = twin.conduits.find(({ id }) => id === effect.conduit);
  if (effect.conduit !== null && (!conduit || ![conduit.from, conduit.to].includes(effect.networkArea))) return false;
  if (area.id === asset.physical.area) return true;
  const center = areaCenter(area);
  if (area.kind === "context" || areasAt(twin, center.x, center.y)
    .some(({ attrs }) => attrs.hazard || attrs.washdown || attrs.publicAccess)) return false;
  const fixed = asset.safetyCritical || asset.physical.connections.some(({ medium }) => medium !== "network")
    || twin.assets.some(({ physical }) => physical.connections.some(({ to, medium }) => to === asset.id && medium !== "network"));
  return !fixed;
}

function effectTargets(effect: Effect, twin: Twin, affected: string[]): string[] | null {
  if (effect.type === "note") return affected;
  if (effect.type === "enforce_conduit") {
    const conduit = twin.conduits.find(({ id }) => id === effect.conduitId);
    const enforcer = twin.assets.find(({ id }) => id === effect.enforcedBy);
    if (!conduit || !enforcer || !["firewall", "network_switch"].includes(enforcer.physical.kind)) return null;
    const endpoints = [conduit.from, conduit.to];
    const relevant = twin.assets.some(({ id, network }) => affected.includes(id)
      && (id === conduit.enforcedBy || network.conduit === conduit.id || endpoints.includes(network.area)));
    return relevant && (endpoints.includes(enforcer.network.area) || conduit.enforcedBy === enforcer.id)
      && effect.allows.every((allow) => conduit.allows.includes(allow)) ? [conduit.id, enforcer.id] : null;
  }

  const asset = twin.assets.find(({ id }) => id === effect.assetId);
  if (!asset) return null;
  if (effect.type === "remove_connection") {
    const connected = twin.assets.some(({ id }) => id === effect.to)
      && asset.physical.connections.some(({ to, medium }) => to === effect.to && medium === "network");
    return connected && (affected.includes(asset.id) || affected.includes(effect.to)) ? [asset.id, effect.to] : null;
  }
  if (!affected.includes(asset.id)) return null;
  if (effect.type === "move_asset") return validateMove(effect, asset, twin) ? [asset.id, effect.area] : null;
  if (effect.type === "disable_radio") return asset.cyber?.radios.includes(effect.radio) ? [asset.id] : null;
  if (effect.type === "patch_cyber") {
    const { remoteAccess, cloudConnected } = effect.patch;
    return (remoteAccess === false && asset.cyber?.remoteAccess) || (cloudConnected === false && asset.cyber?.cloudConnected)
      ? [asset.id] : null;
  }
  return null;
}

export function groundReport(
  draft: Reassessment,
  candidates: TriagedCandidate[],
  twin: Twin,
  baselineScore: number,
  runId: string,
): Pick<WatchReport, "headline" | "items" | "recommendations" | "warnings"> {
  const assetIds = new Set(twin.assets.map(({ id }) => id));
  const byThreat = new Map<string, TriagedCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.disposition === "excluded") continue;
    const key = threatKey(candidate.threat);
    const pairs = byThreat.get(key) ?? [];
    pairs.push(candidate);
    byThreat.set(key, pairs);
  }

  let droppedAssets = 0;
  let droppedTechniques = 0;
  let droppedItems = 0;
  let droppedProposals = 0;
  const findings = new Map<string, WatchFinding>();
  for (const item of draft.items) {
    const pairs = byThreat.get(item.threatId);
    const affected = [...new Set(item.affectedAssetIds)].filter((id) => assetIds.has(id)
      && pairs?.some(({ inventory }) => inventory.assetId === id));
    droppedAssets += new Set(item.affectedAssetIds).size - affected.length;
    if (!pairs || !affected.length || findings.has(item.threatId)) {
      droppedItems += 1;
      continue;
    }
    const technique = item.techniqueId ? techniqueById(item.techniqueId) : undefined;
    if (item.techniqueId && !technique) droppedTechniques += 1;
    const uncertain = pairs.some(({ inventory, disposition }) => affected.includes(inventory.assetId) && disposition === "uncertain");
    findings.set(item.threatId, {
      threat: pairs[0].threat,
      affectedAssetIds: affected,
      technique: technique ? { id: technique.id, name: technique.name } : null,
      why: item.why,
      riskDelta: item.riskDelta,
      triage: uncertain ? "uncertain" : "supported",
    });
  }

  const recommendations: WatchReport["recommendations"] = [];
  for (const proposal of draft.recommendations) {
    const finding = findings.get(proposal.threatId);
    const targets = finding && proposal.effects.map((effect) => effectTargets(effect, twin, finding.affectedAssetIds));
    if (!finding || !targets || targets.some((ids) => ids === null)) {
      droppedProposals += 1;
      continue;
    }
    const next = applyEffects(twin, proposal.effects);
    const riskDelta = Math.round((evaluateTwin(next).score - baselineScore) * 100) / 100;
    recommendations.push({
      id: `watch-${runId}-${recommendations.length + 1}`,
      title: proposal.title, kind: proposal.kind, description: proposal.description,
      targets: [...new Set([...finding.affectedAssetIds, ...targets.flatMap((ids) => ids ?? [])])],
      effects: proposal.effects,
      proposedBy: "threat-watch", status: "proposed", riskDelta,
    });
  }

  const warnings = [
    droppedItems && `Dropped ${droppedItems} unsupported or duplicate advisory entries.`,
    droppedAssets && `Dropped ${droppedAssets} unknown or unmatched asset references.`,
    droppedTechniques && `Dropped ${droppedTechniques} unknown ATT&CK for ICS technique IDs.`,
    droppedProposals && `Dropped ${droppedProposals} proposals with invalid, unrelated or unsupported effects.`,
  ].filter((warning): warning is string => !!warning);
  return {
    headline: findings.size ? draft.headline : "No supported advisory findings in this run.",
    items: [...findings.values()], recommendations, warnings,
  };
}
