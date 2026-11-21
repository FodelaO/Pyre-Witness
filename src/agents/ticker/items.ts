/** Projects completed plant activity into compact ticker rows. */
import type { EscalationRecord } from "@/escalation/types";
import { MODEL_IDS } from "@/gemini/models";
import { placementChecks } from "@/panel/runEvidence";
import type { RunState } from "@/pipeline/runStore";
import type { PipelineEvent } from "@/pipeline/types";
import type { SimRun, SimScenarioId } from "@/sim/types";
import type { Mitigation } from "@/twin/types";

export interface TickerItem {
  id: string;
  tone: "alert" | "warn" | "ok";
  title: string;
  at: number;
  assetId?: string;
  source: "news" | "detection" | "workflow" | "task";
}

export const TICKER_LIMIT = 30;

export function newestTickerItems(items: readonly TickerItem[]): TickerItem[] {
  const rows = new Map<string, TickerItem>();
  for (const item of items.toSorted((a, b) => b.at - a.at)) {
    if (!rows.has(item.id)) rows.set(item.id, item);
    if (rows.size === TICKER_LIMIT) break;
  }
  return [...rows.values()];
}

type CaptureState = Pick<RunState, "events" | "profile" | "assessment" | "placedAssetId">;

function detectionItem({ events, profile, assessment, placedAssetId }: CaptureState): TickerItem | undefined {
  const start = events[0];
  if (start?.type !== "run.started" || start.mode === "reassess") return;
  const end = events.findLast(({ type }) => type === "run.completed" || type === "run.error");
  if (!end) return;

  const base = { id: `capture:${end.runId}`, at: end.at, source: "detection" as const, assetId: placedAssetId ?? undefined };
  if (end.type === "run.error") {
    if (end.stage === "gate" && events.some((event) => event.type === "gate.done" && !event.gate.proceed)) {
      return { ...base, tone: "alert", title: "Capture rejected" };
    }
    return;
  }

  const { recommendation, dropped } = placementChecks(events);
  if (!recommendation) return;
  const device = profile?.category === "camera" ? "Camera" : profile?.object_class === "passive_object" ? "Object" : "Device";
  if (!recommendation.passed || assessment?.placement.why.startsWith("HOLD:")) {
    return { ...base, tone: "alert", title: `${device} on hold` };
  }
  if (recommendation.findings.length || dropped?.passed === false || dropped?.findings.length || assessment?.risks.length) {
    return { ...base, tone: "warn", title: `${device} needs review` };
  }
  return { ...base, tone: "ok", title: `${device} passed` };
}

function completedStep(event: PipelineEvent): string | undefined {
  switch (event.type) {
    case "link.fetched": return "Product link read";
    case "gate.done": return event.gate.proceed && Object.keys(event.gate.answers).length ? "Capture admitted" : undefined;
    case "perception.done": return "Device identified";
    case "reasoning.done": return "Placement assessed";
    case "selfcheck.done": {
      if (!event.result.passed || event.result.findings.length) return;
      if (event.result.disagreements.some((reason) => reason.startsWith("HOLD:"))) return "Alternative checked";
      return event.phase === "as-dropped" ? "Drop check passed" : event.phase === "post-revision" ? "Revision check passed" : "Rules check passed";
    }
    case "revision.done": return "Placement revised";
    case "summary.done": return event.model === MODEL_IDS.chief ? "Briefing ready" : undefined;
  }
}

export function pipelineTickerItems(run: CaptureState): TickerItem[] {
  const detection = detectionItem(run);
  const items = detection ? [detection] : [];
  for (const [index, event] of run.events.entries()) {
    const title = completedStep(event);
    if (title) items.push({
      id: `pipeline:${index}:${event.runId}`, title, at: event.at,
      assetId: run.placedAssetId ?? undefined, tone: "ok", source: "task",
    });
  }
  return items;
}

const scenarioNames: Record<SimScenarioId, string> = {
  cip: "CIP", ammonia: "NH₃", chiller: "Chiller", carbonation: "CO₂", ransomware: "IT", wireless: "RF",
};

export function simulationTickerItem(run: SimRun, id: string, at: number, assetIds: ReadonlySet<string>): TickerItem {
  const assetId = run.stages.toReversed().flatMap(({ where }) => where).find((target) => assetIds.has(target));
  return {
    id, at, assetId, source: "workflow", tone: run.contained ? "ok" : "alert",
    title: `Sim ${scenarioNames[run.id]} ${run.contained ? "contained" : "uncontained"}`,
  };
}

export function escalationTickerItems(records: readonly EscalationRecord[]): TickerItem[] {
  return records.flatMap(({ id, raisedAt, resolvedAt, trigger }) => {
    const test = trigger.test ? "Test" : trigger.kind === "simulation" ? "Sim" : undefined;
    const base = { source: "workflow" as const, assetId: trigger.assetId ?? undefined };
    const rows: TickerItem[] = [{ ...base, id: `escalation:${id}`, at: raisedAt, title: test ? `${test} alert raised` : "Threshold crossed", tone: "alert" }];
    if (resolvedAt !== undefined) rows.push({
      ...base, id: `resolved:${id}`, at: resolvedAt, title: test ? `${test} alert resolved` : "Escalation resolved", tone: "ok",
    });
    return rows;
  });
}

export function approvedMitigation(item: Mitigation): boolean {
  return item.status === "approved" || item.status === "applied";
}

export function mitigationTickerItem(item: Mitigation, id: string, at: number, assetIds: ReadonlySet<string>): TickerItem {
  return {
    id, at, assetId: item.targets.find((target) => assetIds.has(target)),
    title: "Mitigation approved", source: "task", tone: "ok",
  };
}
