/** Checks that a phone approval can apply a real, resolving control to the seed twin. */
import { afterEach, expect, it } from "vitest";
import { useTwinStore } from "@/twin/store";
import { readCauses } from "./evidence";
import { applyApproval, approvalTitle, confirmApproval, planApproval } from "./recommendation";
import { runTestAlert, TEST_ASSET_ID } from "./testScenario";

afterEach(() => useTwinStore.getState().reset());

it("limits rehearsal removal to its own gateway", () => {
  expect(runTestAlert()).toBe(true);
  const causes = readCauses(null).filter((cause) => cause.test);
  for (const tag of ["HMI-F3", "PT-401"]) {
    const cause = causes.find(({ assetId }) => assetId === tag)!;
    const plan = planApproval(cause);
    if (plan?.kind !== "mitigation") throw Error("Missing review plan for " + tag);
    expect(plan.item.title).toMatch(/review/i);
    expect(plan.item.title).toContain(tag);
    expect(plan.item.effects.map(({ type }) => type)).toEqual(["note"]);
    expect(confirmApproval(plan, cause)).toEqual(plan);
    expect(applyApproval(plan)).toBe(true);
    expect(useTwinStore.getState().twin.assets.some(({ id }) => id === tag)).toBe(true);
  }
  const cause = causes.find(({ assetId }) => assetId === TEST_ASSET_ID)!;
  const plan = planApproval(cause);
  if (plan?.kind !== "mitigation") throw Error("Missing gateway plan");
  expect(plan.item.effects).toEqual([{ type: "remove_asset", assetId: TEST_ASSET_ID }]);
  expect(confirmApproval(plan, cause)).toEqual(plan);
  const store = useTwinStore.getState();
  const replacement = { ...store.twin.assets.find(({ id }) => id === "HMI-F3")!, id: TEST_ASSET_ID };
  store.addAsset(replacement);
  expect(confirmApproval(plan, cause)).toBeNull();
  expect(applyApproval(plan)).toBe(false);
  expect(useTwinStore.getState().twin.assets).toContain(replacement);
});

it("disables HMI service media through the shared twin and clears the finding", () => {
  const target = readCauses(null).find(({ assetId, ruleId }) => assetId === "HMI-F3" && ruleId === "USB-01");
  expect(target).toBeDefined();
  const plan = planApproval(target!);
  expect(plan && approvalTitle(plan)).toBe("Disable HMI service media");
  expect(plan && applyApproval(plan)).toBe(true);
  expect(useTwinStore.getState().mitigations.some(({ status }) => status === "applied")).toBe(true);
  expect(readCauses(null).some(({ key }) => key === target?.key)).toBe(false);
});
