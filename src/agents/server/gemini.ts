/** Sends bounded, tool-free chat requests through the existing Gemini transport. */
import { z } from "zod";
import { geminiClients, noSdkRetries, structuredInteraction, transcriptAttempt } from "@/gemini/transport";
import type { PipelineStage } from "@/pipeline/types";
import { CHAT_MODELS, CHIEF_PLAN, systemInstruction, type ModelAgent } from "./personas";

const stages: Record<ModelAgent, PipelineStage> = { scout: "perception", architect: "reasoning", chief: "summary" };
const delegationPlan = z.object({
  delegations: z.array(z.object({
    to: z.enum(["scout", "architect", "inspector"]),
    text: z.string().trim().min(1).max(300),
  })).max(3),
});

function interactionRequest(agent: ModelAgent, input: string, assignment: string) {
  return {
    model: CHAT_MODELS[agent],
    input,
    system_instruction: systemInstruction(agent, assignment),
    generation_config: { thinking_level: "low" as const },
    store: false,
  };
}

export async function geminiReply(agent: ModelAgent, input: string, assignment: string, signal: AbortSignal): Promise<string> {
  const request = interactionRequest(agent, input, assignment);
  const text = await transcriptAttempt({ stage: stages[agent], crew: agent, engine: request.model, thinkingLevel: "low", note: "Agent chat reply" },
    async () => {
      const response = await geminiClients().interactions.create({ ...request, stream: false, automatic_continuation: false },
        { signal, retries: noSdkRetries });
      if (response.status !== "completed") throw new Error("Gemini did not complete the reply.");
      const output = response.steps?.findLast((step) => step.type === "model_output");
      const text = response.output_text?.trim() || output?.content?.map((part) => part.type === "text" ? part.text : "").join("").trim();
      if (!text) throw new Error("Gemini returned an empty reply.");
      return text;
    }, (reply) => ({ text: reply }), undefined, signal);
  const wordLimit = [...text.matchAll(/\S+/g)][60]?.index;
  return text.slice(0, wordLimit).trimEnd();
}

export async function geminiDelegations(input: string, signal: AbortSignal) {
  const { value } = await structuredInteraction(
    geminiClients().interactions, delegationPlan, interactionRequest("chief", input, CHIEF_PLAN), signal, undefined,
    { attempts: 1, transcript: { stage: "summary", crew: "chief", schema: "AgentDelegations" } },
  );
  return value.delegations;
}
