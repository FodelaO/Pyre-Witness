/** Checks that a phone approval can apply a real, resolving control to the seed twin. */
import { afterEach, expect, it } from "vitest";
import { useTwinStore } from "@/twin/store";
import { readCauses } from "./evidence";
import { applyApproval, approvalTitle, planApproval } from "./recommendation";

afterEach(() => useTwinStore.getState().reset());

it("disables HMI service media through the shared twin and clears the finding", () => {
  const target = readCauses(null).find(({ assetId, ruleId }) => assetId === "HMI-F3" && ruleId === "USB-01");
  expect(target).toBeDefined();
  const plan = planApproval(target!);
  expect(plan && approvalTitle(plan)).toBe("Disable HMI service media");
  expect(plan && applyApproval(plan)).toBe(true);
  expect(useTwinStore.getState().mitigations.some(({ status }) => status === "applied")).toBe(true);
  expect(readCauses(null).some(({ key }) => key === target?.key)).toBe(false);
});
