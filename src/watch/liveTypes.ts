/** Contracts for recent feed checks alongside the existing model-review stream. */
import type { SourceResult, ThreatItem } from "./types";
import { WATCH_SOURCES } from "./sources";

export const LIVE_SOURCE_LABELS = {
  "cisa-kev": WATCH_SOURCES["cisa-kev"].label,
  "cisa-ics": WATCH_SOURCES["cisa-ics"].label,
  "ncsc-news": WATCH_SOURCES["ncsc-news"].label,
  openfda: "openFDA",
} as const satisfies Record<LiveItem["source"], string>;

export const LIVE_CHECK_INTERVAL_MS = 10 * 60_000;

export interface BeverageRecall extends Omit<ThreatItem, "source"> {
  source: "openfda";
  firm: string;
}

export type LiveItem = (ThreatItem & { cvss?: number; cvssScore?: number; knownExploited?: boolean }) | BeverageRecall;
export type LiveSourceResult = Omit<SourceResult, "source"> & { source: LiveItem["source"] };

export interface LiveCheck {
  checkedAt: number;
  items: LiveItem[];
  sources: LiveSourceResult[];
}

export const liveItemKey = (item: LiveItem) => `${item.source}:${item.id}`;
