/** Checks that the board reads real-call metadata and ignores gate fallback events. */
import { expect, it } from "vitest";
import { MODEL_IDS } from "@/gemini/models";
import type { PipelineEvent } from "@/pipeline/types";
import { latestModelUses } from "./lastUse";

it("keeps provider token counts when a product call also has a completion event", () => {
  const model = MODEL_IDS.chief;
  const events: PipelineEvent[] = [
    { type: "transcript.entry", runId: "capture", at: 4, entry: {
      stage: "summary", crew: "chief", engine: model, usage: { totalTokens: 141 }, latencyMs: 3_000,
    } },
    { type: "summary.done", runId: "capture", at: 5, model, latencyMs: 3_002, text: "The pump is ready." },
  ];
  const laterEvents: PipelineEvent[] = [{ type: "gate.done", runId: "next", at: 8, model: MODEL_IDS.decisions,
    latencyMs: 773, gate: { answers: {}, proceed: true, reason: "Gate unavailable" } }];
  const uses = latestModelUses(laterEvents, [{ source: "capture", id: "capture", label: "Pump", status: "completed",
    startedAt: 1, events, transcript: [] }]);
  expect(uses.get(model)).toEqual({ at: 4, latencyMs: 3_000, totalTokens: 141 });
  expect(uses.has(MODEL_IDS.decisions)).toBe(false);
  expect(latestModelUses(events.slice(1), []).get(model)).toMatchObject({ at: 5, latencyMs: 3_002 });
});
