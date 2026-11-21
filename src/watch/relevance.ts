/** Scores public feed items against the current bottling twin without model calls. */
import type { Twin } from "@/twin/types";
import { inventoryForTwin } from "./inventory";
import { liveItemKey, type LiveItem } from "./liveTypes";
import { matchThreats } from "./match";
import { recallImpact } from "./recallImpact";
import type { Candidate, ThreatItem } from "./types";

const FOOD_SECTOR = /\b(?:food[\s-]*(?:and|&|\/)[\s-]*beverages?|beverages?|bottling|bottled water|soft drinks?|juice|food safety|food processing)\b/i;
const INDUSTRIAL = /\b(?:ics|ot|scada|plcs?|industrial (?:control|automation|network|equipment)|operational technology)\b/i;
const DAY = 86_400_000;

export interface WatchRelevance {
  item: LiveItem;
  score: number;
  assetIds: string[];
  reasons: string[];
  knownExploited: boolean;
  cvss?: number;
  age: string;
  triage?: "supported" | "uncertain" | "excluded";
}

export function itemAge(published: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(published));
  if (!Number.isFinite(elapsed)) return "Date unavailable";
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / 3_600_000)} h ago`;
  return `${Math.floor(elapsed / DAY)} d ago`;
}

function cvssFrom(item: Exclude<LiveItem, { source: "openfda" }>): number | undefined {
  const scores = [item.cvss, item.cvssScore];
  const text = `${item.title} ${item.summary}`;
  const explicit = /\bCVSS(?:[-\s]+v(?:ersion)?\s*[234](?:\.\d+)?|\s+[234]\.\d+(?=\s+(?:base\s+)?score|\s*:))?(?:\s+(?:base\s+)?score)?\s*(?:[:=]\s*|(?:of|is)\s+)?(10(?:\.0+)?|[0-9](?:\.\d+)?)(?![\d.]\d)\b/gi;
  for (const match of text.matchAll(explicit)) {
    if (!/^CVSS\s+[234](?:\.\d+)?$/i.test(match[0])) scores.push(Number(match[1]));
  }
  const valid = scores.filter((score): score is number => typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 10);
  if (valid.length) return Math.max(...valid);
}

function comparableVersion(version: string): number[] | undefined {
  return /^v?\d+(?:\.\d+)+$/i.test(version) ? version.replace(/^v/i, "").split(".").map(Number) : undefined;
}

function inCitedRange(candidate: Candidate) {
  const { threat, inventory } = candidate;
  const installed = inventory.version && comparableVersion(inventory.version);
  if (!installed) return false;
  const product = candidate.reasons.find((reason) => reason.startsWith("Product family · "))?.slice("Product family · ".length);
  if (!product || !threat.title.toLowerCase().includes(product.toLowerCase())) return false;
  // Only credit a single, unambiguous boundary on a product named in the headline.
  const ranges = [...threat.summary.matchAll(/\b(?:all )?versions?\s+(before|prior to|below|through)\s+(v?\d+(?:\.\d+)+)\b/gi)];
  if (ranges.length !== 1) return false;
  const [, relation, boundary] = ranges[0];
  const limit = comparableVersion(boundary);
  if (!limit || installed.length !== limit.length) return false;
  const firstDifferent = installed.findIndex((part, index) => part !== limit[index]);
  return firstDifferent === -1 ? relation.toLowerCase() === "through" : installed[firstDifferent] < limit[firstDifferent];
}

function collectReviews(reviews: readonly Candidate[]) {
  const lookup = new Map<string, Candidate>();
  for (const candidate of reviews) {
    if (!candidate.decisions) continue;
    const { assetId, vendor, product, version } = candidate.inventory;
    lookup.set(JSON.stringify([liveItemKey(candidate.threat), assetId, vendor, product, version]), candidate);
  }
  return lookup;
}

export function rankWatchItems(
  items: readonly LiveItem[],
  twin: Twin,
  now: number,
  reviews: readonly Candidate[] = [],
): WatchRelevance[] {
  const advisories = items.filter((item): item is ThreatItem => item.source !== "openfda");
  const kevCves = new Set(advisories.filter(({ source }) => source === "cisa-kev").flatMap(({ cves }) => cves));
  const assetIds = new Set(twin.assets.map(({ id }) => id));
  const candidates = new Map<string, Candidate[]>();
  const reviewByIdentity = collectReviews(reviews);
  for (const match of matchThreats(advisories, inventoryForTwin(twin), Infinity)) {
    const key = liveItemKey(match.threat);
    const list = candidates.get(key) ?? [];
    list.push(match);
    candidates.set(key, list);
  }

  return items.map((item): WatchRelevance => {
    const key = liveItemKey(item);
    const matches = (candidates.get(key) ?? []).map((candidate) => {
      const { assetId, vendor, product, version } = candidate.inventory;
      const review = reviewByIdentity.get(JSON.stringify([key, assetId, vendor, product, version]));
      return { candidate, triage: review?.disposition };
    });
    const available = matches.filter(({ triage }) => triage !== "excluded");
    const primary = available[0];
    const reasons: string[] = [];
    const age = itemAge(item.published, now);
    const elapsed = Math.max(0, (now - Date.parse(item.published)) / DAY);
    let score = Number.isFinite(elapsed) ? Math.round(12 / (1 + elapsed / 10)) : 0;
    const text = `${item.title} ${item.summary}`;
    const food = item.source === "openfda" || FOOD_SECTOR.test(text);
    const ot = item.source === "cisa-ics" || INDUSTRIAL.test(text);
    const knownExploited = item.source === "cisa-kev" || (item.source !== "openfda" && item.knownExploited === true)
      || item.cves.some((cve) => kevCves.has(cve));
    const cvss = item.source === "openfda" ? undefined : cvssFrom(item);
    const recall = item.source === "openfda" ? recallImpact(item.summary) : undefined;
    const matchedIds = [...new Set(available.map(({ candidate }) => candidate.inventory.assetId)
      .concat(recall?.assetIds.filter((id) => assetIds.has(id)) ?? []))];

    if (primary) {
      const { candidate } = primary;
      score += 48 + candidate.score;
      reasons.push(`${candidate.inventory.assetId} · ${candidate.inventory.product}`);
      if (candidate.versionMentioned || inCitedRange(candidate)) {
        score += 5;
        reasons.push(candidate.versionMentioned ? "Version cited" : "Version within cited range");
      }
    }
    if (recall && matchedIds.length) {
      score += 54;
      reasons.push(recall.reason);
    }
    if (knownExploited) { score += 13; reasons.push("KEV"); }
    if (cvss !== undefined) { score += Math.round(cvss); reasons.push(`CVSS ${cvss.toFixed(1)}`); }
    if (food) { score += 11; reasons.push("Food & beverage"); }
    if (ot) { score += 4; reasons.push("OT / ICS"); }
    const triage = available.find((match) => match.triage)?.triage ?? (matches.length && !available.length ? "excluded" : undefined);
    return { item, score: Math.min(100, score), assetIds: matchedIds, reasons, knownExploited, cvss, age, triage };
  }).sort((a, b) => Number(!!b.assetIds.length) - Number(!!a.assetIds.length) || b.score - a.score
    || b.item.published.localeCompare(a.item.published) || liveItemKey(a.item).localeCompare(liveItemKey(b.item)));
}
