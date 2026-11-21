/** Verifies explicit approval, risk refresh and real Scout feed activity. */
import { afterEach, describe, expect, it } from "vitest";
import { useFeedStore } from "@/crew/feedStore";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import { useModelerStore } from "./modelerStore";
import { checkProposal } from "./reconcile";
import type { ModelProposal, ObservedItem } from "./types";

const existing = SEED_TWIN.assets.find(({ id }) => id === "P-101")!;
const pump: ObservedItem = {
  id: "item-1", tag: "P-901", label: "New pump", kind: "pump", area_guess: "water_treatment",
  object_class: "process_equipment", connects_to: [], evidence: [{ locator: "Line 2", detail: "P-901" }], confidence: 0.9,
};
const match: ObservedItem = { ...pump, id: "item-2", tag: existing.id, label: existing.name };

function loadProposal() {
  const proposal: ModelProposal = {
    ...checkProposal({ twin: SEED_TWIN, reservedIds: new Set() }, [pump, match], [
      { item_id: pump.id, action: "new_asset", area: "water_treatment", level: 0, network_zone: "Cell Water" },
      { item_id: match.id, action: "match_existing", asset_id: existing.id },
    ], "test"),
    source: { kind: "inventory", files: ["fixture.csv"], bytes: 1 },
    timings: { uploadMs: 0, gateMs: 0, extractionMs: 0, reconciliationMs: 0, validationMs: 0, totalMs: 0 },
    models: { gate: "", extraction: "", reconciliation: "" },
  };
  useModelerStore.setState({ proposal, phase: "review" });
  return useModelerStore.getState();
}

afterEach(() => {
  useModelerStore.getState().preview(null);
  useModelerStore.setState(useModelerStore.getInitialState());
  useTwinStore.getState().reset();
  useFeedStore.setState({ entries: [] });
});

describe("review approvals", () => {
  it("keeps pending and rejected assets out, then applies an accepted asset exactly once", () => {
    const { vote, applyAccepted } = loadProposal();
    const first = useTwinStore.getState();
    expect(first.twin.assets.some(({ id }) => id === pump.tag)).toBe(false);
    vote(pump.id, "reject");
    applyAccepted();
    expect(useTwinStore.getState().twin).toBe(first.twin);
    vote(pump.id, "accept");
    expect(useTwinStore.getState().twin).toBe(first.twin);
    applyAccepted();
    const applied = useTwinStore.getState();
    expect(applied.twin.assets.filter(({ id }) => id === pump.tag)).toHaveLength(1);
    expect(applied.risk).not.toBe(first.risk);
    expect(useModelerStore.getState().votes[pump.id]).toBe("applied");
    expect(useFeedStore.getState().entries[0]).toMatchObject({ crew: "scout", kind: "pipeline", text: "Modeler review applied · 1 added" });
    applyAccepted();
    expect(useTwinStore.getState().twin).toBe(applied.twin);
    expect(useFeedStore.getState().entries).toHaveLength(1);
  });

  it("highlights a match and restores the earlier highlight on leaving", () => {
    const { preview } = loadProposal();
    useTwinStore.getState().setHighlight(["TK-101"]);
    preview(match.id);
    expect(useTwinStore.getState().highlightIds).toEqual(["P-101"]);
    preview(null);
    expect(useTwinStore.getState().highlightIds).toEqual(["TK-101"]);
  });
});
