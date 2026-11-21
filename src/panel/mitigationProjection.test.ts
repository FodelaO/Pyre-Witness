/** Verifies projected changes follow the twin and redundant moves become read-only. */
import { expect, it } from "vitest";
import { evaluateTwin } from "@/rules/engine";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import type { Mitigation } from "@/twin/types";
import { projectMitigation } from "./mitigationProjection";

it("updates a proposed move after the device reaches the checked destination", () => {
  const item: Mitigation = {
    id: "relocate", title: "Move to office", kind: "physical", description: "", proposedBy: "architect",
    status: "proposed", targets: ["GW-PK"], riskDelta: -99,
    effects: [{ type: "move_asset", assetId: "GW-PK", area: "corporate_office", level: 4, networkArea: "Enterprise", conduit: null }],
  };
  const baseline = evaluateTwin(SEED_TWIN).score;
  const relocated = applyEffects(SEED_TWIN, item.effects);
  const score = evaluateTwin(relocated).score;
  expect(projectMitigation(SEED_TWIN, item, baseline)).toEqual({ delta: score - baseline, resolved: null });
  const afterMove = { ...relocated, assets: relocated.assets.map((asset) =>
    asset.id === "GW-PK" ? { ...asset, placement: "recommended" as const } : asset) };
  expect(projectMitigation(afterMove, item, score)).toEqual({ delta: 0, resolved: "Already resolved by the move." });
  expect(projectMitigation(afterMove, { ...item, effects: [{ type: "note", text: "Check version" }] }, score).resolved).toBeNull();
});
