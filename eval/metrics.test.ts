/** Verifies evaluation arithmetic with tiny synthetic inputs, without provider calls. */
import { describe, expect, it } from "vitest";
import type { DeviceProfile } from "@/pipeline/types";
import { summarize } from "./metrics";
import { mean, pairedBootstrap, wilson } from "./statistics";
import type { EvaluatedItem, EvaluationItem, Observation, Prediction, Recommendation } from "./types";

const item = (expected: Partial<EvaluationItem["expected"]> = {}): EvaluationItem => ({
  id: "fixture", group: "clean", input: { kind: "text", description: "synthetic metric fixture" },
  sourceUrl: "", license: "Fixture", notes: "",
  expected: { isDevice: true, areas: [], levels: [], neverAreas: [], riskTags: [], ...expected },
});

const profile = (overrides: Partial<DeviceProfile> = {}): DeviceProfile => ({
  device_type: "temperature sensor", category: "sensor", vendor: null, model: null, radios: [], ports: [], storage: null,
  default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: null, power: null,
  physical_kind: "instrument", capacity_or_size: null, material: null, food_grade: null, hazardous_area_rating: null,
  ip_rating: null, evidence: [], unknowns: [], confidence: 0.9, ...overrides,
});

const placement = (area: Recommendation["physical_placement"]["area"], level: Recommendation["placement"]["level"]): Recommendation => ({
  placement: { level, network_area: "Zone", conduit: null, why: "Fixture" },
  physical_placement: { area, near_asset_id: null, position_hint: "Fixture", connections: [], physical_constraints: [] },
});

const prediction = (fields: Partial<Prediction> = {}): Prediction => ({
  accepted: true, profile: profile(), recommendation: null, neverAreas: [], riskTags: [], techniques: [], filteredUnknownTechniques: [], ...fields,
});

const observation = (prediction: Prediction | null, options: Partial<Observation> = {}): Observation => ({
  prediction, latencyMs: 100, ruleCheck: null, status: prediction?.accepted === false ? "rejected" : "ok", ...options,
});

describe("evaluation metrics", () => {
  it("counts false accepts, false rejects, unavailable decisions and operational failures separately", () => {
    const rows: EvaluatedItem[] = [
      { item: item({ isDevice: false }), observations: { baseline: observation(prediction()), system: observation(prediction({ accepted: false, profile: null })) } },
      { item: item({ physicalKind: "instrument" }), observations: { baseline: observation(prediction({ accepted: false, profile: null })), system: observation(prediction()) } },
      { item: item({ isDevice: false }), observations: { baseline: observation(null, { status: "error", error: { stage: "baseline", timeout: true, message: "Timed out" } }) } },
    ];
    const { sides, paired } = summarize(rows);
    expect(sides.baseline.gate).toEqual({ positives: 1, negatives: 2, falseAccepts: 1, falseRejects: 1, noDecision: 1 });
    expect(sides.baseline.metrics.gateAccuracy).toMatchObject({ value: 0, n: 3 });
    expect(sides.baseline.metrics.physicalKindAccuracy).toMatchObject({ value: 0, n: 1 });
    expect(sides.baseline.metrics.falseAcceptRate).toMatchObject({ value: 1, n: 1 });
    expect(sides.baseline.failures).toBe(1);
    expect(sides.baseline.timeouts).toBe(1);
    expect(sides.system.metrics.gateAccuracy).toMatchObject({ value: 1, n: 2 });
    expect(sides.system.gateRejections).toBe(1);
    expect(paired.metrics.gateAccuracy).toEqual({ value: 1, n: 2, interval: [1, 1] });
  });

  it("uses label micro-averages and normalizes connector names", () => {
    const rows: EvaluatedItem[] = [
      { item: item({ radios: ["wifi", "bluetooth"], ports: ["RJ45", "USB-A"] }), observations: {
        baseline: observation(prediction({ profile: profile({ radios: ["wifi", "cellular", "wifi"], ports: ["Ethernet (RJ45)", "USB Type A", "USB-C"] }) })),
      } },
      { item: item({ radios: ["nfc"], ports: [] }), observations: { baseline: observation(prediction({ profile: profile({ radios: ["nfc"] }) })) } },
      { item: item(), observations: { baseline: observation(prediction({ profile: profile({ radios: ["lora"] }) })) } },
    ];
    const metrics = summarize(rows).sides.baseline.metrics;
    expect(metrics.radiosPrecision).toMatchObject({ value: 2 / 3, n: 3 });
    expect(metrics.radiosRecall).toMatchObject({ value: 2 / 3, n: 3 });
    expect(metrics.radiosF1.value).toBeCloseTo(2 / 3);
    expect(metrics.radiosF1.n).toBe(4);
    expect(metrics.portsF1.value).toBeCloseTo(4 / 5);
    const interval = wilson(2, 4)!;
    expect(metrics.radiosF1.interval).toEqual(interval.map((value) => 2 * value / (1 + value)));
  });

  it("scores membership, forbidden rooms, blocking rules, tags, flags and ATT&CK validity", () => {
    const target = item({
      category: "sensor", physicalKind: "instrument", areas: ["water_treatment", "blending"], levels: [0, 1],
      neverAreas: ["washdown"], riskTags: ["washdown", "wireless"], defaultCredentials: false, cloud: false, capacity: "1,000 liters",
    });
    const baseline = observation(prediction({ recommendation: placement("washdown", 2), riskTags: ["wireless"], techniques: ["T0800", "T9999"] }), {
      ruleCheck: { passed: false, detail: ["Test block"] }, latencyMs: 50,
    });
    const system = observation(prediction({
      recommendation: placement("blending", 0), riskTags: ["washdown", "wireless"], techniques: ["T0800"], filteredUnknownTechniques: ["T9999"],
      profile: profile({ cloud_connectivity: false, capacity_or_size: "1000 L" }),
    }), { ruleCheck: { passed: true, detail: [] }, latencyMs: 150 });
    const { sides, paired } = summarize([{ item: target, observations: { baseline, system } }]);
    expect(sides.baseline.metrics.techniqueValidity).toMatchObject({ value: 0.5, n: 2 });
    expect(sides.baseline.metrics.techniqueHallucination).toMatchObject({ value: 0.5, n: 2 });
    expect(sides.system.filteredUnknownTechniques).toBe(1);
    expect(sides.baseline.metrics.riskRecall).toMatchObject({ value: 0.5, n: 2 });
    expect(sides.system.metrics.riskRecall).toMatchObject({ value: 1, n: 2 });
    expect(sides.baseline.metrics.neverPlaceViolation).toMatchObject({ value: 1, n: 1 });
    expect(sides.system.metrics.neverPlaceViolation).toMatchObject({ value: 0, n: 1 });
    expect(sides.baseline.metrics.cloudAccuracy).toMatchObject({ value: 0, n: 1 });
    expect(sides.system.metrics.cloudAccuracy).toMatchObject({ value: 1, n: 1 });
    for (const key of ["physicalAreaAccuracy", "purdueAccuracy", "ruleConsistency", "capacityMatch", "defaultCredentialsAccuracy"] as const) {
      expect(sides.system.metrics[key]).toMatchObject({ value: 1, n: 1 });
    }
    expect(paired.latencyMs.p95).toEqual({ value: 100, n: 1, interval: [100, 100] });
  });

  it("keeps unavailable ratios empty, scores calibrated type judgments, and checks the paired cohort", () => {
    const anchor = item({ deviceType: "thermocouple", radios: [] });
    const found = observation(prediction());
    const result = summarize([
      { item: anchor, observations: { baseline: found, system: found }, judge: {
        latencyMs: 10, raw: null,
        answers: { baseline: { probability: 0.49, confidence: 0.51 }, system: { probability: 0.84, confidence: 0.84 } },
      } },
      { item: anchor, observations: { baseline: found }, judge: { latencyMs: 5, answers: {}, raw: null } },
    ]);
    expect(result.sides.baseline.metrics.radiosF1).toEqual({ value: null, interval: null, numerator: 0, n: 0 });
    expect(result.paired.metrics.radiosF1.n).toBe(0);
    expect(result.sides.baseline.metrics.deviceTypeMatch).toMatchObject({ value: 0, n: 1 });
    expect(result.sides.baseline.judgeFailures).toBe(1);
    expect(result.sides.system.metrics.deviceTypeMatch).toMatchObject({ value: 1, n: 1 });
    expect(result.paired.typeProbability.value).toBeCloseTo(0.35);
    expect(result.paired.typeProbability.n).toBe(1);
  });
});

describe("evaluation intervals", () => {
  it("uses Wilson limits with small-sample uncertainty at the endpoints", () => {
    expect(wilson(0, 0)).toBeNull();
    expect(wilson(0, 1)?.[1]).toBeCloseTo(0.79345);
    expect(wilson(1, 1)?.[0]).toBeCloseTo(0.20655);
    expect(wilson(5, 10)?.[0]).toBeCloseTo(0.23659);
    expect(wilson(5, 10)?.[1]).toBeCloseTo(0.76341);
  });

  it("resamples pairs jointly and reproduces the same interval", () => {
    const pairs = [{ baseline: 10, system: 11 }, { baseline: 200, system: 201 }, { baseline: 1_000, system: 1_001 }];
    expect(pairedBootstrap(pairs, mean)).toEqual({ n: 3, value: 1, interval: [1, 1] });
    const varied = [{ baseline: 0, system: 1 }, { baseline: 1, system: 0 }, { baseline: 0, system: 1 }];
    const result = pairedBootstrap(varied, mean);
    expect(result.value).toBeCloseTo(1 / 3);
    expect(result.interval).toEqual([-1, 1]);
    expect(pairedBootstrap(varied, mean)).toEqual(result);
  });
});
