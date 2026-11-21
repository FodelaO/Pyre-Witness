/** Projects plant activity into compact rows with assessed event losses. */
import { displayedEventLoss } from "@/econ/displayLedger";
import { estimateLoss } from "@/econ/model";
import { scenarioFromSimulation } from "@/econ/scenarios";
import { placedDeviceLoss, type RunEvidence } from "@/escalation/placedDeviceLoss";
import type { EscalationRecord } from "@/escalation/types";
import { MODEL_IDS } from "@/gemini/models";
import { placementChecks } from "@/panel/runEvidence";
import type { PipelineEvent } from "@/pipeline/types";
import type { SimRun, SimScenarioId } from "@/sim/types";
import type { EquipmentKind, Mitigation, Twin } from "@/twin/types";

type TickerKind = PipelineEvent["type"] | "capture" | "simulation" | "escalation" | "test-escalation"
  | "mitigation" | "advisory" | "recall" | "feed-check" | "watch-review";

export interface TickerItem {
  id: string;
  kind: TickerKind;
  tone: "alert" | "warn" | "ok";
  title: string;
  at: number;
  assetId?: string;
  assetKind?: EquipmentKind;
  loss?: number;
  source: "news" | "detection" | "workflow" | "task";
}

const HIGH_LOSS = 100_000;
const FRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const STALE_LOSS_WEIGHT = 0.8;

export function triageTone(loss: number | undefined, state: "review" | "urgent" | "clear" = "review"): TickerItem["tone"] {
  if (state === "clear") return "ok";
  return state === "urgent" || (loss ?? 0) >= HIGH_LOSS ? "alert" : "warn";
}

export function distinctTickerItems(items: readonly TickerItem[]): TickerItem[] {
  const rows = new Map<string, TickerItem>();
  const ids = new Set<string>();
  for (const item of items.toSorted((a, b) => b.at - a.at)) {
    if (ids.has(item.id)) continue;
    ids.add(item.id);
    const key = JSON.stringify([item.assetId ?? null, item.kind]);
    if (!rows.has(key)) rows.set(key, item);
  }
  return [...rows.values()];
}

function priority(item: TickerItem, now: number): number {
  if (item.tone === "ok") return 0;
  // An urgent item with no estimate belongs in the alert band, but its tooltip stays unpriced.
  const loss = item.loss ?? (item.tone === "alert" ? HIGH_LOSS : 0);
  return now - item.at > FRESH_WINDOW_MS ? loss * STALE_LOSS_WEIGHT : loss;
}

export function rankTickerItems(items: readonly TickerItem[], now: number): TickerItem[] {
  return items.toSorted((a, b) => priority(b, now) - priority(a, now)
    || Number(b.tone !== "ok") - Number(a.tone !== "ok") || b.at - a.at);
}

function detectionItem(run: RunEvidence, twin: Twin): TickerItem | undefined {
  const { events, profile, assessment, placedAssetId } = run;
  const start = events[0];
  if (start?.type !== "run.started" || start.mode === "reassess") return;
  const end = events.findLast(({ type }) => type === "run.completed" || type === "run.error");
  if (!end) return;

  const base = { id: `capture:${end.runId}`, kind: "capture" as const, at: end.at,
    source: "detection" as const, assetId: placedAssetId ?? undefined };
  if (end.type === "run.error") {
    if (end.stage === "gate" && events.some((event) => event.type === "gate.done" && !event.gate.proceed)) {
      return { ...base, tone: "alert", title: "Capture rejected" };
    }
    return;
  }

  const { recommendation, dropped } = placementChecks(events);
  if (!recommendation) return;
  const loss = placedDeviceLoss(twin, run)?.loss;
  const device = profile?.category === "camera" ? "Camera" : profile?.object_class === "passive_object" ? "Object" : "Device";
  if (!recommendation.passed || assessment?.placement.why.startsWith("HOLD:")) {
    return { ...base, loss, tone: "alert", title: `${device} held` };
  }
  if (loss || recommendation.findings.length || dropped?.passed === false || dropped?.findings.length || assessment?.risks.length) {
    return { ...base, loss, tone: triageTone(loss), title: `${device} review` };
  }
  return { ...base, loss, tone: "ok", title: `${device} passed` };
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

export function pipelineTickerItems(run: RunEvidence, twin: Twin): TickerItem[] {
  const detection = detectionItem(run, twin);
  const items = detection ? [detection] : [];
  for (const [index, event] of run.events.entries()) {
    const title = completedStep(event);
    if (title) items.push({
      id: `pipeline:${index}:${event.runId}`, kind: event.type, title, at: event.at,
      assetId: run.placedAssetId ?? undefined, tone: "ok", source: "task",
    });
  }
  return items;
}

const scenarioNames: Record<SimScenarioId, string> = {
  cip: "CIP", ammonia: "NH₃", chiller: "Chiller", carbonation: "CO₂", ransomware: "IT", wireless: "RF",
};

export function simulationTickerItem(run: SimRun, id: string, at: number, twin: Twin): TickerItem {
  const scenario = scenarioFromSimulation(twin, run);
  const loss = scenario ? displayedEventLoss(estimateLoss(twin, scenario)) : undefined;
  const assetId = scenario?.assetId ?? run.stages.toReversed().flatMap(({ where }) => where)
    .find((target) => twin.assets.some((asset) => asset.id === target));
  return {
    id, kind: "simulation", at, assetId, loss, source: "workflow", tone: triageTone(loss, run.contained ? "clear" : "review"),
    title: `Sim ${scenarioNames[run.id]} ${run.contained ? "contained" : "uncontained"}`,
  };
}

export function escalationTickerItems(records: readonly EscalationRecord[]): TickerItem[] {
  return records.map(({ id, raisedAt, resolvedAt, trigger }) => {
    const test = trigger.test ? "Test" : trigger.kind === "simulation" ? "Sim" : undefined;
    const base = { id: `escalation:${id}`, source: "workflow" as const, assetId: trigger.assetId ?? undefined,
      assetKind: trigger.assetKind ?? undefined, loss: trigger.loss ?? undefined,
      kind: trigger.test ? "test-escalation" as const : "escalation" as const };
    return resolvedAt === undefined
      ? { ...base, at: raisedAt, title: test ? `${test} alert` : "Threshold alert", tone: "alert" }
      : { ...base, at: resolvedAt, title: test ? `${test} resolved` : "Escalation resolved", tone: "ok" };
  });
}

export function approvedMitigation(item: Mitigation): boolean {
  return item.status === "approved" || item.status === "applied";
}

export function mitigationTickerItem(item: Mitigation, id: string, at: number, assetIds: ReadonlySet<string>): TickerItem {
  return {
    id, kind: "mitigation", at, assetId: item.targets.find((target) => assetIds.has(target)),
    title: "Mitigation approved", source: "task", tone: "ok",
  };
}
