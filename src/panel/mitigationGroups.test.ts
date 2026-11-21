/** Locks the source ordering and actual-benefit readout of the approval queue. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { projectScenarioMitigations } from "@/sim/engine";
import { SEED_TWIN } from "@/twin/seed";
import type { Mitigation } from "@/twin/types";
import { MitigationQueue } from "./MitigationQueue";
import { groupMitigations } from "./mitigationGroups";

const capture: Mitigation = {
  id: "capture-1:mitigation:1",
  title: "Review mounting",
  description: "",
  kind: "procedural",
  proposedBy: "architect",
  status: "proposed",
  targets: ["CAM-901"],
  effects: [{ type: "note", text: "Review mounting" }],
};

it("puts the visible simulation first while preserving the original source order without an outcome", () => {
  const cip = projectScenarioMitigations("cip", SEED_TWIN)[0];
  const ammonia = projectScenarioMitigations("ammonia", SEED_TWIN)[0];
  const rows = [capture, ammonia, cip].map((item) => ({ item }));
  const reference = { runId: "capture-1", placedAssetId: "CAM-901" };
  expect(groupMitigations(rows, SEED_TWIN, "cip", reference).map(({ label }) => label))
    .toEqual(["Simulation · CIP Crossover", "Capture · CAM-901", "Simulation · Ammonia Release"]);
  expect(groupMitigations(rows, SEED_TWIN, undefined, reference).map(({ label }) => label))
    .toEqual(["Capture · CAM-901", "Simulation · Ammonia Release", "Simulation · CIP Crossover"]);
});

it("shows the real CIP containment-time improvement and omits the zero risk delta", () => {
  const isolation = projectScenarioMitigations("cip", SEED_TWIN).find(({ id }) => id === "sim-cip-isolate")!;
  expect(isolation.riskDelta).toBe(0);
  const markup = renderToStaticMarkup(createElement(MitigationQueue, { items: [isolation] }));
  expect(markup).toContain("Simulation · CIP Crossover");
  expect(markup).toContain("6 s earlier");
  expect(markup).not.toContain("pts projected");
});
