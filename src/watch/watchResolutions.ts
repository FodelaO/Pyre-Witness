/** Builds human-review resolutions from live matches and explicitly simulated drills. */
import { playWatchCues } from "@/crew/crewStore";
import { watchCrewCues, type WatchCrewTarget } from "@/crew/watchCrew";
import { evaluateTwin } from "@/rules/engine";
import { ruleProposals } from "@/todo/ruleProposals";
import { todoTitle } from "@/todo/todos";
import { applyEffects } from "@/twin/effects";
import { useTwinStore } from "@/twin/store";
import type { Mitigation, MitigationEffect, RiskReport, Twin } from "@/twin/types";
import { missingWatchDrills } from "./drills";
import { watchReceipt } from "./watchCache";
import { LIVE_SOURCE_LABELS, liveItemKey, type LiveCheck } from "./liveTypes";
import { rankWatchItems } from "./relevance";
import { WATCH_SOURCES, threatKey } from "./sources";
import type { Candidate, WatchReport } from "./types";
import { classifyVuln, type VulnType } from "./vulnType";

interface WatchMatch {
  key: string;
  title: string;
  type: VulnType;
  assetIds: string[];
  source: string;
  drill?: boolean;
}

const procedures: Record<VulnType, [title: string, action: string]> = {
  advisory: ["Verify advisory applicability", "Check the installed version against the publisher's affected versions and schedule the vendor-approved fix if applicable."],
  ransomware: ["Test clean recovery", "Verify isolated backups and rehearse restoring the affected equipment from a trusted image."],
  plcFirmware: ["Validate firmware update", "Confirm the installed firmware and verify the vendor-approved update in a maintenance window."],
  remoteAccess: ["Review remote access", "Verify approved access routes and disable unnecessary remote access through change control."],
  wireless: ["Review wireless exposure", "Confirm which wireless interfaces are required and review their security settings."],
  softwareUpdate: ["Verify signed updates", "Validate vendor signatures and stage a known-good update before deployment."],
  newSoftware: ["Review installed software", "Check installed tools against the approved inventory and remove unauthorized software through change control."],
  foodRecall: ["Verify label controls", "Verify ingredient declarations and lot traceability against the approved label before release."],
};

export const watchResolutionId = (key: string) => `watch:resolution:${key}`;

export function planWatchResolution(match: WatchMatch, twin: Twin, risk: RiskReport, rules = ruleProposals(twin, risk)): Mitigation {
  const [procedure, action] = procedures[match.type];
  const assets = twin.assets.filter(({ id }) => match.assetIds.includes(id));
  const controls = assets.flatMap<MitigationEffect>(({ id, cyber }) => {
    if (match.type === "remoteAccess" && cyber?.remoteAccess) {
      return [{ type: "patch_cyber", assetId: id, patch: { remoteAccess: false } }];
    }
    if (match.type === "wireless") {
      return (cyber?.radios ?? []).filter((radio) => radio !== "nfc")
        .map((radio) => ({ type: "disable_radio", assetId: id, radio }));
    }
    return [];
  });
  // For unauthorized software, a rules-backed port lock reduces future local installation exposure.
  const portControl = match.type === "newSoftware" && rules.find(({ id, targets }) =>
    id.startsWith("todo:rules:ports:") && targets.some((target) => match.assetIds.includes(target)));
  if (portControl) controls.push(...portControl.effects);
  const delta = controls.length ? evaluateTwin(applyEffects(twin, controls)).score - risk.score : 0;
  const modeled = delta < 0;
  const title = modeled ? portControl ? portControl.title
    : match.type === "remoteAccess" ? "Restrict remote access" : "Disable exposed radios" : procedure;
  const followUp = modeled && portControl ? ` ${portControl.description} This hardens local access against future installs.` : "";
  const qualifier = match.drill ? "Simulated drill" : match.type === "foodRecall" ? "Sector comparison" : "Inventory match";
  return {
    id: watchResolutionId(match.key), title, kind: modeled ? portControl ? "physical" : "software" : "procedural",
    description: `${qualifier} · ${match.title} · ${match.assetIds.join(", ")}. ${action}${followUp}`,
    targets: match.assetIds, effects: modeled ? controls : [{ type: "note", text: action }],
    proposedBy: "threat-watch", status: "proposed", riskDelta: modeled ? delta : 0,
  };
}

export function inspectWatchMatch(risk: RiskReport, { assetId }: WatchCrewTarget): boolean {
  return risk.paths.some(({ source, target }) => source === "rules" && target === assetId);
}

function candidateMatches(candidates: Candidate[]): WatchMatch[] {
  const matches = new Map<string, WatchMatch>();
  for (const { threat, inventory, disposition } of candidates) {
    if (disposition === "excluded") continue;
    const key = threatKey(threat);
    const match = matches.get(key) ?? {
      key, title: threat.title, type: classifyVuln(threat), source: WATCH_SOURCES[threat.source].label, assetIds: [],
    };
    if (!match.assetIds.includes(inventory.assetId)) match.assetIds.push(inventory.assetId);
    matches.set(key, match);
  }
  return [...matches.values()];
}

const targetOf = (match: WatchMatch): WatchCrewTarget => ({ assetId: match.assetIds[0], source: match.source, drill: match.drill });

export function cueWatchMatches(candidates: Candidate[], runId: string, at: number) {
  const { twin } = useTwinStore.getState();
  const first = candidateMatches(candidates).find(({ assetIds }) => twin.assets.some(({ id }) => id === assetIds[0]));
  if (first) playWatchCues(watchCrewCues({ type: "matched", runId, at, target: targetOf(first) }, twin));
}

function publishResolutions(matches: WatchMatch[], runId: string, at: number, report?: WatchReport) {
  const { twin, risk, mitigations, proposeMitigations } = useTwinStore.getState();
  const existing = new Map(mitigations.map((item) => [item.id, item]));
  const assets = new Set(twin.assets.map(({ id }) => id));
  const controls = ruleProposals(twin, risk);
  const prepared = matches.flatMap((match) => {
    const assetIds = match.assetIds.filter((id) => assets.has(id));
    if (!assetIds.length) return [];
    const proposal = planWatchResolution({ ...match, assetIds }, twin, risk, controls);
    return [{ type: match.type, target: targetOf({ ...match, assetIds }), proposal }];
  });
  const fresh = prepared.filter(({ proposal }) => !existing.has(proposal.id) && !watchReceipt(proposal.id));
  if (fresh.length) proposeMitigations(fresh.map(({ proposal }) => proposal));

  const modelProposal = report?.recommendations.find(({ id }) => existing.has(id));
  const freshIds = new Set(fresh.map(({ proposal }) => proposal.id));
  const ready = prepared.filter(({ proposal }) => freshIds.has(proposal.id) || existing.get(proposal.id)?.status === "proposed");
  const selected = (modelProposal && prepared.find(({ target }) => modelProposal.targets.includes(target.assetId)))
    || ready.find(({ target, proposal }) => !target.drill && (proposal.riskDelta ?? 0) < 0)
    || ready.find(({ type, target }) => !target.drill && type !== "foodRecall" && inspectWatchMatch(risk, target))
    || ready.find(({ proposal }) => (proposal.riskDelta ?? 0) < 0)
    || ready[0] || prepared[0];
  if (!selected) return;
  const { target } = selected;
  const proposal = modelProposal?.targets.includes(target.assetId) ? modelProposal
    : useTwinStore.getState().mitigations.find(({ id, status }) => id === selected.proposal.id && status === "proposed");
  const admitted = proposal ? { title: todoTitle(proposal.title), engine: proposal === modelProposal ? "watch model review" : "watch resolution rules" } : undefined;
  const brief = `${target.assetId} · ${admitted ? "resolution ready for approval" : "watch item reviewed"}.`;
  playWatchCues([
    ...watchCrewCues({ type: "matched", runId, at, target }, twin),
    ...watchCrewCues({ type: "reviewed", runId, at, target, pathFound: inspectWatchMatch(risk, target), proposal: admitted, brief }, twin),
  ]);
}

export function publishLiveWatchResolutions(check: LiveCheck, candidates: Candidate[]) {
  if (!check.sources.some(({ error }) => !error)) return;
  const { twin } = useTwinStore.getState();
  const matches = rankWatchItems(check.items, twin, check.checkedAt, candidates)
    .filter(({ assetIds }) => assetIds.length)
    .map(({ item, assetIds }) => ({
      key: liveItemKey(item), title: item.title, type: classifyVuln(item), assetIds, source: LIVE_SOURCE_LABELS[item.source],
    }));
  const drills = missingWatchDrills(check.items, twin).map(({ type, title, asset }) => ({
    key: `drill:${type}`, title, type, assetIds: [asset.id], source: "tabletop scenario", drill: true,
  }));
  publishResolutions([...matches, ...drills], `watch-live-${check.checkedAt}`, check.checkedAt);
}

export function publishReviewedWatchResolutions(report: WatchReport) {
  publishResolutions(candidateMatches(report.candidates), report.runId, report.finishedAt, report);
}
