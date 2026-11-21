/** Runs Carbon with smaller retry prompts inside one shared deadline. */
import { assessDevice } from "@/gemini/assess";
import type { AssessmentContext } from "@/gemini/placementContext";
import { InvalidGeminiResponse, MODEL_ATTEMPTS, waitForRetry, type GeminiClients } from "@/gemini/transport";
import { interruptible } from "./deadline";

export const REASONING_DEADLINE_MS = 60_000;
const FIRST_ATTEMPT_MS = 38_000;

export async function assessWithReducedRetry(
  client: GeminiClients["interactions"], context: AssessmentContext, signal: AbortSignal, onThought: (text: string) => void,
) {
  const firstTimer = AbortSignal.timeout(FIRST_ATTEMPT_MS);
  const first = AbortSignal.any([signal, firstTimer]);
  let repairedSchema = false;
  for (let attempt = 0; ; attempt += 1) {
    const smaller = attempt > 0;
    const budget = smaller ? signal : first;
    try {
      return await interruptible(budget, () =>
        assessDevice(client, context, budget, smaller ? undefined : onThought, undefined, { attempts: 1, smaller }));
    } catch (error) {
      signal.throwIfAborted();
      if (attempt + 1 === MODEL_ATTEMPTS) throw error;
      if (error instanceof InvalidGeminiResponse) {
        if (repairedSchema) throw error;
        repairedSchema = true;
      } else if (smaller || !firstTimer.aborted) {
        await waitForRetry(error, signal, attempt);
      }
    }
  }
}
