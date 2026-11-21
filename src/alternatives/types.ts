/** Candidate and cost types shared by the counterfactual evaluator and inspector. */
import type { ThreePoint } from "@/econ/economics";
import type { EquipmentKind, MitigationEffect } from "@/twin/types";

export interface Candidate {
  name: string;
  kind: EquipmentKind;
  rationale: string;
  source: "rules" | "carbon";
  cost: ThreePoint | null;
  effects: MitigationEffect[];
}
