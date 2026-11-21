/**
 * Pipeline contracts: what goes in (capture), what each model returns, and the event stream
 * that drives the crew avatars and the activity feed. Shared contract — see AGENTS.md.
 *
 * Model-facing objects (DeviceProfile, Assessment) are snake_case: they are the JSON schemas
 * sent to Gemini structured output. Internal twin types (src/twin/types.ts) are camelCase.
 */
import type {
  AreaId,
  AttackPath,
  EquipmentKind,
  Medium,
  Mitigation,
  PurdueLevel,
  Radio,
  RuleFinding,
  Severity,
  Technique,
  Twin,
} from "@/twin/types";

// ───────────────────────────── Input ─────────────────────────────

export interface CaptureImage {
  mimeType: string;
  /** Base64 without the data: prefix. Downscaled client-side (long edge <= 1600 px). */
  dataBase64: string;
}

export type CaptureInput =
  /** 1-3 photos of a device (camera or upload). */
  | { kind: "photo"; images: CaptureImage[]; note?: string }
  /** Product page link; the server fetches title, spec text and main image. */
  | { kind: "link"; url: string; note?: string }
  /** Free-text description of a device or change. */
  | { kind: "text"; description: string };

/** What the server extracted from a product link before perception. */
export interface LinkSnapshot {
  url: string;
  title: string;
  specText: string;
  imageUrl: string | null;
  image: CaptureImage | null;
}

export interface DropPoint {
  x: number;
  y: number;
  area: AreaId;
}

// ───────────────────────────── Gate (Gemini Decisions API) ─────────────────────────────

export interface GateAnswer {
  type: "noul" | "choice" | "score";
  /** noul: P(yes) 0..1 · choice: winning key · score: weighted score. */
  value: number | string;
  confidence: number;
  probabilities?: Record<string, number>;
}

export interface GateResult {
  answers: Record<string, GateAnswer>;
  /** False = stop early (not a device / unreadable) and tell the user why. */
  proceed: boolean;
  reason: string | null;
}

// ───────────────────────────── Perception (Scout · gemini-4-hydrogen) ─────────────────────────────

export const DEVICE_CATEGORIES = [
  "sensor",
  "camera",
  "gateway",
  "network",
  "computer",
  "phone",
  "removable_storage",
  "controller",
  "hmi",
  "vessel",
  "rotating_equipment",
  "valve",
  "instrument",
  "machine",
  "other",
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export interface Evidence {
  /** e.g. "Sticker reads admin/admin". */
  claim: string;
  source: "label" | "shape" | "port" | "screen" | "text" | "spec_sheet";
  confidence: number;
}

export const OBJECT_CLASSES = ["networked_device", "electrical_equipment", "process_equipment", "passive_object"] as const;

export type ObjectClass = (typeof OBJECT_CLASSES)[number];

export interface DeviceProfile {
  device_type: string;
  category: DeviceCategory;
  /**
   * What kind of thing was captured. Judges may photograph anything: a passive object (a mug, a
   * glass bottle, a backpack, a pallet) carries no cyber risk, but it still has a right and a
   * wrong place in a food plant (foreign-material control, brittle materials near open product,
   * ignition sources in the NH3 area). Optional so older profiles stay valid.
   */
  object_class?: ObjectClass;
  vendor: string | null;
  model: string | null;
  radios: Radio[];
  ports: string[];
  storage: string | null;
  default_credentials_visible: boolean;
  default_credentials_note: string | null;
  cloud_connectivity: boolean | null;
  power: string | null;
  /** Which SVG component represents it on the floor. */
  physical_kind: EquipmentKind;
  capacity_or_size: string | null;
  material: string | null;
  food_grade: boolean | null;
  hazardous_area_rating: string | null;
  ip_rating: string | null;
  evidence: Evidence[];
  /** What could not be determined from the input. */
  unknowns: string[];
  confidence: number;
}

// ───────────────────────────── Reasoning (Architect · gemini-4-carbon) ─────────────────────────────

export interface PurduePlacement {
  level: PurdueLevel;
  network_area: string;
  conduit: string | null;
  why: string;
}

export interface PhysicalPlacement {
  area: AreaId;
  near_asset_id: string | null;
  position_hint: string;
  connections: { to: string; medium: Medium }[];
  physical_constraints: string[];
}

export interface NeverPlace {
  where: string;
  area: AreaId | null;
  level: PurdueLevel | null;
  why: string;
}

export interface RiskItem {
  id: string;
  title: string;
  kind: "cyber" | "physical" | "compliance";
  severity: Severity;
  likelihood: Severity;
  /** MITRE ATT&CK for ICS technique, must exist in src/data/attack-ics.ts. */
  technique: Technique | null;
  description: string;
  mitigation: string;
}

export interface ComplianceItem {
  /** e.g. "IEC 62443-3-3", "NIST SP 800-82r3", "FDA 21 CFR 117", "OSHA 29 CFR 1910.119". */
  framework: string;
  clause: string;
  status: "met" | "gap" | "unknown";
  note: string;
}

export interface Assessment {
  placement: PurduePlacement;
  physical_placement: PhysicalPlacement;
  never_place: NeverPlace[];
  risks: RiskItem[];
  attack_paths: AttackPath[];
  compliance: ComplianceItem[];
  mitigations: Mitigation[];
  confidence: number;
}

// ───────────────────────────── Self-check (Inspector · deterministic rules engine) ─────────────────────────────

export interface SelfCheckResult {
  /** True when the recommended placement produces no blocking rule finding. */
  passed: boolean;
  findings: RuleFinding[];
  paths: AttackPath[];
  /** Where the rules contradict the model. Fed back to the model for one revision. */
  disagreements: string[];
  revised: boolean;
}

// ───────────────────────────── Event stream ─────────────────────────────

export type PipelineStage = "link" | "gate" | "perception" | "reasoning" | "selfcheck" | "revision" | "summary";

interface Base {
  runId: string;
  /** Server epoch ms. */
  at: number;
}

/**
 * One event per REAL pipeline step. The crew avatars, the activity feed and the side panel are
 * all driven by these — never by timers.
 */
export type PipelineEvent =
  | (Base & {
      type: "run.started";
      input: { kind: CaptureInput["kind"]; label: string };
      dropPoint: DropPoint | null;
      /** "reassess" = a placed device was moved: perception is skipped and the profile is kept. Default "analyze". */
      mode?: "analyze" | "reassess";
    })
  | (Base & { type: "link.started"; url: string })
  | (Base & { type: "link.fetched"; latencyMs: number; snapshot: Pick<LinkSnapshot, "url" | "title" | "imageUrl"> })
  | (Base & { type: "gate.started"; model: string })
  | (Base & { type: "gate.done"; model: string; latencyMs: number; gate: GateResult })
  | (Base & { type: "perception.started"; model: string })
  | (Base & { type: "perception.done"; model: string; latencyMs: number; profile: DeviceProfile })
  | (Base & { type: "reasoning.started"; model: string; candidateArea: AreaId | null })
  | (Base & { type: "reasoning.thought"; text: string })
  | (Base & { type: "reasoning.done"; model: string; latencyMs: number; assessment: Assessment })
  | (Base & { type: "selfcheck.started"; engine: "rules engine" })
  | (Base & { type: "selfcheck.path"; path: AttackPath })
  | (Base & { type: "selfcheck.done"; latencyMs: number; result: SelfCheckResult })
  | (Base & { type: "revision.started"; model: string; reason: string })
  | (Base & { type: "revision.done"; model: string; latencyMs: number; assessment: Assessment })
  | (Base & { type: "summary.started"; model: string })
  | (Base & { type: "summary.done"; model: string; latencyMs: number; text: string })
  | (Base & { type: "run.completed"; totalMs: number })
  | (Base & { type: "run.error"; stage: PipelineStage | "unknown"; message: string });

export type PipelineEventType = PipelineEvent["type"];

// ───────────────────────────── API requests ─────────────────────────────

/** POST /api/analyze -> text/event-stream of PipelineEvent (`data: <json>\n\n`). */
export interface AnalyzeRequest {
  input: CaptureInput;
  twin: Twin;
  dropPoint?: DropPoint | null;
}

/** POST /api/reassess -> same stream, skipping perception (device dragged to a new spot). */
export interface ReassessRequest {
  profile: DeviceProfile;
  twin: Twin;
  assetId: string;
  placement: { area: AreaId; x: number; y: number; level?: PurdueLevel };
}
