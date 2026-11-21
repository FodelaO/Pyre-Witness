/** Checks how Inspector findings and grounded disagreements affect a placement review. */
import { expect, it } from "vitest";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import { SEED_TWIN } from "@/twin/seed";
import { officeAssessment, pressureProfile } from "./__fixtures__/placement";
import { groundAssessment } from "./groundAssessment";
import { checkPlacement } from "./selfCheck";

const candidate = assetFromProfile(pressureProfile, SEED_TWIN, "NEW-TEST", { x: 1420, y: 150, area: "utilities" });

it("flags the recommended hazard zone and reports a safer alternative once", () => {
  const draft = {
    ...officeAssessment,
    placement: { ...officeAssessment.placement, level: 1 as const, network_area: "Hazardous NH3 area" },
    physical_placement: { ...officeAssessment.physical_placement, area: "nh3_hazard" as const },
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
