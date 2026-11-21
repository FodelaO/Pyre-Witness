/** Converts reviewed advisories and public recall matches into ticker rows. */
import { displayedEventLoss } from "@/econ/displayLedger";
import type { Twin } from "@/twin/types";
import { liveItemKey, type LiveCheck, type LiveItem } from "@/watch/liveTypes";
import { rankWatchItems, type WatchRelevance } from "@/watch/relevance";
import { estimateWatchLoss } from "@/watch/watchLoss";
import type { WatchReport } from "@/watch/types";
import { triageTone, type TickerItem } from "./items";

function watchMatchItem(
  row: WatchRelevance, at: number, twin: Twin, lossThreshold: number,
): TickerItem | undefined {
  const priced = row.assetIds.map((assetId) => ({
    assetId, loss: displayedEventLoss(estimateWatchLoss(twin, { ...row, assetIds: [assetId] })),
  })).sort((a, b) => b.loss - a.loss)[0];
  if (!priced) return;
  const kind = row.item.source === "openfda" ? "recall" : "advisory";
  const title = kind === "recall" ? "Recall match" : row.knownExploited ? "KEV advisory" : "Advisory match";
  return {
    id: `news:${liveItemKey(row.item)}`, kind, title, at, source: "news", ...priced,
    tone: triageTone(priced.loss, priced.loss >= lossThreshold ? "urgent" : "review"),
  };
}

function checkedAll(sources: LiveCheck["sources"]): boolean {
  return sources.length > 0 && sources.every(({ error }) => !error);
}

export function watchTickerItems(
  check: LiveCheck | undefined, reports: readonly WatchReport[], twin: Twin, lossThreshold: number,
): TickerItem[] {
  const items = new Map<string, LiveItem>();
  const evidenceTimes = new Map<string, number>();
  const grounded = new Map<string, string[]>();
  const record = (item: LiveItem, at: number) => {
    const key = liveItemKey(item);
    items.set(key, item);
    if (!evidenceTimes.has(key)) evidenceTimes.set(key, at);
  };
  const ordered = reports.toSorted((a, b) => a.finishedAt - b.finishedAt);
  for (const report of ordered) {
    for (const { threat } of report.candidates) record(threat, report.finishedAt);
    for (const { threat, affectedAssetIds } of report.items) {
      record(threat, report.finishedAt);
      grounded.set(liveItemKey(threat), affectedAssetIds);
    }
  }
  if (check) for (const item of check.items) record(item, check.checkedAt);

  const reviews = ordered.flatMap(({ candidates }) => candidates);
  const now = check?.checkedAt ?? ordered.at(-1)?.finishedAt ?? 0;
  const present = new Set(twin.assets.map(({ id }) => id));
  const matches = rankWatchItems([...items.values()], twin, now, reviews).flatMap((row) => {
    if (row.triage === "excluded") return [];
    const assetIds = row.assetIds.length ? row.assetIds : (grounded.get(liveItemKey(row.item)) ?? []).filter((assetId) => present.has(assetId));
    return assetIds.length ? [{ ...row, assetIds }] : [];
  });
  const dated = matches.map((row) => {
    const published = Date.parse(row.item.published);
    return { row, at: Number.isFinite(published) ? published : evidenceTimes.get(liveItemKey(row.item)) ?? now };
  });
  const rows = dated.flatMap(({ row, at }) => {
    const item = watchMatchItem(row, at, twin, lossThreshold);
    return item ? [item] : [];
  });

  const matchKeys = new Set(matches.map(({ item }) => liveItemKey(item)));
  if (check && checkedAll(check.sources) && !check.items.some((item) => matchKeys.has(liveItemKey(item)))) {
    rows.push({ id: `feeds:${check.checkedAt}`, kind: "feed-check", title: "Feed check clear", at: check.checkedAt, tone: "ok", source: "news" });
  }
  for (const report of ordered) {
    const clean = checkedAll(report.sources) && !report.warnings.length && !report.items.length
      && report.candidates.every(({ disposition }) => disposition === "excluded")
      && report.stages.every(({ state }) => state === "done" || state === "skipped");
    if (clean) rows.push({ id: `watch:${report.runId}`, kind: "watch-review", title: "Watch review clear", at: report.finishedAt, tone: "ok", source: "news" });
  }
  return rows;
}
