/** Verifies ranked plant projections and the approval paths against the live stores. */
import { beforeEach, expect, it } from "vitest";
import { plantExposure } from "@/econ/model";
import { useRunStore } from "@/pipeline/runStore";
import type { Assessment, SelfCheckResult } from "@/pipeline/types";
import { replaceSimulationProposals } from "@/sim/mitigationQueue";
import type { SimulationMitigation } from "@/sim/types";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import { useTwinStore } from "@/twin/store";
import type { Mitigation } from "@/twin/types";
import { checkedCapture } from "./captureProposal";
import { buildTodos, todoTitle } from "./todos";

const store = useTwinStore.getState;
const run = useRunStore.getState;

function pendingTodos() {
  const { twin, mitigations } = store();
  return buildTodos(twin, mitigations, checkedCapture(run()));
}

function proposal(id: string, effects: Mitigation["effects"], proposedBy = "inspector"): Mitigation {
  return {
    id, title: "Test proposal with extra words", description: "Test fixture", kind: "software",
    effects, targets: [], status: "proposed", proposedBy, riskDelta: -99,
  };
}

function credentialControl(assetId: string, defaultCredentials: boolean): Mitigation["effects"][number] {
  return { type: "patch_cyber", assetId, patch: { defaultCredentials } };
}

beforeEach(() => {
  store().reset();
  run().reset();
});

it("ranks by signed risk change, then annual loss change, and ignores supplied deltas", () => {
  const assetIds = ["RO-101", "P-102"];
  store().setTwin(applyEffects(SEED_TWIN, assetIds.map((id) => credentialControl(id, true))));
  store().proposeMitigations([
    ...assetIds.map((id) => proposal(id, [credentialControl(id, false)])),
    proposal("note", [{ type: "note", text: "Review maintenance schedule" }]),
  ]);
  const rows = pendingTodos();
  expect(rows[0].predicted.riskDelta).toBeLessThan(-10);
  const tied = rows.filter(({ id }) => assetIds.includes(id));
  expect(tied).toHaveLength(2);
  expect(tied[0].predicted.riskDelta).toBe(tied[1].predicted.riskDelta);
  expect(tied[0].predicted.lossDeltaPerYear).toBeLessThan(tied[1].predicted.lossDeltaPerYear);
  expect(tied[0].title).toBe("Test proposal with extra");
  expect(rows.at(-1)).toMatchObject({ id: "note", kind: "advisory", predicted: { riskDelta: 0, lossDeltaPerYear: 0 } });
});

it("admits the current simulation queue and pending watch proposals once", () => {
  const sim: SimulationMitigation = {
    ...proposal("sim", [{ type: "add_protection", assetId: "HMI-F3", protection: "port-lock" }]),
    simulationScenario: "cip", simulationContainment: { before: null, after: 5, safeguard: "port-lock" },
  };
  replaceSimulationProposals([sim]);
  store().proposeMitigations([
    proposal("watch", [{ type: "note", text: "Review advisory evidence" }], "threat-watch"),
    proposal("rejected", [{ type: "note", text: "Discarded" }]),
  ]);
  store().decideMitigation("rejected", "rejected");
  const rows = pendingTodos();
  expect(rows[0]).toMatchObject({ id: "watch", description: "From threat watch · Test fixture", predicted: { riskDelta: 0 } });
  expect(rows.filter(({ source }) => source === "simulation")).toMatchObject([{ id: "sim" }]);
  expect(rows.filter(({ source }) => source === "watch")).toMatchObject([{ id: "watch" }]);
  expect(rows.some(({ id }) => id === "rejected")).toBe(false);
  expect(rows.filter(({ title }) => title === "Lock exposed ports")).toHaveLength(0);
  expect(rows.find(({ id }) => id === "sim")?.apply()).toBe(true);
  expect(store().mitigations.find(({ id }) => id === "sim")?.status).toBe("applied");
  expect(pendingTodos().some(({ id }) => id === "sim")).toBe(false);
});

it("applies a seed-plant control worth at least ten points and matches both predictions", () => {
  const before = store();
  const beforeLoss = plantExposure(before.twin, before.risk).totalAnnualised;
  const [best, next] = pendingTodos();
  expect(best.source).toBe("rules");
  expect(best.predicted.riskDelta).toBeLessThanOrEqual(-10);
  expect(store().twin).toBe(before.twin);
  expect(best.apply()).toBe(true);
  const after = store();
  expect(after.risk.score - before.risk.score).toBe(best.predicted.riskDelta);
  expect(plantExposure(after.twin, after.risk).totalAnnualised - beforeLoss).toBe(best.predicted.lossDeltaPerYear);
  expect(after.mitigations.find(({ id }) => id === best.id)?.status).toBe("applied");
  expect(best.apply()).toBe(false);
  expect(next.apply()).toBe(false);
});

it("projects a checked capture move with its wiring change and removes it after approval", () => {
  const hmi = SEED_TWIN.assets.find(({ id }) => id === "HMI-F3")!;
  const captured = { ...hmi, id: "TEST-CAPTURE", origin: "added" as const };
  store().addAsset(captured);
  const assessment: Assessment = {
    placement: { level: 4, network_area: "Corporate office", conduit: null, why: "Office use" },
    physical_placement: {
      area: "corporate_office", near_asset_id: null, position_hint: "", connections: [], physical_constraints: [],
    },
    never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 1,
  };
  const check: SelfCheckResult = { passed: true, findings: [], paths: [], disagreements: [], revised: false };
  const base = { runId: "todo-test", at: 0 };
  run().ingest({ ...base, type: "run.started", input: { kind: "text", label: "Test capture" }, dropPoint: null });
  run().setPlacedAsset(captured.id);
  run().ingest({ ...base, type: "selfcheck.done", phase: "as-dropped", latencyMs: 0, result: check });
  run().ingest({ ...base, type: "reasoning.done", model: "test fixture", latencyMs: 0, assessment });
  expect(pendingTodos().find(({ kind }) => kind === "move")).toBeUndefined();
  run().ingest({ ...base, type: "selfcheck.done", phase: "recommendation", latencyMs: 0, result: check });
  run().ingest({ ...base, type: "run.completed", totalMs: 0 });

  const before = store();
  const move = pendingTodos().find(({ kind }) => kind === "move");
  expect(move).toMatchObject({ source: "capture", title: "Move there" });
  expect(move?.apply()).toBe(true);
  const after = store();
  expect(after.risk.score - before.risk.score).toBe(move?.predicted.riskDelta);
  expect(plantExposure(after.twin, after.risk).totalAnnualised - plantExposure(before.twin, before.risk).totalAnnualised)
    .toBe(move?.predicted.lossDeltaPerYear);
  expect(after.twin.assets.find(({ id }) => id === captured.id)).toMatchObject({
    physical: { area: "corporate_office", connections: [] }, placement: "recommended",
  });
  expect(pendingTodos().find(({ kind }) => kind === "move")).toBeUndefined();
});

it("keeps To-do titles to four words without a dangling connector", () => {
  expect(todoTitle("Verify FW-DMZ PAN-OS for CVE-2026-1")).toBe("Verify FW-DMZ PAN-OS");
  expect(todoTitle("Lock exposed ports")).toBe("Lock exposed ports");
  expect(todoTitle("  ")).toBe("Review proposal");
});
