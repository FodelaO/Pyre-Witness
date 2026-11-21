/** Verifies the Chief's evidence projection using the real seed twin and rules engine. */
import { describe, expect, it } from "vitest";
import type { DeviceProfile } from "@/pipeline/types";
import { evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import { buildVoiceContext, type VoiceSnapshot } from "./context";

const profile: DeviceProfile = {
  device_type: "Industrial temperature sensor", category: "sensor", vendor: null, model: null,
  radios: [], ports: ["RJ45"], storage: null, default_credentials_visible: true,
  default_credentials_note: "sensitive fixture value", cloud_connectivity: null, power: null,
  physical_kind: "instrument", capacity_or_size: null, material: null, food_grade: null,
  hazardous_area_rating: null, ip_rating: null, evidence: [], unknowns: ["Ingress rating"], confidence: 0.8,
};

const snapshot: VoiceSnapshot = {
  twin: SEED_TWIN, risk: evaluateTwin(SEED_TWIN), selectedId: null, view: "floor",
  run: { runId: "run-fixture", status: "running", placedAssetId: null, profile, assessment: null, selfCheck: null },
};

describe("Chief evidence context", () => {
  it("uses current rules-engine findings, severity, score, and zones", () => {
    const context = buildVoiceContext(snapshot);
    expect(context.currentRules.score).toBe(snapshot.risk.score);
    expect(context.currentRules.topFindings.map(({ severity }) => severity)).toEqual(
      snapshot.risk.findings.map(({ severity }) => severity).sort((a, b) => b - a).slice(0, 8),
    );
    expect(context.currentRules.exposurePaths[0]).toHaveProperty("target");
    expect(context.currentRules.exposurePaths[0]).not.toHaveProperty("steps");
    expect(context.zones.some(({ levels }) => levels.includes(3.5))).toBe(true);
  });

  it("limits the snapshot to evidence and drops model-only paths and sensitive profile notes", () => {
    const proposal = { ...snapshot.risk.paths[0], id: "model-only", source: "model" as const, severity: 5 as const };
    const context = buildVoiceContext({ ...snapshot, risk: { ...snapshot.risk, paths: [proposal, ...snapshot.risk.paths] } });
    expect(context.currentRules.exposurePaths.find(({ id }) => id === proposal.id)).toBeUndefined();
    expect(context.latestRun.profile).toMatchObject({ defaultCredentialsVisible: true, unknowns: ["Ingress rating"] });
    expect(JSON.stringify(context)).not.toContain("sensitive fixture value");
    expect(context.latestRun.placementCheck).toBeNull();
  });
});
