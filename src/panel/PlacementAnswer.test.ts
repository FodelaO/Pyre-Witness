/** Renders the hold that follows a real blocking rule and exposes a ranked alternative. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { Assessment } from "@/pipeline/types";
import { evaluatePlacement, evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import type { TwinState } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { PlacementAnswer } from "./PlacementAnswer";

const fixture = vi.hoisted(() => ({ current: undefined as TwinState | undefined }));
vi.mock("@/twin/store", async (load) => {
  const actual = await load<typeof import("@/twin/store")>();
  const selectFixture = (select: (state: TwinState) => unknown) => select(fixture.current!);
  return { useTwinStore: Object.assign(selectFixture, actual.useTwinStore) };
});

it("withholds the move and shows a rules engine alternative in every lens", () => {
  const reference = SEED_TWIN.assets.find(({ id }) => id === "FIL-3")!;
  const area = SEED_TWIN.areas.find(({ id }) => id === reference.physical.area)!;
  const asset: Asset = {
    id: "QA-VESSEL", name: "Non-food-grade vessel", origin: "added", status: "ok", criticality: 2,
    physical: { ...reference.physical, kind: "vertical_tank", connections: [] },
    network: { area: area.name, level: 0, conduit: null },
    specs: { foodGrade: false, material: "Carbon steel" },
  };
  const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, asset] };
  const assessment: Assessment = {
    placement: { level: 0, network_area: area.name, conduit: null, why: "" },
    physical_placement: { area: area.id, near_asset_id: null, position_hint: "", connections: [], physical_constraints: [] },
    never_place: [], risks: [], compliance: [], mitigations: [], attack_paths: [], confidence: 1,
  };
  const target = atRecommendedPlacement(twin, asset, assessment)!;
  const result = evaluatePlacement(twin, target);
  const passed = !result.findings.some(({ severity }) => severity >= 4);
  expect(passed).toBe(false);
  fixture.current = { twin, risk: evaluateTwin(twin), select: vi.fn() } as unknown as TwinState;

  for (const mode of ["material", "both", "data"] as const) {
    const html = renderToStaticMarkup(createElement(PlacementAnswer, {
      assessment, placedAssetId: asset.id, pending: false, mode, checked: { ...result, passed, revised: true, disagreements: [] },
    }));
    expect(html).toContain("No compliant spot: hold");
    expect(html).toContain("Rules engine alternative");
    expect(html).toContain('title="Purdue level ');
    expect(html).not.toContain("Move there");
  }
});

it.each([true, false])("hides the Purdue badge for a passive item when the recommendation is cleared: %s", (passed) => {
  const area = SEED_TWIN.areas.find(({ id }) => id === "corporate_office")!;
  const mug: Asset = {
    id: "QA-MUG", name: "Coffee mug", origin: "added", status: "ok", criticality: 1,
    physical: { area: area.id, x: area.bounds.x + 40, y: area.bounds.y + 40, kind: "generic_device", rotation: 0, connections: [] },
    network: { area: area.name, level: 0, conduit: null },
  };
  const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, mug] };
  const assessment: Assessment = {
    placement: { level: 0, network_area: area.name, conduit: null, why: "" },
    physical_placement: { area: area.id, near_asset_id: null, position_hint: "", connections: [], physical_constraints: [] },
    never_place: [], risks: [], compliance: [], mitigations: [], attack_paths: [], confidence: 1,
  };
  fixture.current = { twin, risk: evaluateTwin(twin), select: vi.fn() } as unknown as TwinState;

  const html = renderToStaticMarkup(createElement(PlacementAnswer, {
    assessment, placedAssetId: mug.id, pending: false, mode: "both", objectClass: "passive_object",
    checked: { findings: [], paths: [], passed, revised: false, disagreements: [] },
  }));
  expect(html).toContain(area.name);
  expect(html).toContain(passed ? "Rules engine cleared" : "Rules engine alternative");
  expect(html).not.toContain('title="Purdue level ');
});
