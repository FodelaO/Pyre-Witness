/** Recovers independently valid findings, proposals and feed results from a sandbox artifact. */
import { z } from "zod";
import {
  MAX_WATCH_ITEMS, MAX_WATCH_PROPOSALS, watchFindingSchema, watchHeadlineSchema, watchProposalSchema, type Reassessment,
} from "./reassessmentSchema";
import { WATCH_SOURCES } from "./sources";
import type { ThreatSource } from "./types";

const sources = Object.keys(WATCH_SOURCES) as ThreatSource[];
const feedSchema = z.object({
  source: z.enum(sources),
  status: z.enum(["fetched", "failed"]).nullish().catch(undefined),
  count: z.number().int().nonnegative().nullish().catch(undefined),
});
const findingSchema = watchFindingSchema.extend({
  techniqueId: watchFindingSchema.shape.techniqueId.nullish().catch(undefined),
  why: watchFindingSchema.shape.why.nullish().catch(undefined),
  riskDelta: watchFindingSchema.shape.riskDelta.nullish().catch(undefined),
});
const proposalSchema = watchProposalSchema.extend({
  kind: watchProposalSchema.shape.kind.nullish().catch(undefined),
  description: watchProposalSchema.shape.description.nullish().catch(undefined),
});

export const MAX_MANAGED_ARTIFACT_BYTES = 128_000;
export const managedArtifactSchema = z.object({
  headline: watchHeadlineSchema.optional(),
  items: z.array(findingSchema).max(MAX_WATCH_ITEMS).optional(),
  recommendations: z.array(proposalSchema).max(MAX_WATCH_PROPOSALS).optional(),
  feedResults: z.array(feedSchema).optional(),
});

function parseReportObject(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)
      && Object.keys(managedArtifactSchema.shape).some((key) => Object.hasOwn(value, key))) {
      return value as Record<string, unknown>;
    }
  } catch { /* Continue looking for the report object. */ }
}

function extractReport(text: string): Record<string, unknown> {
  if (text.length > MAX_MANAGED_ARTIFACT_BYTES) throw new Error("Managed report exceeds the size limit");
  const direct = parseReportObject(text);
  if (direct) return direct;
  for (const match of text.matchAll(/```(?:json)?[ \t]*\r?\n([\s\S]*?)```/gi)) {
    const fenced = parseReportObject(match[1]);
    if (fenced) return fenced;
  }

  let start = 0;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (depth === 0) {
      if (char === "{") { start = index; depth = 1; }
    } else if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const embedded = parseReportObject(text.slice(start, index + 1));
        if (embedded) return embedded;
      }
    }
  }
  throw new Error("Managed report has no recognizable JSON object");
}

function recoverRows<T>(raw: unknown, schema: z.ZodType<T>, limit = Infinity) {
  const rows: T[] = [];
  if (!Array.isArray(raw)) return { rows, omitted: 0, unavailable: true };
  for (const value of raw) {
    if (rows.length >= limit) break;
    const parsed = schema.safeParse(value);
    if (parsed.success) rows.push(parsed.data);
  }
  return { rows, omitted: raw.length - rows.length, unavailable: false };
}

export function parseManagedArtifact(text: string) {
  const raw = extractReport(text);
  const headline = watchHeadlineSchema.safeParse(raw.headline);
  const findings = recoverRows(raw.items, findingSchema, MAX_WATCH_ITEMS);
  const proposals = recoverRows(raw.recommendations, proposalSchema, MAX_WATCH_PROPOSALS);
  const feeds = recoverRows(raw.feedResults, feedSchema);
  const feedResults = [...new Map(feeds.rows.map((row) => [row.source, row])).values()];
  const missing = sources.filter((source) => !feedResults.some((result) =>
    result.source === source && result.status === "fetched" && result.count != null));
  const omitted = findings.omitted + proposals.omitted + feeds.omitted + feeds.rows.length - feedResults.length;
  const missingSections = [
    !headline.success && "headline", findings.unavailable && "findings", proposals.unavailable && "recommendations",
  ].filter(Boolean);
  const warnings: string[] = [];
  if (missing.length) warnings.push(`Incomplete sandbox feed coverage · ${missing.map((source) => WATCH_SOURCES[source].label).join(", ")}.`);
  if (missingSections.length) warnings.push(`Unavailable sections · ${missingSections.join(", ")}.`);
  if (omitted) warnings.push(`Omitted ${omitted} invalid, duplicate or excess rows from the managed report.`);
  const withoutReason = findings.rows.filter(({ why }) => !why).length;
  if (withoutReason) warnings.push(`${withoutReason} managed findings arrived without a reason.`);

  const draft: Reassessment = {
    headline: headline.success ? headline.data : "Managed advisory review",
    items: findings.rows.map(({ techniqueId, why, riskDelta, ...item }) => ({
      ...item, techniqueId: techniqueId ?? null, why: why ?? "Reason unavailable in the managed report.", riskDelta: riskDelta ?? null,
    })),
    recommendations: proposals.rows.map(({ kind, description, ...proposal }) => ({
      ...proposal,
      kind: kind ?? (proposal.effects.some(({ type }) => type === "add_protection" || type === "move_asset") ? "physical"
        : proposal.effects.every(({ type }) => type === "note") ? "procedural" : "software"),
      description: description ?? "",
    })),
  };
  return { draft, feedResults, warnings, partial: warnings.length > 0 };
}
