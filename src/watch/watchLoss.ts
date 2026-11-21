/** Adapts one matched feed item to a conditional event in the shared loss model. */
import { estimateLoss } from "@/econ/model";
import { scenarioFromWatch } from "@/econ/scenarios";
import type { Twin } from "@/twin/types";
import { liveItemKey } from "./liveTypes";
import type { WatchRelevance } from "./relevance";

export function estimateWatchLoss(twin: Twin, row: WatchRelevance) {
  const [assetId] = row.assetIds;
  if (!assetId) return;
  const { item, knownExploited, cvss } = row;
  if (item.source === "openfda") {
    const eventId = liveItemKey(item);
    return estimateLoss(twin, {
      id: JSON.stringify(["watch", eventId, assetId]),
      assetId,
      consequence: "productRecall",
      trigger: { kind: "watch", id: eventId, label: item.title },
    });
  }
  const base = scenarioFromWatch(twin, item, assetId);
  return estimateLoss(twin, { ...base, trigger: { ...base.trigger, knownExploited, cvss } });
}
