/** Saves daily reports and restores only pending, applicable watch proposals. */
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import { z } from "zod";
import { MAX_WATCH_PROPOSALS, watchProposalSchema } from "./reassessmentSchema";
import type { WatchReport } from "./types";
import { effectTargets, measureWatchEffects } from "./watchEffects";

export const LAST_WATCH_DAY = "pyre-witness:watch:last-day";
const REPORT_KEYS = {
  local: "pyre-witness:watch:last-report",
  managed: "pyre-witness:watch:managed-report",
} as const;

const savedProposalSchema = watchProposalSchema.omit({ threatId: true }).extend({
  id: z.string().min(1).max(160),
  description: z.string().max(320),
  targets: z.array(z.string().min(1).max(160)).min(1).max(32),
  proposedBy: z.literal("threat-watch"),
  status: z.literal("proposed"),
  riskDelta: z.number().min(-100).max(100),
});

export function readWatchStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeWatchStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ }
}

const receiptKey = (id: string) => `pyre-witness:watch:decided:${id}`;

export function watchReceipt(id: string): "applied" | "rejected" | undefined {
  const receipt = readWatchStorage(receiptKey(id));
  if (receipt === "applied" || receipt === "rejected") return receipt;
}

export function watchDecision(item: Mitigation): boolean {
  return item.proposedBy === "threat-watch" && (item.status === "applied" || item.status === "rejected");
}

export function rememberWatchDecision(item: Mitigation): void {
  writeWatchStorage(receiptKey(item.id), item.status);
}

export function saveWatchReport(report: WatchReport): void {
  const recommendations = report.recommendations.filter(({ status, proposedBy }) => status === "proposed" && proposedBy === "threat-watch");
  writeWatchStorage(REPORT_KEYS[report.mode], JSON.stringify({ ...report, recommendations }));
}

export function restoreWatchReport(date: string, mode: WatchReport["mode"]): WatchReport | undefined {
  let report: WatchReport;
  try {
    report = JSON.parse(readWatchStorage(REPORT_KEYS[mode]) ?? "null");
    if (report?.date !== date || report.mode !== mode || !Number.isFinite(report.finishedAt)
      || !Array.isArray(report.stages) || !Array.isArray(report.items) || !Array.isArray(report.sources)
      || !Array.isArray(report.candidates) || !Array.isArray(report.warnings)) return;
  } catch {
    return;
  }

  const { twin, risk, mitigations, proposeMitigations } = useTwinStore.getState();
  const live = new Map(mitigations.map((item) => [item.id, item]));
  const assets = new Set(twin.assets.map(({ id }) => id));
  const pending: WatchReport["recommendations"] = [];
  const fresh: WatchReport["recommendations"] = [];
  const seen = new Set<string>();
  let stale = 0;
  const saved = Array.isArray(report.recommendations) ? report.recommendations.slice(0, MAX_WATCH_PROPOSALS) : [];
  for (const value of saved) {
    const parsed = savedProposalSchema.safeParse(value);
    if (!parsed.success) { stale += 1; continue; }
    const item = parsed.data;
    if (seen.has(item.id) || watchReceipt(item.id)) continue;
    seen.add(item.id);

    const existing = live.get(item.id);
    if (existing) {
      if (existing.status === "proposed" && existing.proposedBy === "threat-watch") {
        pending.push({ ...existing, riskDelta: existing.riskDelta ?? item.riskDelta });
      }
      continue;
    }

    const affected = item.targets.filter((id) => assets.has(id));
    if (!affected.length || item.effects.some((effect) => !effectTargets(effect, twin, affected))) {
      stale += 1;
      continue;
    }
    const measured = { ...item, riskDelta: measureWatchEffects(twin, item.effects, risk.score) };
    fresh.push(measured);
    pending.push(measured);
  }
  if (fresh.length) proposeMitigations(fresh);
  const warnings = stale ? [...report.warnings, `${stale} saved proposals need a fresh review against the current twin.`] : report.warnings;
  return { ...report, warnings, recommendations: pending };
}
