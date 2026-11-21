/** Pins the compact titles and evidence required for each ticker tone. */
import { describe, expect, it } from "vitest";
import { displayedEventLoss } from "@/econ/displayLedger";
import { estimateLoss } from "@/econ/model";
import { scenarioFromFinding, scenarioFromSimulation } from "@/econ/scenarios";
import { DEFAULT_THRESHOLDS } from "@/escalation/policy";
import type { EscalationRecord } from "@/escalation/types";
import { MODEL_IDS } from "@/gemini/models";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import { pressureProfile } from "@/pipeline/server/__fixtures__/placement";
import type { Assessment, PipelineEvent, SelfCheckResult } from "@/pipeline/types";
import type { SimRun } from "@/sim/types";
import { SEED_TWIN } from "@/twin/seed";
import type { Mitigation, RuleFinding } from "@/twin/types";
import { inventoryForTwin } from "@/watch/inventory";
import type { LiveCheck, LiveItem } from "@/watch/liveTypes";
import { rankWatchItems } from "@/watch/relevance";
import { estimateWatchLoss } from "@/watch/watchLoss";
import type { ThreatItem, WatchReport } from "@/watch/types";
import {
  approvedMitigation, distinctTickerItems, escalationTickerItems, mitigationTickerItem,
  pipelineTickerItems, rankTickerItems, simulationTickerItem, triageTone, type TickerItem,
} from "./items";
import { watchTickerItems } from "./watchItems";

const now = Date.parse("2026-11-21T18:00:00Z");
const day = 86_400_000;
const assets = new Set(SEED_TWIN.assets.map(({ id }) => id));
const assessment: Assessment = {
  placement: { level: 4, network_area: "Office", conduit: null, why: "Inspection bench" },
  physical_placement: { area: "corporate_office", near_asset_id: null, position_hint: "Bench", connections: [], physical_constraints: [] },
  never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 1,
};
const passed: SelfCheckResult = { passed: true, findings: [], paths: [], disagreements: [], revised: false };
const finding: RuleFinding = {
  ruleId: "TEST-1", title: "Fixture finding", severity: 2, assetId: "CAM-TEST",
  kind: "physical", detail: "Fixture detail", references: [],
};
const blocked = { ...passed, passed: false, findings: [finding] };
const passedWithFindings: SelfCheckResult = { ...passed, findings: [finding] };
const profile = { ...pressureProfile, category: "camera" as const, device_type: "Camera fixture" };
const started: PipelineEvent = { type: "run.started", input: { kind: "text", label: "Camera" }, dropPoint: null, at: now, runId: "one" };
const complete: PipelineEvent = { type: "run.completed", totalMs: 400, at: now + 400, runId: "one" };

function capture(recommendation: SelfCheckResult, dropped = passed, start = started) {
  const events: PipelineEvent[] = [
    start,
    { type: "perception.done", profile, model: MODEL_IDS.perception, latencyMs: 100, at: now + 100, runId: "one" },
    { type: "selfcheck.done", phase: "as-dropped", result: dropped, latencyMs: 3, at: now + 103, runId: "one" },
    { type: "reasoning.done", assessment, model: MODEL_IDS.reasoning, latencyMs: 200, at: now + 303, runId: "one" },
    { type: "selfcheck.done", phase: "recommendation", result: recommendation, latencyMs: 4, at: now + 307, runId: "one" },
    complete,
  ];
  return { status: "done" as const, events, profile, assessment, placedAssetId: "CAM-TEST" };
}

const replay: SimRun = {
  id: "cip", contained: true, stages: [{ t: 2, title: "Fixture", outcome: "blocked", where: ["filler", "V-311"] }],
  consequence: { summary: "Contained", metrics: {} },
  counterfactual: { removedControl: null, consequence: { summary: "Fixture", metrics: {} } },
};
const escalation: EscalationRecord = {
  id: "escalation-one", raisedAt: now, resolvedAt: now + 4_000, thresholds: DEFAULT_THRESHOLDS,
  action: "Review", script: "Fixture", canApprove: false,
  trigger: { key: "one", kind: "finding", test: true, title: "Fixture", assetId: "V-311", assetName: null,
    assetKind: null, room: null, loss: 200_000, score: 40, baseline: 38 },
};
const mitigation: Mitigation = {
  id: "decision-one", title: "Fixture action", description: "Simulation fixture", kind: "physical", targets: ["filler", "V-311"],
  effects: [], proposedBy: "architect", status: "applied",
};

const advisory: ThreatItem = {
  id: "fixture-advisory", source: "cisa-ics", title: "Siemens SIMATIC S7-1500 notice", cves: [],
  summary: "Example revision notes.", url: "https://example.invalid", published: "2026-11-21T16:00:00Z",
};
const recall: LiveItem = {
  id: "fixture-recall", source: "openfda", firm: "Test Beverage", title: "Fixture beverage", cves: [],
  summary: "Foreign material found in the batch.", url: "https://example.invalid", published: "2026-11-20T16:00:00Z",
};
const feed = (items: LiveItem[], error?: string): LiveCheck => ({
  checkedAt: now, items, sources: [{ source: "cisa-ics", count: items.length, cached: true, ms: 2, error }],
});

describe("ticker activity", () => {
  it.each([
    [blocked, passed, "alert", "Camera held"],
    [passed, blocked, "warn", "Camera review"],
    [passedWithFindings, passed, "warn", "Camera review"],
    [passed, passed, "ok", "Camera passed"],
  ] as const)("uses the completed recommendation and drop evidence", (recommended, dropped, tone, title) => {
    const rows = pipelineTickerItems(capture(recommended, dropped), SEED_TWIN);
    expect(rows.find(({ source }) => source === "detection")).toMatchObject({ tone, title, assetId: "CAM-TEST", at: complete.at });
  });

  it("keeps an explicit hold after an alternative passed the rules check", () => {
    const why = "HOLD: the original placement was blocked.";
    const run = capture({ ...passed, disagreements: [why] });
    run.assessment = { ...assessment, placement: { ...assessment.placement, why } };
    const rows = pipelineTickerItems(run, SEED_TWIN);
    expect(rows.find(({ source }) => source === "detection")).toMatchObject({ tone: "alert", title: "Camera held" });
    expect(rows.map(({ title }) => title)).toContain("Alternative checked");
  });

  it("uses the checked placement's per-event figure for a captured device", () => {
    const run = capture(passedWithFindings, passedWithFindings);
    run.assessment = { ...assessment, placement: { ...assessment.placement, network_area: "Corporate office" } };
    const target = assetFromProfile(profile, SEED_TWIN, run.placedAssetId, { area: "corporate_office", x: 310, y: 754 });
    const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, target] };
    const loss = displayedEventLoss(estimateLoss(twin, scenarioFromFinding(twin, finding)));
    expect(loss).toBeGreaterThan(0);
    expect(pipelineTickerItems(run, twin).find(({ kind }) => kind === "capture")).toMatchObject({ loss, tone: triageTone(loss) });
  });

  it("distinguishes actual completions, gate rejections, and analysis failures", () => {
    const run = capture(passed, passed, { ...started, mode: "reassess" });
    run.events.push({ type: "summary.done", runId: "one", at: now + 500, text: "Unavailable", model: "briefing status", latencyMs: 303 });
    expect(pipelineTickerItems(run, SEED_TWIN).map(({ title }) => title)).toEqual([
      "Device identified", "Drop check passed", "Placement assessed", "Rules check passed",
    ]);
    const rejected: PipelineEvent = {
      type: "gate.done", gate: { answers: {}, proceed: false, reason: "Fixture rejection" }, model: MODEL_IDS.decisions,
      latencyMs: 20, at: now + 20, runId: "one",
    };
    const failed: PipelineEvent = { type: "run.error", stage: "gate", message: "Stopped", at: now + 21, runId: "one" };
    expect(pipelineTickerItems({ ...run, events: [started, rejected, failed] }, SEED_TWIN)).toMatchObject([{ tone: "alert", title: "Capture rejected" }]);
    expect(pipelineTickerItems({ ...run, events: [started, failed] }, SEED_TWIN)).toEqual([]);
  });

  it("records simulation and threshold outcomes with explicit provenance", () => {
    expect(simulationTickerItem(replay, "sim-1", now, SEED_TWIN)).toMatchObject({ tone: "ok", title: "Sim CIP contained", assetId: "V-311" });
    const uncontained = { ...replay, contained: false, consequence: { ...replay.consequence, metrics: { lineStopped: true } } };
    const loss = displayedEventLoss(estimateLoss(SEED_TWIN, scenarioFromSimulation(SEED_TWIN, uncontained)!));
    expect(simulationTickerItem(uncontained, "sim-2", now, SEED_TWIN)).toMatchObject({ loss, tone: triageTone(loss), title: "Sim CIP uncontained" });
    const raised = escalationTickerItems([{ ...escalation, resolvedAt: undefined }]);
    const resolved = escalationTickerItems([escalation]);
    expect(raised).toMatchObject([{ tone: "alert", at: now, title: "Test alert", assetId: "V-311", loss: 200_000 }]);
    expect(distinctTickerItems([...raised, ...resolved])).toMatchObject([
      { tone: "ok", at: now + 4_000, title: "Test resolved", assetId: "V-311", loss: 200_000 },
    ]);
  });

  it("records human approvals and only links actual assets", () => {
    expect(approvedMitigation(mitigation)).toBe(true);
    expect(approvedMitigation({ ...mitigation, status: "approved" })).toBe(true);
    expect(approvedMitigation({ ...mitigation, status: "proposed" })).toBe(false);
    expect(approvedMitigation({ ...mitigation, status: "rejected" })).toBe(false);
    expect(mitigationTickerItem(mitigation, "decision-one", now, assets)).toMatchObject({
      tone: "ok", title: "Mitigation approved", assetId: "V-311", source: "task",
    });
  });

  it("ranks loss first, recency at a tie, and discounts comparable loss after 14 days", () => {
    const row = (id: string, loss: number, at: number, tone = triageTone(loss)): TickerItem => ({
      id, loss, at, tone, title: "Advisory matched", kind: "advisory", source: "news",
    });
    const entries = [
      row("higher-stale", 300_000, now - 30 * day), row("fresh", 110_000, now),
      row("similar-stale", 125_000, now - 14 * day - 1), row("window-edge", 125_000, now - 14 * day),
      row("equal-older", 110_000, now - day), row("resolved", 900_000, now, "ok"),
    ];
    expect(rankTickerItems(entries, now).map(({ id }) => id)).toEqual([
      "higher-stale", "window-edge", "fresh", "equal-older", "similar-stale", "resolved",
    ]);
  });

  it("keeps the newest estimate for the same asset and kind", () => {
    const older: TickerItem = { id: "older", at: now - day, loss: 500_000, title: "Advisory matched",
      kind: "advisory", tone: "alert", assetId: "PLC-F3", source: "news" };
    const newer = { ...older, id: "newer", at: now, loss: 10_000, tone: "warn" as const };
    const otherAsset = { ...older, id: "other-asset", assetId: "HMI-F3" };
    const otherKind = { ...older, id: "other-kind", kind: "recall" as const };
    expect(distinctTickerItems([older, otherKind, otherAsset, newer, newer])).toEqual([newer, otherKind, otherAsset]);
  });

  it("uses inclusive loss bands and explicit urgent or clear evidence", () => {
    expect(triageTone(99_999)).toBe("warn");
    expect(triageTone(100_000)).toBe("alert");
    expect(triageTone(undefined, "urgent")).toBe("alert");
    expect(triageTone(200_000, "clear")).toBe("ok");
  });
});

describe("ticker watch", () => {
  it("prices relevant advisories and recalls on the highest-loss matched asset", () => {
    const critical = { ...advisory, id: "critical", summary: "CVSS v3.1 base score: 9.8." };
    const kev = { ...advisory, id: "kev", source: "cisa-kev" as const };
    const unrelated = { ...advisory, id: "unmatched", title: "Supplier news" };
    const rows = watchTickerItems(feed([advisory, critical, kev, recall, unrelated, advisory]), [], SEED_TWIN, Infinity);
    expect(rows.map(({ id }) => id).sort()).toEqual([
      "news:cisa-ics:critical", "news:cisa-ics:fixture-advisory", "news:cisa-kev:kev", "news:openfda:fixture-recall",
    ]);
    for (const match of rankWatchItems([advisory, critical, kev, recall], SEED_TWIN, now)) {
      const prices = match.assetIds.map((assetId) => ({ assetId,
        loss: displayedEventLoss(estimateWatchLoss(SEED_TWIN, { ...match, assetIds: [assetId] })),
      }));
      const expected = prices.sort((a, b) => b.loss - a.loss)[0];
      expect(rows.find(({ id }) => id === `news:${match.item.source}:${match.item.id}`))
        .toMatchObject({ ...expected, tone: triageTone(expected.loss) });
    }
    expect(watchTickerItems(feed([recall]), [], SEED_TWIN, 1)[0]).toMatchObject({ tone: "alert", title: "Recall match" });
    expect(rows.every(({ title }) => title.trim().split(/\s+/).length <= 3)).toBe(true);
  });

  it("prices grounded asset matches from completed reviews", () => {
    const threat = { ...advisory, title: "Reviewed operational notice" };
    const inventory = inventoryForTwin(SEED_TWIN).find(({ assetId }) => assetId === "PLC-BL")!;
    const report: WatchReport = {
      date: "2026-11-21", runId: "review", mode: "local", finishedAt: now, headline: "Fixture review", baselineScore: 1,
      candidates: [{ threat, inventory, score: 12, reasons: [], versionMentioned: true, disposition: "supported",
        decisions: { severity: 4, applicability: 1, exposure: 1 } }],
      items: [{ threat, affectedAssetIds: ["PLC-BL"], technique: null, why: "Fixture", riskDelta: null, triage: "supported" }],
      recommendations: [], sources: [{ source: "cisa-ics", count: 1, cached: true, ms: 2 }], stages: [], warnings: [],
    };
    expect(watchTickerItems(undefined, [report], SEED_TWIN, Infinity)).toMatchObject([
      { id: "news:cisa-ics:fixture-advisory", loss: expect.any(Number), assetId: "PLC-BL" },
    ]);
  });

  it("uses green only for a successful clean watch and keeps all sampled titles compact", () => {
    expect(watchTickerItems(feed([], "Offline"), [], SEED_TWIN, Infinity)).toEqual([]);
    const rows = [
      ...watchTickerItems(feed([]), [], SEED_TWIN, Infinity), ...pipelineTickerItems(capture(blocked), SEED_TWIN),
      ...pipelineTickerItems(capture(passed, blocked), SEED_TWIN), ...pipelineTickerItems(capture(passed), SEED_TWIN),
      ...escalationTickerItems([escalation]), mitigationTickerItem(mitigation, "decision", now, assets),
      simulationTickerItem(replay, "sim", now, SEED_TWIN), simulationTickerItem({ ...replay, contained: false }, "open", now, SEED_TWIN),
    ];
    expect(rows[0]).toMatchObject({ tone: "ok", title: "Feed check clear" });
    for (const { title } of rows) expect(title.trim().split(/\s+/).length, title).toBeLessThanOrEqual(3);
  });
});
