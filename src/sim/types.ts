/** Local contracts for deterministic tabletop runs and simulated plant alerts. */
import type { AreaId, AssetStatus, Mitigation, MitigationEffect, Twin } from "@/twin/types";

export type ScenarioId = "cip" | "ammonia" | "ransomware" | "wireless" | "chiller";
export type SimScenarioId = ScenarioId | "carbonation";

export interface SimulationMitigation extends Mitigation {
  simulationScenario: SimScenarioId;
  simulationContainment: {
    before: number | null;
    after: number;
    safeguard: string;
  };
}

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
  control?: ScenarioControl;
}

export interface ScenarioControl {
  label: string;
  where?: string[];
  holds(twin: Twin): boolean;
  effectsOnHold?: SimEffects;
  /** Remove exactly the credited safeguard from a replay copy. */
  without?(twin: Twin): Twin;
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
  id: SimScenarioId;
  stages: SimStage[];
  contained: boolean;
  /** Simulated seconds from the beginning of the replay. */
  containedAt?: number;
  consequence: SimConsequence;
  counterfactual: SimCounterfactual;
}

export interface SimCounterfactual {
  removedControl: string | null;
  containedAt?: number;
  heldBy?: string;
  consequence: SimConsequence;
}

export interface ScenarioDefinition<Id extends SimScenarioId = ScenarioId> {
  id: Id;
  label: string;
  stages(twin: Twin, context?: ScenarioContext): StageDefinition[];
  consequence(twin: Twin, stages: SimStage[]): SimConsequence;
  mitigations(twin: Twin): Mitigation[];
}

export interface ScenarioContext {
  appliedEffects?: readonly MitigationEffect[];
}
