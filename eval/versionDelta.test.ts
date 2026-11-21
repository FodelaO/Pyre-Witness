/** Protects the fixed common-answer cohort and timing denominators. */
import { expect, test } from "vitest";
import { METRIC_KEYS } from "./metrics";
import type { EvaluatedItem, RunArtifact } from "./types";
import { compareSystemVersions } from "./versionDelta";

function receipt(id: string, scoutMs: number | null): EvaluatedItem {
  const system: RunArtifact = {
    status: scoutMs === null ? "error" : "ok", latencyMs: 8_000, ruleCheck: null,
    prediction: scoutMs === null ? null : { accepted: true, profile: null, recommendation: null, neverAreas: [],
      riskTags: [], techniques: [], filteredUnknownTechniques: [] },
    raw: scoutMs === null ? [] : [{ type: "perception.done", latencyMs: scoutMs }],
  };
  return {
    item: { id, group: "clean", input: { kind: "text", description: "Fixture" },
      sourceUrl: "", notes: "", license: "", expected: { isDevice: true, areas: [], levels: [], neverAreas: [], riskTags: [] } },
    observations: { system, baseline: { status: "ok", latencyMs: 2_000, prediction: null, ruleCheck: null } },
    captureFingerprints: { system: id, baseline: id },
  };
}

test("keeps failures in all attempts and uses the same delivered timings on common answers", () => {
  const report = compareSystemVersions([receipt("a", 1_000), receipt("b", 3_000)], [receipt("a", 2_500), receipt("b", null)]);
  expect(report.n).toEqual({ all: 2, answered: 1 });
  expect(report.rows.slice(0, METRIC_KEYS.length).map(({ key }) => key)).toEqual(METRIC_KEYS);
  const accuracy = report.rows.find(({ key }) => key === "gateAccuracy")!;
  expect(accuracy.all).toMatchObject({ before: { value: 1, n: 2 }, after: { value: 0.5, n: 2 }, change: -0.5 });
  expect(accuracy.answered).toMatchObject({ before: { value: 1, n: 1 }, after: { value: 1, n: 1 }, change: 0 });
  const scout = report.rows.find(({ key }) => key === "scoutP50")!;
  expect(scout.all).toEqual({ before: { value: 2_000, n: 2 }, after: { value: 2_500, n: 1 }, change: 500 });
  expect(scout.answered).toEqual({ before: { value: 1_000, n: 1 }, after: { value: 2_500, n: 1 }, change: 1_500 });
});

test("requires identical capture fingerprints even when IDs match", () => {
  const before = receipt("a", 1_000);
  const after = { ...receipt("a", 1_000), captureFingerprints: { system: "different image" } };
  expect(() => compareSystemVersions([before], [after])).toThrow("Capture fingerprint differs between versions for a.");
});
