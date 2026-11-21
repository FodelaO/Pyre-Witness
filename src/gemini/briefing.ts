/** Asks Neon for one caution and pairs it with the actual final rules-engine verdict. */
import { z } from "zod";
import type { Assessment, DeviceProfile, SelfCheckResult } from "@/pipeline/types";
import { areaById } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import { MODEL_IDS, THINKING } from "./models";
import { InvalidGeminiResponse, providerDiagnostic, providerFailure, structuredInteraction, waitForRetry, type GeminiClients } from "./transport";
import { interruptible } from "@/pipeline/server/deadline";

const cautionTopic = z.string().trim().min(2).max(55).refine((value) =>
  /^[\p{L}\p{N}][\p{L}\p{N} /()+,-]*$/u.test(value)
  && !/\b(?:hold|avoid|move|block(?:ed|ing)?|clear(?:ed)?|pass(?:ed)?|fail(?:ed)?|reject(?:ed)?|allow(?:ed)?|permit(?:ted)?|approv\w*|authoriz\w*|safe|unsafe|never|must|should|stop|do not|keep out)\b/i.test(value));
const briefing = z.object({ caution: cautionTopic.nullable() });
const PASSIVE_SCOPE = "Not a networked device: assessed for physical and food-safety compliance.";
const CHIEF = "The supplied rules-engine result is the verdict. Return only one optional caution topic supported by the evidence, as a short noun phrase, or null. Never change the verdict or advise whether to proceed.";
const SMALL_CHIEF = "Return a short caution topic or null. The rules verdict and hold are final facts.";

export const BRIEFING_WAIT_MS = 15_000;
const FALLBACK_MS = 6_000;
export const BRIEFING_STATUS_SOURCE = "briefing status";

type BriefingOutcome = { kind: "ready" | "unavailable"; text: string };

/** Gives each primary attempt a deadline, then tries a smaller Neon request. */
export async function briefEngineerWithinDeadline(
  client: GeminiClients["interactions"],
  twin: Twin,
  assessment: Assessment,
  check: SelfCheckResult,
  signal: AbortSignal,
  profile?: DeviceProfile,
): Promise<BriefingOutcome> {
  const area = assessment.physical_placement.area;
  const room = areaById(twin, area)?.name ?? area;
  const risk = [...assessment.risks].sort((a, b) => b.severity - a.severity || b.likelihood - a.likelihood)[0];
  const passive = profile?.object_class === "passive_object";
  const hold = !check.passed || assessment.placement.why.startsWith("HOLD:");
  const place = passive ? room : `${room}, Purdue ${assessment.placement.level}`;
  const verdict = check.passed ? (hold ? "No blocking findings at this option. HOLD remains in effect." : "Placement cleared.")
    : "Placement blocked. HOLD.";
  const facts = { place, passed: check.passed, hold, blocking: check.findings.filter(({ severity }) => severity >= 4)
    .map(({ ruleId, detail }) => `${ruleId}: ${detail.slice(0, 120)}`) };
  const topRisk = risk && `${risk.title}: ${risk.mitigation}`.slice(0, 150);

  async function ask(budget: AbortSignal, small: boolean, note?: string) {
    const input = JSON.stringify(small
      ? { place, passed: facts.passed, hold, blocking: facts.blocking.map((finding) => finding.split(":", 1)[0]), risk: risk?.title }
      : { ...facts, risk: topRisk });
    const { value } = await interruptible(budget, () => structuredInteraction(client, briefing, {
      model: MODEL_IDS.chief,
      input,
      system_instruction: small ? SMALL_CHIEF : CHIEF,
      generation_config: { thinking_level: THINKING.chief, max_output_tokens: small ? 384 : 640 },
      store: false,
    }, budget, undefined, {
      attempts: 1, transcript: { stage: "summary", crew: "chief", schema: "ChiefBriefing", response: "text", note },
    }));
    const caution = value.caution ? `Caution: verify ${value.caution}.` : undefined;
    const engine = `Rules engine: ${verdict}`;
    const lines = passive
      ? [`${room}. ${engine}`, caution, PASSIVE_SCOPE]
      : [`${hold ? "Option under review" : "Placement"}: ${place}.`, engine, caution];
    return { kind: "ready", text: lines.filter(Boolean).join("\n") } as const;
  }

  const primary = AbortSignal.any([signal, AbortSignal.timeout(BRIEFING_WAIT_MS)]);
  try {
    try {
      return await ask(primary, false);
    } catch (error) {
      signal.throwIfAborted();
      const retry = AbortSignal.any([signal, AbortSignal.timeout(BRIEFING_WAIT_MS)]);
      if (!primary.aborted && !(error instanceof InvalidGeminiResponse)) await waitForRetry(error, retry);
      const reason = primary.aborted ? "attempt deadline" : providerDiagnostic(error).name;
      return await ask(retry, false, `Retry after ${reason}.`);
    }
  } catch (error) {
    signal.throwIfAborted();
    providerFailure(error);
    try {
      return await ask(AbortSignal.any([signal, AbortSignal.timeout(FALLBACK_MS)]), true, "Smaller Neon fallback request.");
    } catch (fallbackError) {
      signal.throwIfAborted();
      providerFailure(fallbackError);
      return { kind: "unavailable", text: "Chief briefing is unavailable. The checked placement is available." };
    }
  }
}
