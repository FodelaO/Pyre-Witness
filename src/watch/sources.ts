/** Fixed publisher endpoints shared by the server and the source chips. */
import type { ThreatItem, ThreatSource } from "./types";

export const WATCH_SOURCES = {
  "cisa-kev": {
    label: "CISA KEV",
    url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
  },
  "cisa-ics": {
    label: "CISA ICS",
    url: "https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml",
  },
  "ncsc-news": {
    label: "NCSC news",
    url: "https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml",
  },
} as const satisfies Record<ThreatSource, { label: string; url: string }>;

export const WATCH_WINDOW_DAYS = 14;
export const threatKey = (threat: ThreatItem): string => `${threat.source}:${threat.id}`;
