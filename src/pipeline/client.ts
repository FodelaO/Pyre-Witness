/**
 * Browser-side pipeline client. STUB — implemented by the pipeline-server task; keep these
 * signatures. Every server event must go through useRunStore.getState().ingest(event).
 */
import type { CaptureInput, DropPoint } from "./types";

/** Run the full pipeline for a capture (gate -> perception -> reasoning -> self-check -> summary). */
export async function analyze(input: CaptureInput, dropPoint?: DropPoint | null): Promise<void> {
  void input;
  void dropPoint;
  throw new Error("Pipeline client is not implemented yet");
}

/** Re-run reasoning + rules for an added device after it was moved (floor or Purdue map drag). */
export async function reassessAsset(assetId: string): Promise<void> {
  void assetId;
}

/** Move an added device to the placement the Architect recommended. */
export function moveToRecommended(assetId: string): void {
  void assetId;
}

/** Abort the in-flight run, if any. */
export function cancelRun(): void {}
