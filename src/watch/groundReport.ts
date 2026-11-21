/** Grounds watch output in the live evidence and measures each proposal in an isolated twin. */
import { techniqueById } from "@/data/attack-ics";
import type { Twin } from "@/twin/types";
import type { Reassessment } from "./reassessmentSchema";
import { threatKey } from "./sources";
import type { TriagedCandidate } from "./triage";
import type { WatchFinding, WatchReport } from "./types";
import { effectTargets, measureWatchEffects } from "./watchEffects";

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
    const riskDelta = measureWatchEffects(twin, proposal.effects, baselineScore);
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
