/** Tests one-line input isolation, labeled recovery and measured rules agreement. */
import { expect, it } from "vitest";
import { pressureProfile } from "@/pipeline/server/__fixtures__/placement";
import { modalityInput, summarizeModality } from "./modality";
import type { EvaluatedItem, RunArtifact } from "./types";

const item: EvaluatedItem["item"] = {
  id: "test-photo", group: "messy", input: { kind: "photo", file: "unseen.jpg" },
  sourceUrl: "https://example.com/fixture",
  license: "Fixture", notes: "This stays out of the text.",
  expected: { isDevice: true, deviceType: "  Pressure   gauge\n", radios: [], ports: ["RJ45"], defaultCredentials: false, areas: [], levels: [], neverAreas: [], riskTags: [] },
};

it("uses the short device label alone and excludes text, links and negatives", () => {
  expect(modalityInput(item)).toEqual({ kind: "text", description: "Pressure gauge" });
  expect(modalityInput({ ...item, expected: { ...item.expected, isDevice: false } })).toBeNull();
  expect(modalityInput({ ...item, input: { kind: "text", description: "Existing capture" } })).toBeNull();
  expect(modalityInput({ ...item, input: { kind: "link", url: "https://example.com" } })).toBeNull();
});

it("scores absent outputs as misses and only compares actual rule verdicts", () => {
  const photo: RunArtifact = { status: "ok", latencyMs: 100, raw: null, ruleCheck: null, asDroppedPassed: false,
    prediction: { accepted: true, recommendation: null, neverAreas: [], riskTags: [], techniques: [], filteredUnknownTechniques: [],
      profile: { ...pressureProfile, ports: ["Ethernet RJ45"], radios: [], material: "steel", ip_rating: "IP67",
        hazardous_area_rating: "unknown", default_credentials_visible: false,
        evidence: [{ source: "label", claim: "Rating plate visible", confidence: 0.9 }] } } };
  const missing: RunArtifact = { status: "error", latencyMs: 30, raw: null, ruleCheck: null, prediction: null, asDroppedPassed: null };
  const rows: EvaluatedItem[] = [
    { item, observations: { system: photo }, ablation: missing },
    { item: { ...item, id: "same-verdict" }, observations: { system: photo }, ablation: { ...photo, asDroppedPassed: false } },
    { item: { ...item, id: "pending" }, observations: { system: photo } },
  ];
  const summary = summarizeModality(rows, 3, true);
  expect(summary).toMatchObject({ eligible: 3, paired: 2, verdictAgreement: { value: 1, n: 1 }, errors: { photo: 0, text: 1 } });
  expect(summary.metrics).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: "Port list matched labels", photo: expect.objectContaining({ value: 1, n: 2 }),
      text: expect.objectContaining({ value: 0.5, n: 2 }), photoMinusText: expect.objectContaining({ value: 0.5, interval: expect.any(Array) }) }),
    expect.objectContaining({ label: "Hazardous-area rating reported", photo: expect.objectContaining({ value: 0 }) }),
  ]));
  expect(summary.evidenceItems.photo).toMatchObject({ value: 1, interval: [1, 1], n: 2 });
  expect(summarizeModality(rows, 3, false).paired).toBe(0);
});
