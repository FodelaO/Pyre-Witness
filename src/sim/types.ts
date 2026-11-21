/** Local contracts for deterministic tabletop runs and simulated plant alerts. */
import type { AreaId, AssetStatus, Mitigation, Twin } from "@/twin/types";

export type ScenarioId = "cip" | "ammonia" | "ransomware" | "wireless" | "chiller";

export interface SimAlert {
  id: string;
  title: string;
  where: string[];
  severity: "attention" | "alarm";
  source: "simulated plant" | "simulation";
}

export interface SimAssetEffect {
  status?: AssetStatus;
  running?: boolean;
  telemetry?: Record<string, number>;
}

export interface SimEffects {
  assets?: Record<string, SimAssetEffect>;
  areas?: Partial<Record<AreaId, "attention" | "alarm">>;
  visual?: { kind: "caustic"; where: string[]; intensity: number }
    | { kind: "ammonia"; where: string[]; intensity: number; estimatedPpm: number };
}

interface StageEvent {
  t: number;
  title: string;
  where: string[];
  technique?: string;
  effects?: SimEffects;
}

export interface StageDefinition extends StageEvent {
  control?: { label: string; where?: string[]; holds(twin: Twin): boolean };
}

export interface SimStage extends StageEvent {
  outcome: "advanced" | "blocked";
  by?: string;
}

export interface SimConsequence {
  summary: string;
  metrics: Record<string, number | string | boolean>;
}

export interface SimRun {
  id: ScenarioId;
  stages: SimStage[];
  contained: boolean;
  /** Simulated seconds from the beginning of the replay. */
  containedAt?: number;
  consequence: SimConsequence;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  stages(twin: Twin): StageDefinition[];
  consequence(twin: Twin, stages: SimStage[]): SimConsequence;
  mitigations(twin: Twin): Mitigation[];
}
