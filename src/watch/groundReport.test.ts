/** Exercises evidence grounding, measured deltas and the actual human-decision store. */
import { evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import { afterEach, describe, expect, it } from "vitest";
import { groundReport } from "./groundReport";
import { inventoryForTwin } from "./inventory";
import { reassessmentSchema, type Reassessment } from "./reassessmentSchema";
import { threatKey } from "./sources";
import type { TriagedCandidate } from "./triage";
import type { ThreatItem } from "./types";

const threat: ThreatItem = {
  source: "cisa-ics", id: "ICSA-26-999-99", title: "Test advisory for the fixture",
  cves: [], published: "2026-11-21T00:00:00.000Z", url: "https://www.cisa.gov/", summary: "Test fixture only.",
};
const inventory = inventoryForTwin(SEED_TWIN).find(({ assetId }) => assetId === "GW-PK")!;
const candidate: TriagedCandidate = { threat, inventory, versionMentioned: false, reasons: [], score: 9, disposition: "uncertain" };
const threatId = threatKey(threat);

const draft: Reassessment = {
  headline: "Review the simulated gateway",
  items: [{ threatId, affectedAssetIds: ["GW-PK", "unknown", "PLC-F3"], techniqueId: "T9999", why: "Fixture", riskDelta: null }],
  recommendations: [
    { threatId, title: "Disable maintenance modem", kind: "software", description: "Fixture radio change.", effects: [
      { type: "disable_radio", assetId: "GW-PK", radio: "cellular" },
      { type: "patch_cyber", assetId: "GW-PK", patch: { remoteAccess: false, cloudConnected: false } },
    ] },
    { threatId, title: "Review patch", kind: "procedural", description: "Check vendor maintenance guidance.", effects: [
      { type: "note", text: "Mark GW-PK for patch review" },
    ] },
    { threatId, title: "Discard invalid effect", kind: "software", description: "Fixture invalid target.", effects: [
      { type: "disable_radio", assetId: "unknown", radio: "cellular" },
    ] },
  ],
};

afterEach(() => useTwinStore.getState().reset());

describe("watch evidence and approval", () => {
  it("drops unsupported references and preserves independently measured zero deltas", () => {
    const original = structuredClone(SEED_TWIN);
    const baseline = evaluateTwin(SEED_TWIN).score;
    const report = groundReport(reassessmentSchema.parse(draft), [candidate], SEED_TWIN, baseline, "fixture");
    expect(SEED_TWIN).toEqual(original);
    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({ affectedAssetIds: ["GW-PK"], technique: null, triage: "uncertain" });
    expect(report.recommendations).toHaveLength(2);
    expect(report.recommendations[0].riskDelta).toBeLessThan(0);
    expect(report.recommendations[1].riskDelta).toBe(0);
    expect(report.warnings.join(" ")).toMatch(/2 unknown or unmatched asset references.*1 unknown ATT&CK.*1 proposals/);
  });

  it("leaves the shared twin unchanged until approval and records rejection", () => {
    const store = useTwinStore.getState();
    const { recommendations: [protect, patchReview] } = groundReport(draft, [candidate], store.twin, store.risk.score, "approve");
    store.proposeMitigations([protect, patchReview]);
    expect(useTwinStore.getState().twin).toBe(store.twin);
    store.decideMitigation(patchReview.id, "rejected");
    expect(useTwinStore.getState().twin).toBe(store.twin);
    store.decideMitigation(protect.id, "approved");
    const approved = useTwinStore.getState();
    expect(approved.twin.assets.find(({ id }) => id === "GW-PK")?.cyber?.radios).toEqual([]);
    expect(approved.risk.score).toBeCloseTo(store.risk.score + protect.riskDelta, 2);
    expect(approved.mitigations.map(({ status }) => status)).toEqual(["applied", "rejected"]);
  });

  it("rejects effects that would enable remote access or remove plant equipment", () => {
    for (const effect of [
      { type: "patch_cyber", assetId: "GW-PK", patch: { remoteAccess: true } },
      { type: "patch_cyber", assetId: "GW-PK", patch: { managed: true } },
      { type: "remove_asset", assetId: "GW-PK" },
    ]) {
      expect(reassessmentSchema.safeParse({ ...draft, recommendations: [{ ...draft.recommendations[0], effects: [effect] }] }).success).toBe(false);
    }
  });

  it.each(["port-lock", "locked-cabinet"])("measures %s and installs it only after approval", (protection) => {
    const store = useTwinStore.getState();
    const hmi = inventoryForTwin(store.twin).find(({ assetId }) => assetId === "HMI-F3")!;
    const asset = () => useTwinStore.getState().twin.assets.find(({ id }) => id === hmi.assetId);
    const fixture = reassessmentSchema.parse({
      ...draft,
      items: [{ ...draft.items[0], affectedAssetIds: [hmi.assetId] }],
      recommendations: [{
        threatId, title: "Protect the service port", description: "Add an independent safeguard.", kind: "physical",
        effects: [{ type: "add_protection", assetId: hmi.assetId, protection }],
      }],
    });
    const [proposed] = groundReport(fixture, [{ ...candidate, inventory: hmi }], store.twin, store.risk.score, "protection").recommendations;
    expect(proposed.riskDelta).toBeLessThan(0);
    store.proposeMitigations([proposed]);
    expect(asset()?.protections ?? []).not.toContain(protection);
    store.decideMitigation(proposed.id, "approved");
    expect(asset()?.protections).toContain(protection);
    expect(useTwinStore.getState().risk.score).toBeCloseTo(store.risk.score + proposed.riskDelta, 2);
  });
});
