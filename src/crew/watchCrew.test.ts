/** Checks that matched watch evidence maps to truthful floor and briefing cues. */
import { describe, expect, it } from "vitest";
import { SEED_TWIN } from "@/twin/seed";
import { watchCrewCues } from "./watchCrew";

const base = { runId: "watch-test", at: 123, target: { assetId: "PLC-F3", source: "CISA ICS" } };

describe("watch crew cues", () => {
  it("sends Scout to a matched asset and records the actual watch run", () => {
    const asset = SEED_TWIN.assets.find(({ id }) => id === base.target.assetId)!;
    expect(watchCrewCues({ ...base, type: "matched" }, SEED_TWIN)).toMatchObject([{
      activity: { crew: "scout", kind: "watch", runId: base.runId, at: 123, text: "Reads advisory · CISA ICS" },
      stops: [{ point: { x: asset.physical.x, y: asset.physical.y }, area: asset.physical.area, beside: true }],
      target: { ids: ["PLC-F3"] },
    }]);
  });

  it("uses the checked path, admitted title and brief for the actual handoff", () => {
    const cues = watchCrewCues({
      ...base, type: "reviewed", pathFound: true,
      proposal: { title: "Validate firmware update", engine: "watch resolution rules" }, brief: "PLC-F3 · resolution ready for approval.",
    }, SEED_TWIN);
    expect(cues).toMatchObject([
      { activity: { crew: "inspector", engine: "rules engine", text: "Rules engine: path to PLC-F3" }, stops: [{ beside: true }] },
      { activity: { crew: "architect", text: "Proposes: Validate firmware update" } },
      { activity: { crew: "chief", text: "PLC-F3 · resolution ready for approval." }, briefing: true },
    ]);
  });

  it("marks a drill as simulated and never claims a missing path or proposal", () => {
    const cues = watchCrewCues({ ...base, type: "reviewed", target: { ...base.target, drill: true },
      pathFound: false, brief: "PLC-F3 reviewed." }, SEED_TWIN);
    expect(cues.map(({ activity }) => activity.text)).toEqual([
      "Simulated drill · Rules engine: no modeled path to PLC-F3", "Simulated drill · PLC-F3 reviewed.",
    ]);
    expect(watchCrewCues({ ...base, type: "matched", target: { ...base.target, assetId: "removed" } }, SEED_TWIN)).toEqual([]);
  });
});
