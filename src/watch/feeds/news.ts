/** Normalizes public incident notices and security news from the UK NCSC RSS. */
import type { ThreatItem } from "../types";
import { readRss } from "./rss";

export function parseNews(xml: string): ThreatItem[] {
  return readRss(xml, "www.ncsc.gov.uk").map((entry) => ({ ...entry, id: entry.url, source: "ncsc-news" }));
}
