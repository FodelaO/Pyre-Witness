/** Derives defensive controls from current rules-engine evidence. */
import { compareText, createContext } from "@/rules/context";
import { hasHardwiredSafetyInterlock, hasPhysicalPortProtection } from "@/rules/protections";
import type { Mitigation, MitigationEffect, RiskReport, Twin } from "@/twin/types";

export function ruleProposals(twin: Twin, risk: RiskReport): Mitigation[] {
  const context = createContext(twin);
  const findingsByAsset = new Map<string, Set<string>>();
  for (const { assetId, ruleId } of risk.findings) {
    const rules = findingsByAsset.get(assetId) ?? new Set<string>();
    rules.add(ruleId);
    findingsByAsset.set(assetId, rules);
  }

  const proposals: Mitigation[] = [];
  function add(key: string, title: string, description: string, targets: string[], effects: MitigationEffect[]) {
    proposals.push({
      id: `todo:rules:${key}`, title, description, targets, effects, proposedBy: "rules engine", status: "proposed",
      kind: effects.some(({ type }) => type === "add_protection") ? "physical" : "software",
    });
  }

  for (const [assetId, rules] of findingsByAsset) {
    const asset = context.assetById.get(assetId);
    if (!asset) continue;
    const effects: MitigationEffect[] = [];
    if (rules.has("RF-01")) {
      for (const radio of new Set(asset.cyber?.radios)) {
        if (radio !== "nfc") effects.push({ type: "disable_radio", assetId, radio });
      }
    }
    if (rules.has("ZONE-01")) {
      effects.push({ type: "patch_cyber", assetId, patch: { cloudConnected: false, remoteAccess: false } });
    }
    if (effects.length) {
      const title = rules.has("ZONE-01") ? "Close external access" : "Disable exposed radios";
      const controls = [
        rules.has("RF-01") && "disable exposed radios",
        rules.has("ZONE-01") && "disable direct cloud and remote access",
      ].filter(Boolean).join(" and ");
      add(`external:${assetId}`, title, `On ${assetId}, ${controls}.`, [assetId], effects);
    }
    if ((rules.has("USB-01") || rules.has("PHYS-01")) && !hasPhysicalPortProtection(asset)
      && asset.physical.kind !== "usb_drive") {
      add(`ports:${assetId}`, "Lock exposed ports", `Fit a port lock on ${assetId}.`, [assetId], [
        { type: "add_protection", assetId, protection: "port-lock" },
      ]);
    }
    if (rules.has("CRED-01")) {
      add(`credentials:${assetId}`, "Replace default credentials", `Replace vendor default credentials on ${assetId}.`, [assetId], [
        { type: "patch_cyber", assetId, patch: { defaultCredentials: false } },
      ]);
    }
    if (rules.has("MGMT-01") || rules.has("TRANS-01")) {
      add(`management:${assetId}`, "Enroll in OT management", `Enroll ${assetId} in plant asset management.`, [assetId], [
        { type: "patch_cyber", assetId, patch: { managed: true } },
      ]);
    }
  }

  const pathConduits = new Set<string>();
  const exposedValves = new Set<string>();
  for (const path of risk.paths) {
    for (const step of path.steps) {
      const from = context.assetById.get(step.from);
      const to = context.assetById.get(step.to);
      if (!to) continue;
      if (step.via === "network" && from) {
        for (const conduit of context.crossingConduits(from, to)) pathConduits.add(conduit.id);
      }
      if (to.safetyCritical && to.physical.kind === "valve" && !hasHardwiredSafetyInterlock(to)) {
        exposedValves.add(to.id);
      }
    }
  }
  for (const assetId of exposedValves) {
    add(`interlock:${assetId}`, "Add hardwired interlock", `Install an independent hardwired interlock on ${assetId}.`, [assetId], [
      { type: "add_protection", assetId, protection: "hardwired-interlock" },
    ]);
  }

  for (const conduit of twin.conduits) {
    if (context.isEnforced(conduit) || conduit.from === conduit.to) continue;
    const endpoints = [...(context.zoneAssets.get(conduit.from) ?? []), ...(context.zoneAssets.get(conduit.to) ?? [])];
    const findings = endpoints.filter(({ id }) => findingsByAsset.get(id)?.has("ZONE-02"));
    if (!pathConduits.has(conduit.id) && findings.length === 0) continue;
    const enforcer = endpoints.filter(({ physical, status }) =>
      status !== "offline" && (physical.kind === "firewall" || physical.kind === "network_switch"))
      .sort((a, b) => Number(b.network.conduit === conduit.id) - Number(a.network.conduit === conduit.id)
        || compareText(a.id, b.id))[0];
    if (!enforcer) continue;
    add(`conduit:${conduit.id}`, "Enforce network boundary", `Deny interzone traffic across ${conduit.name} using ${enforcer.id}.`,
      [conduit.id, enforcer.id, ...findings.map(({ id }) => id)], [
        { type: "enforce_conduit", conduitId: conduit.id, enforcedBy: enforcer.id, allows: [] },
      ]);
  }
  return proposals;
}
