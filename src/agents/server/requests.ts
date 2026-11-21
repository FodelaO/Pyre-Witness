/** Validates the three chat modes and the bounded client snapshot. */
import { z } from "zod";
import type { AgentContext } from "@/agents/context";

export const MAX_CHAT_BODY_BYTES = 160 * 1024;
const MAX_CONTEXT_BYTES = 24 * 1024;
const encoder = new TextEncoder();

const agent = z.enum(["scout", "architect", "inspector", "chief"]);
const sender = z.union([z.literal("user"), agent]);
const recipient = z.union([sender, z.literal("group")]);
const historyMessage = z.strictObject({ from: sender, to: recipient, text: z.string() });
const contextSchema: z.ZodType<AgentContext> = z.strictObject({
  plant: z.string(),
  risk: z.strictObject({ score: z.number().min(0).max(100), band: z.string() }),
  lossPerYear: z.number().nonnegative().optional(),
  selected: z.strictObject({ id: z.string(), name: z.string(), kind: z.string(), area: z.string() }).optional(),
  findings: z.array(z.strictObject({
    ruleId: z.string(), assetId: z.string(), title: z.string(), severity: z.number().int().min(1).max(5),
  })).max(12),
  lastCapture: z.strictObject({ device: z.string(), verdict: z.string(), area: z.string(), risks: z.array(z.string()) }).optional(),
  news: z.array(z.strictObject({ title: z.string(), asset: z.string().optional(), severity: z.union([z.number(), z.string()]) })).max(5),
  crew: z.array(z.strictObject({ agent, status: z.string() })).max(4),
}).refine((context) => encoder.encode(JSON.stringify(context)).byteLength <= MAX_CONTEXT_BYTES, {
  message: "Twin context exceeds 24 KB.",
});

const common = {
  message: z.string().max(1000).trim().min(1),
  history: z.array(historyMessage).max(20),
  context: contextSchema,
};

export const agentChatRequestSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("direct"), to: agent, ...common }),
  z.strictObject({ mode: z.literal("group"), ...common }),
  z.strictObject({ mode: z.literal("chief"), ...common }),
]);

export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>;
export type ChatLine = z.infer<typeof historyMessage>;
