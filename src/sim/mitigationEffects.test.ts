/** Checks stable effect identity and proposal deduplication against the real CIP replay. */
import { describe, expect, it } from "vitest";
import { applyEffects } from "@/twin/effects";
import { SEED_TWIN } from "@/twin/seed";
import type { MitigationEffect } from "@/twin/types";
import { projectScenarioMitigations } from "./engine";
import { mitigationEffectKey } from "./mitigationEffects";

it("canonicalizes field order and commuting edits while retaining dependent edit order", () => {
  const patch: MitigationEffect = { type: "patch_cyber", assetId: "HMI-F3", patch: { remoteAccess: false, ports: [] } };
  const reordered: MitigationEffect = { patch: { ports: [], remoteAccess: false }, assetId: "HMI-F3", type: "patch_cyber" };
  const boundary: MitigationEffect = { type: "enforce_conduit", conduitId: "C-F3-PACK", enforcedBy: "SW-F3", allows: [] };
  expect(mitigationEffectKey([patch, boundary])).toBe(mitigationEffectKey([boundary, reordered]));

  const restore: MitigationEffect = { type: "patch_cyber", assetId: "HMI-F3", patch: { remoteAccess: true } };
  expect(mitigationEffectKey([patch, restore])).not.toBe(mitigationEffectKey([restore, patch]));
  const remove: MitigationEffect = { type: "remove_asset", assetId: "SW-F3" };
  expect(mitigationEffectKey([remove, boundary])).not.toBe(mitigationEffectKey([boundary, remove]));
});

describe("mitigation projection equivalence", () => {
  function enforceFillerPackBridge(allows: string[]) {
    return applyEffects(SEED_TWIN, [{ type: "enforce_conduit", conduitId: "C-F3-PACK", enforcedBy: "SW-F3", allows }]);
  }

  it("keeps one modeled hardware port guard and drops disconnecting an already denied bridge", () => {
    const proposals = projectScenarioMitigations("cip", enforceFillerPackBridge([]));
    const ids = proposals.map(({ id }) => id);
    expect(ids).toContain("sim-cip-port-lock");
    expect(ids).not.toContain("sim-cip-locked-cabinet");
    expect(ids).not.toContain("sim-cip-physical-ingress");
    expect(ids).toContain("sim-cip-port");
    expect(proposals.every(({ simulationScenario }) => simulationScenario === "cip")).toBe(true);
  });

  it("keeps a physical bundle that would remove a documented allowed flow", () => {
    const proposals = projectScenarioMitigations("cip", enforceFillerPackBridge(["Documented transfer"]));
    const ids = proposals.map(({ id }) => id);
    expect(ids).toContain("sim-cip-port-lock");
    expect(ids).toContain("sim-cip-physical-ingress");
  });

  it("retains distinct physical and software isolation despite the same containment time", () => {
    const proposals = projectScenarioMitigations("cip", SEED_TWIN);
    const physical = proposals.find(({ id }) => id === "sim-cip-physical-ingress");
    const software = proposals.find(({ id }) => id === "sim-cip-controller");
    expect(physical).toMatchObject({ kind: "physical", title: "Lock HMI port and disconnect cell bridge" });
    expect(software).toMatchObject({ kind: "software", title: "Enforce cell boundary and disable HMI service media" });
    expect(physical?.simulationContainment.after).toBe(software?.simulationContainment.after);
    expect(physical?.riskDelta).not.toBe(software?.riskDelta);
  });
});
