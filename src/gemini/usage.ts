/** Collects provider-reported token counts within one server-side benchmark run. */
import { AsyncLocalStorage } from "node:async_hooks";
import type { Interactions } from "@google/genai";

export interface GeminiUsage {
  inputTokens?: number;
  outputTokens?: number;
  thoughtTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
}

type UsageObserver = (model: string, usage: GeminiUsage) => void;
const usageScope = new AsyncLocalStorage<UsageObserver>();

export function withGeminiUsage<T>(observer: UsageObserver, work: () => T): T {
  return usageScope.run(observer, work);
}

export function reportGeminiUsage(model: string, usage: Interactions.Usage | undefined): void {
  const observe = usageScope.getStore();
  if (!observe || !usage) return;
  const counts = geminiUsage(usage);
  if (counts) observe(model, counts);
}

export function geminiUsage(usage: Interactions.Usage | undefined): GeminiUsage | undefined {
  if (!usage) return;
  const counts: GeminiUsage = {
    inputTokens: usage.total_input_tokens,
    outputTokens: usage.total_output_tokens,
    thoughtTokens: usage.total_thought_tokens,
    totalTokens: usage.total_tokens,
    cachedTokens: usage.total_cached_tokens,
  };
  if (Object.values(counts).some((value) => value !== undefined)) return counts;
}
