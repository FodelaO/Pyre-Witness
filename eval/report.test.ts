/** Verifies Markdown and proof rendering from one synthetic case held in memory. */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProofReport } from "@/proof/ProofReport";
import { compareRuns } from "./comparison";
import { markdownReport } from "./markdown";
import { buildReport } from "./report";
import { readRunSnapshot } from "./runSnapshot";
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

it("keeps the first attempted outcomes across resume and scores only completed pairs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pyre-run-ledger-"));
  const item = (id: string): EvaluatedItem["item"] => ({
    id, group: "edge", input: { kind: "text", description: "Fixture" },
    expected: { isDevice: false, areas: [], levels: [], neverAreas: [], riskTags: [] },
    sourceUrl: "", license: "Fixture", notes: "",
  });
  const failed = { status: "error", latencyMs: 30, prediction: null, ruleCheck: null, raw: null,
    error: { stage: "reasoning", timeout: true, message: "Timed out" } };
  const rejected = { status: "rejected", latencyMs: 5, prediction: { accepted: false, profile: null, recommendation: null,
    neverAreas: [], riskTags: [], techniques: [], filteredUnknownTechniques: [] }, ruleCheck: null, raw: null };
  const items = [item("paired"), item("pending")];
  try {
    for (const attempt of ["first", "second"]) {
      await mkdir(path.join(root, attempt));
      await writeFile(path.join(root, attempt, "manifest.json"), JSON.stringify({
        version: 1, label: "run-1", itemIds: items.map(({ id }) => id), fingerprint: "fixture",
        sides: SIDES, startedAt: "2026-11-21T00:00:00Z",
      }));
    }
    const save = (attempt: string, file: string, artifact: unknown) => writeFile(
      path.join(root, attempt, `${file}.json`), JSON.stringify({ fingerprint: "capture", artifact }),
    );
    await Promise.all([
      save("first", "paired.system", failed), save("second", "paired.system", rejected),
      save("second", "paired.baseline", rejected), save("second", "pending.baseline", rejected),
    ]);
    const result = await readRunSnapshot("run-1", items, root);
    expect(result?.attempts).toEqual({ baseline: 2, system: 1 });
    expect(result?.completed).toHaveLength(1);
    expect(result?.completed[0].observations.system?.status).toBe("error");

    const later: EvaluatedItem = { item: items[0],
      observations: { baseline: result!.completed[0].observations.baseline, system: { ...result!.completed[0].observations.baseline! } } };
    const comparison = compareRuns(result, { completed: [later], manifest: { sides: SIDES, baselineContract: "fixture-v2" } });
    expect(comparison).toMatchObject({ state: "ready", n: 1, baselineContractChanged: true,
      systemChanges: expect.arrayContaining([{ key: "gateAccuracy", change: { value: 1, n: 1, interval: [1, 1] } }]) });
    const report = buildReport([later], { runId: "fixture-run-2", startedAt: "2026-11-21T00:00:00Z", sides: SIDES,
      dataset: { selected: 2, available: 2, warnings: [] }, reused: 0, comparison });
    const html = renderToStaticMarkup(createElement(ProofReport, { report }));
    expect(html).toContain("Run 1 vs run 2");
    expect(html).toContain("Run 2 Pyre Witness");
    expect(html).toContain("1 shared paired captures");
    const changedPolicy = compareRuns(result, { completed: [later], manifest: {
      sides: SIDES, baselineContract: "original-output-v1", objectAssessment: true,
    } });
    expect(changedPolicy).toMatchObject({ state: "ready", policyChanged: true, baselineContractChanged: false,
      systemChanges: expect.arrayContaining([{ key: "gateAccuracy", change: { value: null, n: 0, interval: null } }]) });
    const objectReport = { ...report, objectAssessment: true, comparison: changedPolicy };
    const objectHtml = renderToStaticMarkup(createElement(ProofReport, { report: objectReport }));
    expect(objectHtml).toContain("Non-device physical-safety coverage");
    expect(objectHtml).toContain("Run 1 before");
    expect(compareRuns(result, { completed: [{ ...later, item: item("unshared") }], manifest: { sides: SIDES } })).toEqual({ state: "no-overlap" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
