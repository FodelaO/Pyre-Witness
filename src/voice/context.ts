/** Projects the current twin and checked analysis into the Chief's evidence snapshot. */
import type { RunState } from "@/pipeline/runStore";
import type { AttackPath, RiskReport, RuleFinding, Twin, ViewMode } from "@/twin/types";

export type VoiceRun = Pick<RunState, "runId" | "status" | "profile" | "assessment" | "selfCheck" | "placedAssetId"> & {
  mode?: "analyze" | "reassess";
};

export interface VoiceSnapshot {
  twin: Twin;
  risk: RiskReport;
  run: VoiceRun;
  selectedId: string | null;
  view: ViewMode;
}

function short(text: string, limit = 220): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function summarizeFinding({ ruleId, title, assetId, kind, severity, detail, fix, references }: RuleFinding) {
  return { ruleId, title, assetId, kind, severity, detail: short(detail), fix: fix && short(fix), references };
}

function summarizePath({ id, title, entry, target, causedBy, severity, likelihood, impact, ruleIds }: AttackPath) {
  return { id, title: short(title, 160), entry, target, causedBy, severity, likelihood, impact: short(impact), ruleIds };
}

function topFindings(findings: readonly RuleFinding[]) {
  return [...findings].sort((a, b) => b.severity - a.severity).slice(0, 8).map(summarizeFinding);
}

function topPaths(paths: readonly AttackPath[]) {
  return paths.filter((path) => path.source === "rules")
    .sort((a, b) => b.severity - a.severity || b.likelihood - a.likelihood).slice(0, 8).map(summarizePath);
}

export function buildVoiceContext({ twin, risk, run, selectedId, view }: VoiceSnapshot) {
  const { profile, assessment, selfCheck } = run;
  const assetPriority = (id: string) => Number(id === run.placedAssetId) * 2 + Number(id === selectedId);
  const keyAssets = [...twin.assets].sort((a, b) => assetPriority(b.id) - assetPriority(a.id)
    || Number(b.origin === "added") - Number(a.origin === "added") || b.criticality - a.criticality);
  const zones = new Map<string, Set<number>>();
  for (const { network } of twin.assets) {
    if (!zones.has(network.area)) zones.set(network.area, new Set());
    zones.get(network.area)?.add(network.level);
  }
  return {
    plant: { name: twin.plant.name, line: twin.plant.line, fictional: true },
    view,
    selectedId,
    areas: twin.areas.map(({ id, name, kind, attrs, typicalLevels, status }) => ({ id, name, kind, attrs, typicalLevels, status })),
    zones: Array.from(zones, ([name, levels]) => ({ name, levels: [...levels].sort((a, b) => a - b) })),
    assetCount: twin.assets.length,
    assets: keyAssets.slice(0, 72).map((asset) => ({
      id: asset.id, name: short(asset.name, 100), kind: asset.physical.kind, area: asset.physical.area,
      level: asset.network.level, zone: asset.network.area, criticality: asset.criticality, status: asset.status,
    })),
    currentRules: {
      score: risk.score, band: risk.band, byArea: risk.byArea,
      findingCount: risk.findings.length, topFindings: topFindings(risk.findings), exposurePaths: topPaths(risk.paths),
    },
    latestRun: {
      status: run.status,
      mode: run.mode,
      placedAssetId: run.placedAssetId,
      profile: profile && {
        type: short(profile.device_type, 100), category: profile.category,
        vendor: profile.vendor && short(profile.vendor, 100), model: profile.model && short(profile.model, 100),
        radios: profile.radios, cloudConnectivity: profile.cloud_connectivity,
        defaultCredentialsVisible: profile.default_credentials_visible, foodGrade: profile.food_grade,
        hazardRating: profile.hazardous_area_rating, ipRating: profile.ip_rating,
        unknowns: profile.unknowns.slice(0, 5).map((item) => short(item)), confidence: profile.confidence,
      },
      architectRecommendation: assessment && {
        area: assessment.physical_placement.area, nearAsset: assessment.physical_placement.near_asset_id,
        level: assessment.placement.level, zone: assessment.placement.network_area,
        why: short(assessment.placement.why),
        constraints: assessment.physical_placement.physical_constraints.slice(0, 4).map((item) => short(item)),
        avoid: assessment.never_place.slice(0, 4).map(({ where, area, level, why }) => ({ where: short(where), area, level, why: short(why) })),
        proposedRisks: assessment.risks.slice(0, 6).map(({ title, kind, severity, likelihood }) => ({ title: short(title), kind, severity, likelihood })),
        compliance: assessment.compliance.slice(0, 4).map(({ framework, clause, status, note }) => ({ framework, clause, status, note: short(note) })),
        confidence: assessment.confidence,
      },
      placementCheck: selfCheck && {
        scope: run.mode === "reassess" ? "current" : "recommended",
        passed: selfCheck.passed, revised: selfCheck.revised,
        disagreements: selfCheck.disagreements.slice(0, 4).map((item) => short(item)),
        topFindings: topFindings(selfCheck.findings), exposurePaths: topPaths(selfCheck.paths),
      },
    },
  };
}
