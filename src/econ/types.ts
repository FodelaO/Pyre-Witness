/** Public contracts for a single defensive economic-loss scenario. */
import type { Asset, AttackPath, Mitigation } from "@/twin/types";
import type { AssetLossAllocation } from "./allocations";
import type { Assumption, Consequence, ThreePoint } from "./economics";

export interface LossTrigger {
  kind: "rule" | "path" | "watch" | "compliance" | "simulation";
  id: string;
  label: string;
  knownExploited?: boolean;
  cvss?: number;
  evidence?: "credential" | "unmanaged" | "compliance" | "other";
  /** Access mechanisms the detection itself is about, in order of preference (e.g. a USB finding). */
  exposure?: readonly ("rf" | "removable" | "visitor")[];
}

export interface LossScenario {
  id: string;
  assetId: string;
  consequence: Consequence;
  trigger: LossTrigger;
  path?: AttackPath;
  mitigation?: Mitigation;
  simulation?: {
    stopped?: boolean;
    /** Measured fractional reduction while production continues. */
    throughputLoss?: number;
    productLitres?: number;
    noDamage?: boolean;
    stoppedAssetIds?: readonly string[];
    damagedAssetIds?: readonly string[];
    productAssetIds?: readonly string[];
  };
}

export type LossAssumption = Assumption<number | ThreePoint | string> & { label: string };

export interface LossComponent {
  key: "downtime" | "replacement" | "product" | "recovery" | "regulatory";
  label: string;
  low: number;
  mode: number;
  high: number;
  mean: number;
  formula: string;
}

export interface LossOtherLine {
  key: "recovery" | "regulatory";
  label: string;
  amount: number;
  displayAmount: number;
  formula: string;
}

export interface LossRoute {
  entryLabel: string;
  basis: "rules" | "modeled" | "internal";
  assets: LossEstimate["asset"][];
}

export interface LossEstimate {
  scenarioId: string;
  consequence: Consequence;
  asset: Pick<Asset, "id" | "name"> & { tag: string; kind: Asset["physical"]["kind"] };
  /** Mean cost of one loss event (primary + secondary), from the simulated distribution. */
  lossIfManifests: number;
  /** FAIR primary loss: downtime, repair, product and response borne directly by the plant. */
  primaryLoss: number;
  /** FAIR secondary loss: regulators and third parties reacting to the event. */
  secondaryLoss: number;
  p10: number;
  p50: number;
  p90: number;
  frequency: { tef: number; vulnerability: number; lef: number; drivers: string[]; path: LossRoute };
  annualised: number;
  assetValue: { replacement: number; throughputPerHour: number; dependency: number };
  components: LossComponent[];
  items: AssetLossAllocation[];
  otherLines: LossOtherLine[];
  assumptions: LossAssumption[];
  trigger: LossTrigger;
}
