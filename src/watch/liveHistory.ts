/** Tracks changes against each publisher's last successful check. */
import { liveItemKey, type LiveCheck, type LiveItem } from "./liveTypes";

const HISTORY_KEY = "pyre-witness:watch:live-item-keys";
export type FeedHistory = Partial<Record<LiveItem["source"], string[]>>;
let tabHistory: FeedHistory = {};

export function compareChecks(previous: FeedHistory, check: LiveCheck) {
  const history = { ...previous };
  const added = new Set<string>();
  for (const { source, error } of check.sources) {
    if (error) continue;
    const before = history[source];
    const keys = check.items.filter((item) => item.source === source).map(liveItemKey);
    if (before) {
      const existing = new Set(before);
      for (const key of keys) if (!existing.has(key)) added.add(key);
    }
    history[source] = keys;
  }
  return { history, added };
}

export function recordLiveCheck(check: LiveCheck): Set<string> {
  const previous = { ...tabHistory };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "null");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      for (const { source } of check.sources) {
        const keys = (saved as Record<string, unknown>)[source];
        if (Array.isArray(keys) && keys.every((key) => typeof key === "string")) previous[source] = keys;
      }
    }
  } catch { /* The in-memory baseline still covers this tab. */ }

  const { history, added } = compareChecks(previous, check);
  tabHistory = history;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* The live feed is still usable. */ }
  return added;
}
