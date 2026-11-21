/** Verifies footprint, identity, source-bound links and stale approvals deterministically. */
import { describe, expect, it } from "vitest";
import { FOOTPRINT } from "@/equipment/types";
import { SEED_TWIN } from "@/twin/seed";
import type { Twin } from "@/twin/types";
import { planAccepted } from "./approval";
import { checkProposal } from "./reconcile";
import type { ModelDecision } from "./schemas";
import type { ModelProposal, ObservedItem } from "./types";

const existing = SEED_TWIN.assets.find(({ id }) => id === "P-101")!;
const water = SEED_TWIN.areas.find(({ id }) => id === "water_treatment")!;
const twin: Twin = { ...SEED_TWIN, areas: [water], assets: [existing] };
const context = { twin, reservedIds: new Set(["C-WAN-ENT"]) };
const observed = (id: string, tag: string, props: Partial<ObservedItem> = {}): ObservedItem => ({
  id, tag, label: "Feed pump", kind: "pump", object_class: "process_equipment",
  area_guess: "water_treatment", connects_to: [], evidence: [{ locator: "Line 2", detail: tag }], confidence: 0.9, ...props,
});
const addition = (id: string, props: Partial<ModelDecision> = {}): ModelDecision => ({
  item_id: id, action: "new_asset", area: "water_treatment", level: 0,
  near_asset_id: "P-101", network_zone: existing.network.area, ...props,
});
const proposalOf = (checked: ReturnType<typeof checkProposal>): ModelProposal => ({
  ...checked, source: { kind: "inventory", bytes: 1, files: ["list.csv"] },
  timings: { uploadMs: 0, gateMs: 0, extractionMs: 0, reconciliationMs: 0, validationMs: 0, totalMs: 0 },
  models: { gate: "", extraction: "", reconciliation: "" },
});

describe("proposal validation", () => {
  it("places complete symbols inside the room without overlap or seed mutation", () => {
    const inputs = [observed("a", "P-901"), observed("b", "P-902")];
    const { additions, dropped } = checkProposal(context, inputs, [addition("a"), addition("b")], "test");
    expect(dropped).toEqual([]);
    expect(additions.map(({ id, origin, status, placement }) => [id, origin, status, placement]))
      .toEqual([["P-901", "added", "ok", "neutral"], ["P-902", "added", "ok", "neutral"]]);
    const { w, h } = FOOTPRINT.pump;
    for (const [index, { physical }] of additions.entries()) {
      expect(physical.x - w / 2).toBeGreaterThan(water.bounds.x);
      expect(physical.y - h / 2).toBeGreaterThan(water.bounds.y);
      expect(physical.x + w / 2).toBeLessThan(water.bounds.x + water.bounds.w);
      expect(physical.y + h / 2).toBeLessThan(water.bounds.y + water.bounds.h);
      for (const { physical: obstacle } of [existing, ...additions.slice(0, index)]) {
        expect(Math.abs(physical.x - obstacle.x) >= w || Math.abs(physical.y - obstacle.y) >= h).toBe(true);
      }
    }
    expect(twin.assets).toEqual([existing]);
  });

  it("rejects unknown rooms and matches, reserved IDs and obstructed footprints", () => {
    const tiny = { ...water, bounds: { x: 190, y: 145, w: 34, h: 35 } };
    const checked = checkProposal({ ...context, twin: { ...twin, areas: [tiny] } }, [
      observed("a", "P-901"), observed("b", "P-902"), observed("c", "C-WAN-ENT"), observed("d", "P-101"),
    ], [
      addition("a", { area: "fake_room" }), addition("b"), addition("c"),
      { item_id: "d", action: "match_existing", asset_id: "P-900" },
    ], "test");
    expect(checked.additions).toEqual([]);
    expect(checked.dropped.map(({ reason }) => reason)).toEqual([
      "Unknown placement room fake_room.", "No clear footprint in Water treatment.",
      "Asset ID C-WAN-ENT already exists or is reserved.", "Match lacks unique source evidence for P-900.",
    ]);
  });

  it("keeps observed links and additive updates, reports invented topology and unknown anchors", () => {
    const check = checkProposal(context, [
      observed("current", "P-101", { label: "Raw water feed pump A", connects_to: [{ to: "P-901", medium: "water" }] }),
      observed("fresh", "P-901", { connects_to: [{ to: "P-101", medium: "water" }, { to: "Missing", medium: "water" }] }),
    ], [
      { item_id: "current", action: "update_existing", asset_id: "P-101", fields: ["name", "connections"],
        connections: [{ to: "fresh", medium: "water" }] },
      addition("fresh", { near_asset_id: "Missing", network_zone: "Invalid", connections: [
        { to: "P-101", medium: "water" }, { to: "P-101", medium: "network" }, { to: "Missing", medium: "water" },
      ] }),
    ], "test");
    expect(check.additions[0].physical.connections).toEqual([{ to: "P-101", medium: "water" }]);
    expect(check.additions[0].network.area).toBe(existing.network.area);
    expect(check.updates).toEqual([{
      assetId: "P-101", beforeName: existing.name, beforeKind: "pump", name: "Raw water feed pump A",
      connections: [{ to: "P-901", medium: "water" }],
    }]);
    expect(check.dropped.map(({ reason }) => reason)).toEqual([
      "Ignored unavailable room anchor Missing.", "Ignored unknown Purdue 0 zone Invalid.",
      "Ignored unknown, ambiguous or self connection Missing.", "Ignored connection without source evidence to P-101.",
    ]);
    const beforeApproval = planAccepted(twin, proposalOf(check), new Set(["current"]));
    expect(beforeApproval.updates[0].change.connections).toEqual([]);
    expect(beforeApproval.issues[0].reason).toContain("Connection to P-901 skipped");
  });

  it("refuses an occupied preview even when another position is available", () => {
    const check = checkProposal(context, [observed("a", "P-901")], [addition("a")], "test");
    const intruder = { ...check.additions[0], id: "P-999" };
    const stale = planAccepted({ ...twin, assets: [...twin.assets, intruder] }, proposalOf(check), new Set(["a"]));
    expect(stale.additions).toEqual([]);
    expect(stale.issues[0].reason).toContain("preview no longer fits");
  });
});
