/** Builds the compact, read-only snapshot shared by the chat and the twin. */
import { crewLive, useCrewStore } from "@/crew/crewStore";
import { CREW_ORDER, type CrewId } from "@/crew/types";
import { roundUsd } from "@/econ/format";
import { plantExposure } from "@/econ/model";
import { useRunStore } from "@/pipeline/runStore";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { RiskReport } from "@/twin/types";
import { useWatchStore } from "@/watch/watchStore";

export interface AgentContext {
  plant: string;
  risk: { score: number; band: string };
  lossPerYear?: number;
  selected?: { id: string; name: string; kind: string; area: string };
  findings: { ruleId: string; assetId: string; title: string; severity: number }[];
  lastCapture?: { device: string; verdict: string; area: string; risks: string[] };
  news: { title: string; asset?: string; severity: number | string }[];
  crew: { agent: CrewId; status: string }[];
}

const annualLoss = new WeakMap<RiskReport, number>();

function clip(text: string, length = 140): string {
  return text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, length).toWellFormed();
}

export function buildAgentContext(): AgentContext {
  const { twin, risk, selectedId } = useTwinStore.getState();
  const { profile, assessment, selfCheck } = useRunStore.getState();
  const { review, local, managed } = useWatchStore.getState();
  const { live } = useCrewStore.getState();
  const asset = selectedId ? assetById(twin, selectedId) : undefined;
  const areaName = (id: Parameters<typeof areaById>[1]) => clip(areaById(twin, id)?.name ?? id);

  // The risk object changes when the configuration is evaluated, not on telemetry ticks.
  let lossPerYear = annualLoss.get(risk);
  if (lossPerYear === undefined) {
    // Same two-significant-figure rounding as the panel's "est. / yr" figure, so agents quote it.
    lossPerYear = roundUsd(plantExposure(twin, risk).totalAnnualised);
    annualLoss.set(risk, lossPerYear);
  }

  const candidates = [review.candidates.length ? review : local, managed]
    .flatMap(({ candidates, report }) => candidates.length ? candidates : report?.candidates ?? [])
    .filter(({ disposition, inventory }) => disposition !== "excluded" && assetById(twin, inventory.assetId))
    .sort((a, b) => (b.decisions?.severity ?? -1) - (a.decisions?.severity ?? -1)
      || b.score - a.score || b.threat.published.localeCompare(a.threat.published));
  const news: AgentContext["news"] = [];
  const seen = new Set<string>();
  for (const { threat, inventory, decisions } of candidates) {
    if (seen.has(threat.id)) continue;
    seen.add(threat.id);
    news.push({ title: clip(threat.title, 160), asset: clip(inventory.assetId, 64), severity: decisions?.severity ?? "unrated" });
    if (news.length === 5) break;
  }

  return {
    plant: clip(`${twin.plant.name}, ${twin.plant.line}`),
    risk: { score: risk.score, band: risk.band },
    lossPerYear,
    selected: asset && { id: clip(asset.id, 64), name: clip(asset.name), kind: asset.physical.kind, area: areaName(asset.physical.area) },
    findings: [...risk.findings].sort((a, b) => b.severity - a.severity).slice(0, 12)
      .map(({ ruleId, assetId, title, severity }) => ({ ruleId: clip(ruleId, 64), assetId: clip(assetId, 64), title: clip(title), severity })),
    lastCapture: profile && assessment ? {
      device: clip([profile.device_type, profile.vendor, profile.model].filter(Boolean).join(" · ")),
      verdict: selfCheck ? (selfCheck.passed ? "passed" : "flagged") : "pending",
      area: areaName(assessment.physical_placement.area),
      risks: assessment.risks.slice(0, 5).map(({ title }) => clip(title, 100)),
    } : undefined,
    news,
    crew: CREW_ORDER.map((agent) => {
      const { status, message } = crewLive(agent, live);
      return { agent, status: clip(`${status} · ${message}`, 100) };
    }),
  };
}
