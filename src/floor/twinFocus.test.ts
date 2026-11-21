/** Covers linked device, entry point and overlapping physical area highlights. */
import { describe, expect, it } from "vitest";
import { SEED_TWIN } from "@/twin/seed";
import { projectTwinFocus } from "./twinFocus";

describe("shared twin focus", () => {
  it("retains explicit highlights alongside hover and reveals members of a selected overlay", () => {
    const focus = projectTwinFocus(SEED_TWIN, "washdown", "P-101", ["FW-DMZ", "internet", "nh3_hazard"]);
    expect(focus.focusedAreas.map(({ id }) => id)).toEqual(["nh3_hazard", "washdown"]);
    for (const id of ["FW-DMZ", "internet", "nh3_hazard", "P-101", "FIL-3", "CV-302"]) {
      expect(focus.highlighted.has(id)).toBe(true);
    }
    expect(focus.direct.has("FIL-3")).toBe(false);
    expect(focus.highlighted.has("C-1")).toBe(false);
  });
});
