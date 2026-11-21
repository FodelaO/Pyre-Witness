/** Checks how Inspector findings and grounded disagreements affect a placement review. */
import { expect, it } from "vitest";
import { assetFromProfile, atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import { bestPlacement, evaluatePlacement } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import { officeAssessment, pressureProfile } from "./__fixtures__/placement";
import { groundAssessment } from "./groundAssessment";
import { checkPlacement, holdBlockedPlacement } from "./selfCheck";

const candidate = assetFromProfile(pressureProfile, SEED_TWIN, "NEW-TEST", { x: 1420, y: 150, area: "utilities" });

it("flags the recommended hazard zone and reports a safer alternative once", () => {
  const draft = {
    ...officeAssessment,
    placement: { ...officeAssessment.placement, level: 1 as const, network_area: "Utilities" },
    physical_placement: { ...officeAssessment.physical_placement, area: "utilities" as const },
  };
  const { assessment } = groundAssessment(SEED_TWIN, candidate, draft, "run");
  const check = checkPlacement(SEED_TWIN, candidate, assessment, ["Grounding issue", "Grounding issue"], false, false);
  expect(check).toMatchObject({ passed: false, revised: false });
  expect(check.disagreements.filter((issue) => issue === "Grounding issue")).toHaveLength(1);
  expect(check.disagreements).toEqual(expect.arrayContaining([
    expect.stringContaining("HAZ-01 blocks the recommended spot"),
    expect.stringContaining("The rules engine ranks"),
  ]));
});

it("checks the exact current point on reassessment even when the recommendation passes", () => {
  const { assessment } = groundAssessment(SEED_TWIN, candidate, officeAssessment, "run");
  expect(checkPlacement(SEED_TWIN, candidate, assessment, [], false, false).passed).toBe(true);
  const check = checkPlacement(SEED_TWIN, candidate, assessment, [], true, true);
  expect(check).toMatchObject({
    passed: false, revised: true,
    findings: expect.arrayContaining([expect.objectContaining({ ruleId: "HAZ-01", assetId: candidate.id })]),
  });
  expect(check.disagreements.some((issue) => issue.includes("HAZ-01 blocks the recommended spot"))).toBe(false);
});

it("holds a blocked passive placement and checks the least-risk room at internal level zero", () => {
  const mugProfile = { ...pressureProfile, object_class: "passive_object", device_type: "Ceramic mug", material: "ceramic" } as const;
  const mug = assetFromProfile(mugProfile, SEED_TWIN, "MUG-901", { x: 700, y: 640, area: "filler3" });
  const draft = {
    ...officeAssessment,
    physical_placement: { ...officeAssessment.physical_placement, area: "filler3" as const },
  };
  const { assessment } = groundAssessment(SEED_TWIN, mug, draft, "run", { passive: true });
  const before = checkPlacement(SEED_TWIN, mug, assessment, ["Model disagreement."], false, true);
  expect(before.passed).toBe(false);
  const held = holdBlockedPlacement(SEED_TWIN, mug, assessment, before, true)!;
  const { placement } = bestPlacement(SEED_TWIN, mug);
  expect(held.assessment).toMatchObject({
    placement: { level: 0, conduit: null, why: expect.stringMatching(/^HOLD: .*Corporate Office/i) },
    physical_placement: { area: placement?.area, near_asset_id: null, connections: [] },
  });
  expect(held.assessment.placement.why).not.toMatch(/Purdue/i);
  expect(atRecommendedPlacement(SEED_TWIN, mug, held.assessment, "passive_object")).toBeNull();
  const draftAlternative = { ...held.assessment, placement: { ...held.assessment.placement, why: "Review the office." } };
  const actual = atRecommendedPlacement(SEED_TWIN, mug, draftAlternative, "passive_object")!;
  expect(held.check()).toMatchObject({
    ...evaluatePlacement(SEED_TWIN, actual), passed: true, revised: true,
    disagreements: expect.arrayContaining(["Model disagreement.", expect.stringMatching(/^HOLD:/)]),
  });
});

it("keeps the findings and a clear hold when the twin has no usable option", () => {
  const twin = { ...SEED_TWIN, areas: SEED_TWIN.areas.filter(({ id }) => id === "nh3_hazard") };
  const { assessment } = groundAssessment(SEED_TWIN, candidate, {
    ...officeAssessment,
    physical_placement: { ...officeAssessment.physical_placement, area: "nh3_hazard" },
  }, "run");
  const before = checkPlacement(twin, candidate, assessment, ["Known disagreement."], false, true);
  const held = holdBlockedPlacement(twin, candidate, assessment, before)!;
  expect(held.assessment.placement.why).toMatch(/^HOLD: no usable alternative/);
  expect(held.check()).toEqual({ ...before, disagreements: [...before.disagreements, held.assessment.placement.why] });
});
