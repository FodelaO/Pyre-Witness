/** Normalizes the CISA industrial control systems advisory RSS. */
import type { ThreatItem } from "../types";
import { readRss } from "./rss";

export function parseIcs(xml: string): ThreatItem[] {
  return readRss(xml, "www.cisa.gov").map((entry) => ({
    ...entry,
    source: "cisa-ics",
    id: entry.url.match(/\bICS(?:A|MA)-\d{2}-\d{3}-\d{2,}\b/i)?.[0].toUpperCase() ?? entry.url,
  }));
}
