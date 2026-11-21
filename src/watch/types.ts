/** Serializable reports and progress shared by the watch runner and panel. */
import type { Mitigation, PurdueLevel, Radio, Technique } from "@/twin/types";

export type ThreatSource = "cisa-kev" | "cisa-ics" | "ncsc-news";

export interface ThreatItem {
  id: string;
  source: ThreatSource;
  title: string;
  vendor?: string;
  product?: string;
  cves: string[];
  published: string;
  url: string;
  summary: string;
}

export interface SourceResult {
  source: ThreatSource;
  count: number;
  ms: number;
  cached: boolean;
  error?: string;
}

export interface InventoryEntry {
  assetId: string;
  vendor: string;
  product: string;
  version?: string;
  vendorAliases?: readonly string[];
  productAliases?: readonly string[];
  identity: "assumed" | "capture";
  criticality: number;
  exposure: {
    level: PurdueLevel;
    zone: string;
    conduit: string | null;
    protocols: string[];
    internetFacing: boolean;
    remoteAccess: boolean;
    cloudConnected: boolean;
    radios: Radio[];
  };
}

export interface Candidate {
  threat: ThreatItem;
  inventory: InventoryEntry;
  score: number;
  reasons: string[];
  versionMentioned: boolean;
  disposition?: TriageDisposition;
  decisions?: { applicability: number; exposure: number; severity: number };
}

export type TriageDisposition = "supported" | "uncertain" | "excluded";

export interface WatchFinding {
  threat: ThreatItem;
  affectedAssetIds: string[];
  technique: Technique | null;
  why: string;
  /** Neon estimate for the advisory impact. The plant score comes from the rules engine. */
  riskDelta: number | null;
  triage: "supported" | "uncertain";
}

export interface WatchStage {
  name: "feeds" | "matches" | "triage" | "reassessment" | "rules" | "managed";
  state: "done" | "partial" | "failed" | "skipped";
  ms: number;
  detail: string;
  model?: string;
}

export interface ManagedWatchProgress {
  phase: "started" | "running" | "done" | "failed";
  environmentId?: string;
  ms: number;
  feeds?: Array<{ source: ThreatSource; status?: "fetched" | "failed" | null; count?: number | null }>;
}

export interface WatchReport {
  date: string;
  runId: string;
  mode: "local" | "managed";
  finishedAt: number;
  headline: string;
  baselineScore: number;
  candidates: Candidate[];
  unmatchedNews?: ThreatItem[];
  items: WatchFinding[];
  recommendations: Array<Mitigation & { riskDelta: number }>;
  sources: SourceResult[];
  stages: WatchStage[];
  warnings: string[];
  managed?: ManagedWatchProgress;
}

export const WATCH_FORCE_HEADER = "x-pyre-watch-force";
export const WATCH_REVIEW_CACHE_MS = 5 * 60_000;

export interface WatchRunResult {
  report: WatchReport;
  cached?: boolean;
  checkedAt?: number;
  note?: string;
}

export type WatchEventData =
  | { type: "started"; date: string }
  | { type: "working"; name: WatchStage["name"] }
  | { type: "source"; result: SourceResult }
  | { type: "matches"; candidates: Candidate[]; unmatchedNews?: ThreatItem[] }
  | { type: "managed-progress"; progress: ManagedWatchProgress }
  | { type: "stage"; stage: WatchStage }
  | ({ type: "snapshot" } & WatchRunResult)
  | ({ type: "done" } & WatchRunResult)
  | { type: "error"; message: string };

export type WatchEvent = { runId: string; at: number } & WatchEventData;
