/** Verifies that the proof page's selected examples still resolve to the archived receipts. */
import { describe, expect, it } from "vitest";
import { readProofReport } from "./reportSource";
import { readExamples, readRunHistory } from "./runFiveEvidence";

describe("Run 5 proof evidence", () => {
  it("distinguishes actual placement revisions from an original-drop finding", async () => {
    const saved = await readProofReport("run-5");
    if (saved.state !== "ready") throw new Error("Saved Run 5 report unavailable");

    const examples = await readExamples(saved.report);
    expect(examples.map((example) => example && {
      id: example.id,
      rule: example.rule,
      revised: example.revised,
      forbidden: example.forbidden,
      baseline: example.baselinePlacement.physical_placement.area,
      system: example.systemPlacement.physical_placement.area,
    })).toEqual([
      { id: "photo-022", rule: "HAZ-01", revised: true, forbidden: false, baseline: "utilities", system: "packaging" },
      { id: "photo-012", rule: "USB-01", revised: true, forbidden: false, baseline: "packaging", system: "corporate_office" },
      { id: "photo-032", rule: "WASH-01", revised: false, forbidden: true, baseline: "filler3", system: "packaging" },
    ]);
  });

  it("reads all five saved system scores using all recorded attempts", async () => {
    const saved = await readProofReport("run-5");
    if (saved.state !== "ready") throw new Error("Saved Run 5 report unavailable");

    const history = await readRunHistory(saved.report);
    expect(history.map(({ metric }) => [metric?.numerator, metric?.n])).toEqual([
      [0, 119], [24, 124], [57, 124], [73, 124], [88, 124],
    ]);
  });
});
