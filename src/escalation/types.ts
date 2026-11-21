/** Shared escalation evidence and the desktop's local call record. */
import type { EquipmentKind } from "@/twin/types";

export interface Thresholds {
  loss: number;
  risk: number;
}

export interface EscalationCause {
  key: string;
  kind: "finding" | "risk" | "simulation";
  title: string;
  assetId: string | null;
  assetName: string | null;
  assetKind: EquipmentKind | null;
  room: string | null;
  loss: number | null;
  score: number;
  baseline: number;
  ruleId?: string;
}

export interface EscalationMoment {
  at: number;
  channel: "desktop" | "paired-phone";
  actor?: string;
}

export interface EscalationRecord {
  id: string;
  trigger: EscalationCause;
  thresholds: Thresholds;
  script: string;
  action: string;
  canApprove: boolean;
  raisedAt: number;
  ringing?: EscalationMoment;
  audioGenerated?: EscalationMoment;
  answered?: EscalationMoment;
  acknowledged?: EscalationMoment;
  approved?: EscalationMoment;
  dialed?: EscalationMoment;
  resolvedAt?: number;
  dismissedAt?: number;
}
