/** Shared wire format for the local phone sender and desktop receiver. */
import type { CaptureImage } from "@/pipeline/types";

export const HANDOFF_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const HANDOFF_KEY_HEADER = "X-Pyre-Handoff-Key";
export const HANDOFF_TTL_MS = 10 * 60_000;
export const HANDOFF_NOTE_MAX = 500;

export const isHandoffCode = (value: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(value);

export interface HandoffInfo {
  addresses: string[];
  port: number;
}

export interface HandoffPayload {
  images: CaptureImage[];
  note?: string;
}

export interface HandoffPacket extends HandoffPayload {
  id: string;
}

export type HandoffFrame =
  | { type: "ready"; expiresAt: number }
  | { type: "photos"; packet: HandoffPacket }
  | { type: "expired" }
  | { type: "replaced" };
