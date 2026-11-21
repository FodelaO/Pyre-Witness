/** Verifies the same assessment selection for live and archived system receipts. */
import type { StreamEvent } from "@/pipeline/server/sse";
import type { Assessment } from "@/pipeline/types";
import { expect, test } from "vitest";
import { shownAssessment } from "./systemScoring";

const buildAssessment = (area: "corporate_office" | "control_room"): Assessment => ({
  physical_placement: { area, near_asset_id: null, position_hint: "Review placement", connections: [], physical_constraints: [] },
  placement: { level: 3, network_area: "Review zone", conduit: null, why: "Review placement" },
  never_place: [], risks: [], attack_paths: [], mitigations: [], compliance: [], confidence: 0.5,
});

test("uses the browser's final assessment and falls back to the last legacy assessment", () => {
  const base = { runId: "unit-test", at: 0, model: "test" };
  const initial = buildAssessment("corporate_office");
  const changed = buildAssessment("control_room");
  const displayed = { ...changed, confidence: 0.7 };
  const legacy: StreamEvent[] = [
    { ...base, type: "reasoning.done", latencyMs: 1, assessment: initial },
    { ...base, type: "revision.done", latencyMs: 1, assessment: changed },
    { ...base, type: "summary.started" },
  ];
  expect(shownAssessment(legacy)).toBe(changed);
  expect(shownAssessment([...legacy, { ...base, type: "summary.started", assessment: displayed }])).toBe(displayed);
});
