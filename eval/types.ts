/** Evaluation labels and the common result shape scored for both systems. */
import type { Assessment, DeviceCategory, DeviceProfile, GateResult, ObjectClass } from "@/pipeline/types";
import type { AreaId, EquipmentKind, PurdueLevel, Radio } from "@/twin/types";

export const RISK_TAGS = [
  "wireless", "default_creds", "removable_media", "cloud", "remote_access",
  "transient", "hazardous_area", "washdown", "physical_port", "camera_view",
] as const;
export type RiskTag = (typeof RISK_TAGS)[number];

export const DIFFICULTIES = ["clean", "messy", "edge"] as const;
export const GROUPS = [...DIFFICULTIES, "links"] as const;
export type Group = (typeof GROUPS)[number];
export const SIDES = ["baseline", "system"] as const;
export type Side = (typeof SIDES)[number];

export interface Expected {
  isDevice: boolean;
  category?: DeviceCategory;
  deviceType?: string;
  physicalKind?: EquipmentKind;
  radios?: Radio[];
  ports?: string[];
  cloud?: boolean;
  defaultCredentials?: boolean;
  areas: AreaId[];
  levels: PurdueLevel[];
  neverAreas: AreaId[];
  riskTags: RiskTag[];
  capacity?: string;
}

export interface EvaluationItem {
  id: string;
  group: Group;
  input: { kind: "photo"; file: string } | { kind: "text"; description: string } | { kind: "link"; url: string };
  expected: Expected;
  sourceUrl: string;
  license: string;
  credit?: { author: string; termsUrl?: string };
  notes: string;
}

export type Recommendation = Pick<Assessment, "placement" | "physical_placement">;

export interface Prediction {
  accepted: boolean | null;
  profile: DeviceProfile | null;
  recommendation: Recommendation | null;
  neverAreas: AreaId[];
  riskTags: RiskTag[];
  techniques: string[];
  filteredUnknownTechniques: string[];
}

export interface RunError {
  stage: string;
  message: string;
  timeout: boolean;
}

export interface ProviderCalls {
  attempts: number;
  rateLimited: number;
}

export interface Observation {
  status: "ok" | "rejected" | "error";
  latencyMs: number | null;
  prediction: Prediction | null;
  ruleCheck: { passed: boolean; detail: string[] } | null;
  error?: RunError;
  providerCalls?: ProviderCalls;
  asDroppedPassed?: boolean | null;
  gateFallback?: boolean;
  gateEvidence?: GateResult["answers"];
  objectAssessment?: {
    isDevice: boolean | null;
    objectClass: ObjectClass | null;
    classSource: "perception" | "gate class" | "gate probability" | "baseline" | null;
    cyberClaims: string[];
    suppressedCyberClaims: boolean;
    safetyDrop: { area: AreaId; conditions: string[]; concerns: string[] } | null;
  };
}

export interface RunArtifact extends Observation {
  raw: unknown;
}

export interface Judgment {
  probability: number;
  confidence: number;
}

export interface JudgeArtifact {
  answers: Partial<Record<Side, Judgment>>;
  latencyMs: number | null;
  error?: RunError;
  providerCalls?: ProviderCalls;
  raw: unknown;
}

export interface EvaluatedItem {
  item: EvaluationItem;
  observations: Partial<Record<Side, Observation>>;
  captureFingerprints?: Partial<Record<Side, string>>;
  judge?: JudgeArtifact;
  ablation?: RunArtifact;
}
