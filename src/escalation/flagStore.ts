/** Publishes active low-tier asset flags to the 2D and 3D renderers. */
import { create } from "zustand";
import type { EscalationRecord } from "./types";

interface AssetFlag {
  assetId: string;
  level: 1;
  reason: string;
}

export const useFlagStore = create<{ flags: AssetFlag[] }>(() => ({ flags: [] }));

export function syncFlags(records: readonly EscalationRecord[]) {
  const active = records.filter(({ resolvedAt, dismissedAt }) => !resolvedAt && !dismissedAt);
  const escalated = new Set(active.filter(({ level }) => level === 2 || level === 3).map(({ trigger }) => trigger.assetId));
  const byAsset = new Map<string, AssetFlag>();
  for (const { level, trigger } of active) {
    if (level !== 1 || !trigger.assetId || escalated.has(trigger.assetId)) continue;
    byAsset.set(trigger.assetId, { assetId: trigger.assetId, level, reason: trigger.title });
  }
  const flags = [...byAsset.values()];
  const previous = useFlagStore.getState().flags;
  if (flags.length !== previous.length || flags.some((flag, i) =>
    flag.assetId !== previous[i].assetId || flag.reason !== previous[i].reason)) useFlagStore.setState({ flags });
}
