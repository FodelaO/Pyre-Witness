/** Contracts for the ingestion stream, evidence and human-reviewed changes. */
import type { AreaId, Asset, Connection, EquipmentKind } from "@/twin/types";
import type { OBJECT_CLASSES } from "@/pipeline/types";

export const MODEL_SOURCE_KINDS = ["video", "photos", "document", "inventory"] as const;
export type ModelSourceKind = (typeof MODEL_SOURCE_KINDS)[number];
export type ObjectClass = (typeof OBJECT_CLASSES)[number];

export interface ModelSource {
  kind: ModelSourceKind;
  files: string[];
  bytes: number;
  durationSeconds?: number;
  videoProcessing?: "static" | "agentic";
}

export interface CitedEvidence {
  locator: string;
  detail: string;
}

export interface ObservedItem {
  id: string;
  label: string;
  kind: EquipmentKind;
  object_class: ObjectClass;
  tag: string | null;
  area_guess: AreaId | null;
  connects_to: Connection[];
  evidence: CitedEvidence[];
  confidence: number;
}

export type ModelOutcome =
  | { action: "match_existing" | "update_existing" | "new_asset"; assetId: string }
  | { action: "unplaced" };

export type ModelItem = ObservedItem & { outcome: ModelOutcome };

export interface ModelUpdate {
  assetId: string;
  beforeName: string;
  beforeKind: EquipmentKind;
  name?: string;
  connections: Connection[];
}

export interface ModelDrop {
  itemId: string | null;
  reason: string;
}

export interface ModelTimings {
  uploadMs: number;
  gateMs: number;
  extractionMs: number;
  reconciliationMs: number;
  validationMs: number;
  totalMs: number;
}

export interface ModelProposal {
  source: ModelSource;
  items: ModelItem[];
  additions: Asset[];
  updates: ModelUpdate[];
  dropped: ModelDrop[];
  timings: ModelTimings;
  models: { gate: string; extraction: string; reconciliation: string };
}

export type ModelEvent =
  | { type: "source.received"; source: ModelSource }
  | { type: "source.ready"; uploadMs: number }
  | { type: "gate.started" }
  | { type: "gate.done"; source: ModelSource; latencyMs: number; reason: string | null }
  | { type: "extraction.started" }
  | { type: "extraction.done"; items: ObservedItem[]; latencyMs: number }
  | { type: "reconciliation.started" }
  | { type: "complete"; proposal: ModelProposal }
  | { type: "error"; message: string };
