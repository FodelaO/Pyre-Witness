/** The ring POST carries the only contact field. Snapshots carry a destination version. */
import { z } from "zod";
import { normalizePhoneNumber } from "./phoneNumber";

export { CLIENT_KEY, DESK_KEY, PAIR_CODE, PAIRING_TTL, PHONE_KEY, RECONNECT_MS } from "./wire.mjs";

const alertId = z.string().regex(/^e-[a-z0-9]+-[0-9]+$/).max(40);
const dialDestination = z.strictObject({
  number: z.string().max(48).transform((number, ctx) => {
    const normalized = normalizePhoneNumber(number);
    if (normalized) return normalized;
    ctx.addIssue({ code: "custom", message: "Invalid call destination." });
    return z.NEVER;
  }),
  name: z.string().trim().max(36).optional(),
});
const publicAlert = z.strictObject({
  id: alertId,
  test: z.literal(true).optional(),
  kind: z.enum(["finding", "risk", "simulation"]),
  tag: z.string().max(64).nullable(),
  room: z.string().max(72).nullable(),
  title: z.string().min(1).max(120),
  loss: z.number().nonnegative().nullable(),
  lossText: z.string().max(18).optional(),
  action: z.string().min(1).max(100),
  script: z.string().min(1).max(480),
  canApprove: z.boolean(),
});

export type PublicAlert = z.infer<typeof publicAlert>;
export type DialDestination = z.infer<typeof dialDestination>;
export interface DialTarget {
  href: string;
  label: string;
}

export const commandSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("pair") }),
  z.strictObject({ type: z.literal("ring"), alert: publicAlert, destination: dialDestination.optional() }),
  z.strictObject({ type: z.literal("dial-target"), id: alertId, version: z.number().int().positive() }),
  z.strictObject({ type: z.literal("resolve"), id: alertId }),
  z.strictObject({ type: z.literal("answer"), id: alertId }),
  z.strictObject({ type: z.literal("acknowledge"), id: alertId }),
  z.strictObject({ type: z.literal("approve"), id: alertId }),
  z.strictObject({ type: z.literal("approval-applied"), id: alertId }),
  z.strictObject({ type: z.literal("approval-unavailable"), id: alertId }),
  z.strictObject({ type: z.literal("dial"), id: alertId }),
  z.strictObject({ type: z.literal("audio-generated"), id: alertId }),
]);

export type CallCommand = z.infer<typeof commandSchema>;

export interface PhoneCall {
  alert: PublicAlert;
  ringingAt: number;
  answeredAt?: number;
  acknowledgedAt?: number;
  approvalRequestedAt?: number;
  approvedAt?: number;
  approvalUnavailableAt?: number;
  resolvedAt?: number;
  dialedAt?: number;
  destinationVersion?: number;
  audioGeneratedAt?: number;
}

export interface PairingSnapshot {
  expiresAt: number;
  phoneConnected: boolean;
  call: PhoneCall | null;
}
