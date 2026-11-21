/** Exercises evidence grounding and repeat-sighting deduplication from fixed fixtures. */
import { describe, expect, it } from "vitest";
import { SEED_TWIN } from "@/twin/seed";
import type { PreparedSource } from "./media";
import { observeItems } from "./observations";
import type { RawObservation } from "./schemas";

const clip: PreparedSource = { source: { kind: "video", bytes: 1, files: ["test.mp4"], durationSeconds: 20 }, parts: [] };
const sighting = (locator: string, fields: Partial<RawObservation> = {}): RawObservation => ({
  label: "Water pump", kind: "pump", object_class: "process_equipment", evidence: { locator, detail: "Blue casing and silver motor" },
  tag: null, area_guess: null, connects_to: [], confidence: 0.8, ...fields,
});

describe("observed evidence", () => {
  it("merges repeat tagged sightings, keeps timestamps and preserves documented links", () => {
    const { items } = observeItems([
      sighting("00:14", { tag: "p-101", connects_to: [{ to: "TK-101", medium: "water" }] }),
      sighting("00:02", { tag: "P‑101", confidence: 0.95, connects_to: [{ to: "RO-101", medium: "water" }] }),
      sighting("00:09", { tag: "P-102" }),
    ], clip, SEED_TWIN);
    expect(items).toHaveLength(2);
    expect(items[0].evidence.map(({ locator }) => locator)).toEqual(["00:02", "00:14"]);
    expect(items[0].connects_to.map(({ to }) => to)).toEqual(["TK-101", "RO-101"]);
    expect(items[0].confidence).toBe(0.95);
  });

  it("deduplicates an untagged repeat and retains distinguishable equipment", () => {
    const { items, dropped } = observeItems([
      sighting("00:02"),
      sighting("00:07"),
      sighting("00:09", { evidence: { locator: "00:09", detail: "Yellow casing and red motor" } }),
      sighting("00:20"),
      sighting("00:60"),
    ], clip, SEED_TWIN);
    expect(items.map((item) => item.evidence.map(({ locator }) => locator))).toEqual([["00:02", "00:07"], ["00:09"]]);
    expect(dropped).toHaveLength(2);
  });

  it("requires the inventory excerpt and entire tag on the cited line", () => {
    const inventory: PreparedSource = {
      source: { kind: "inventory", bytes: 1, files: ["list.csv"] }, parts: [],
      inventoryLines: ["Tag,Desc", "P-101,Water pump", "P-110,Transfer pump"],
    };
    const result = observeItems([
      sighting("Line 2", { tag: "P-101", evidence: { locator: "Line 2", detail: "P-101,Water pump" } }),
      sighting("Line 2", { tag: "P-10", evidence: { locator: "Line 2", detail: "Water pump" } }),
      sighting("Line 3", { tag: "P-110", evidence: { locator: "Line 3", detail: "Vibration sensor" } }),
      sighting("Line 9"),
    ], inventory, SEED_TWIN);
    expect(result.items.map(({ tag }) => tag)).toEqual(["P-101"]);
    expect(result.dropped).toHaveLength(3);
  });
});
