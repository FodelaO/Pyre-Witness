/** Verifies Markdown and proof rendering from one synthetic case held in memory. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProofReport } from "@/proof/ProofReport";
import { markdownReport } from "./markdown";
import { buildReport } from "./report";
import { SIDES, type EvaluatedItem, type Prediction } from "./types";

it("renders sample size, the paired result and both answers for a failure", () => {
  const answer: Prediction = { accepted: false, profile: null, recommendation: null, neverAreas: [], riskTags: [], techniques: [], filteredUnknownTechniques: [] };
  const row: EvaluatedItem = {
    item: {
      id: "fixture-mug", group: "edge", input: { kind: "photo", file: "fixture-mug.jpg" },
      sourceUrl: "", license: "Test fixture", notes: "", expected: { isDevice: false, areas: [], levels: [], neverAreas: [], riskTags: [] },
    },
    observations: {
      baseline: { status: "ok", latencyMs: 100, prediction: { ...answer, accepted: true }, ruleCheck: null },
      system: { status: "rejected", latencyMs: 120, prediction: answer, ruleCheck: null },
    },
  };
  const report = buildReport([row], { runId: "fixture", startedAt: "2026-11-21T00:00:00Z", sides: SIDES,
    dataset: { selected: 1, available: 1, warnings: [] }, reused: 0 });
  expect(markdownReport(report)).toContain("Baseline gate error — Accepted a negative capture.");
  expect(markdownReport(report)).toContain("+100.0 pp [+100.0 pp, +100.0 pp] (pairs=1)");
  const html = renderToStaticMarkup(createElement(ProofReport, { report }));
  expect(html).toContain("fixture-mug.jpg");
  expect(html).toContain("Where it still fails");
  expect(html).toContain("100.0%");
  expect(html).toContain("n=1");
  expect(html).toContain("gemini-4-hydrogen");
  expect(html).toContain("/proof/failure-image/fixture-mug");
});
