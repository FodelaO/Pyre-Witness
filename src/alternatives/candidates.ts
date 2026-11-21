/** Derives model-independent variants and the closed set of Carbon-selectable effects. */
import { plantEconomics, type ThreePoint } from "@/econ/economics";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { Assessment, DeviceProfile } from "@/pipeline/types";
import type { Asset, MitigationEffect, RuleFinding, Twin } from "@/twin/types";
import type { CarbonCandidate, ChangeId } from "./schema";
import type { Candidate } from "./types";

type Change = { id: ChangeId; description: string; effect: MitigationEffect };

const laborCost = ([low, mode, high]: ThreePoint): ThreePoint => {
  const rate = plantEconomics.blendedResponseRate.value;
  return [low * rate, mode * rate, high * rate];
};

export function buildCandidates(twin: Twin, asset: Asset, profile: DeviceProfile, assessment: Assessment, findings: RuleFinding[]) {
  const ruleIds = new Set(findings.map(({ ruleId }) => ruleId));
  const assetId = asset.id;
  const kind = asset.physical.kind;
  const changes: Change[] = [];
  const rules: Candidate[] = [];
  function offer(id: ChangeId, description: string, effect: MitigationEffect) {
    changes.push({ id, description, effect });
    return effect;
  }
  function variant(name: string, rationale: string, effects: MitigationEffect[], hours: ThreePoint | null) {
    if (effects.length) rules.push({ name, rationale, kind, effects, source: "rules", cost: hours && laborCost(hours) });
  }

  if (ruleIds.has("RF-01")) {
    const wired = asset.physical.connections.some(({ medium, active }) => medium === "network" && active !== false)
      || profile.ports.some((port) => /\b(?:rj[ -]?45|ether[ -]?net|profi[ -]?net)\b/i.test(port));
    const effects = (asset.cyber?.radios ?? []).filter((radio) => radio !== "nfc").map((radio): MitigationEffect => {
      const effect = { type: "disable_radio", assetId, radio } as const;
      if (wired) offer(`disable_${radio}`, `Retain wired operation and turn off optional ${radio}.`, effect);
      return effect;
    });
    variant("Same device, radio off", "Disable exposed radios where a local or wired mode supports the job.",
      effects, wired ? [0.25, 0.5, 1] : null);
  }

  const recommended = findings.length ? atRecommendedPlacement(twin, asset, assessment, profile.object_class) : null;
  if (recommended && (recommended.physical.area !== asset.physical.area
    || recommended.network.area !== asset.network.area || recommended.network.level !== asset.network.level
    || recommended.network.conduit !== asset.network.conduit)) {
    const { area, x, y } = recommended.physical;
    const { level, area: networkArea, conduit } = recommended.network;
    const description = `Relocate to ${twin.areas.find((room) => room.id === area)?.name ?? area} (${networkArea}).`;
    const effect = { type: "move_asset", assetId, area, level, networkArea, conduit, x, y } as const;
    const changesProcessArea = area !== asset.physical.area && twin.areas.some((room) =>
      room.kind === "process" && (room.id === asset.physical.area || room.id === area));
    if (changesProcessArea) {
      variant("Architect placement", `${description} Confirm it still serves the same process.`, [effect], null);
    } else {
      offer("architect_placement", description, effect);
      variant("Architect placement", description, [effect], [1, 2, 4]);
    }
  }

  if (ruleIds.has("WASH-01") && profile.object_class !== "passive_object"
    && findings.some(({ ruleId, detail }) => ruleId === "WASH-01" && /water-jet|IP69/.test(detail))
    && !asset.protections?.includes("washdown-enclosure")) {
    const description = "Install a washdown-rated enclosure and verify hygienic suitability.";
    const effect = offer("washdown_enclosure", description, { type: "add_protection", assetId, protection: "washdown-enclosure" });
    variant("Washdown-rated enclosure", description, [effect], null);
  }

  const hardening: MitigationEffect[] = [];
  if (asset.cyber?.managed === false && (ruleIds.has("MGMT-01") || ruleIds.has("TRANS-01"))) {
    hardening.push(offer("managed", "Enroll the asset in plant inventory and patch management.", { type: "patch_cyber", assetId, patch: { managed: true } }));
  }
  if (asset.cyber?.defaultCredentials && ruleIds.has("CRED-01")) {
    hardening.push(offer("remove_defaults", "Replace vendor-default credentials.", { type: "patch_cyber", assetId, patch: { defaultCredentials: false } }));
  }
  variant("Managed and hardened", "Apply the flagged inventory and authentication controls.", hardening, [0.5, 1, 2]);

  if (asset.cyber?.cloudConnected && (ruleIds.has("ZONE-01") || ruleIds.has("CAM-01"))) {
    const description = "Use local processing where the product supports it.";
    const effect = offer("local_only", description, { type: "patch_cyber", assetId, patch: { cloudConnected: false } });
    variant("Local processing", description, [effect], null);
  }
  if (asset.cyber?.remoteAccess && ruleIds.has("ZONE-01")) {
    const description = "Disable optional remote maintenance.";
    const effect = offer("no_remote_access", description, { type: "patch_cyber", assetId, patch: { remoteAccess: false } });
    variant("Local maintenance", description, [effect], [0.25, 0.5, 1]);
  }
  if (asset.cyber && kind !== "usb_drive" && (ruleIds.has("USB-01") || ruleIds.has("PHYS-01"))
    && !asset.protections?.some((item) => item === "port-lock" || item === "locked-cabinet")) {
    const description = "Restrict physical access to unused ports.";
    const effect = offer("port_lock", description, { type: "add_protection", assetId, protection: "port-lock" });
    variant("Lock unused ports", description, [effect], null);
  }
  return { rules, changes };
}

export function mapCarbonCandidates(proposals: CarbonCandidate[], changes: Change[]): Candidate[] {
  const available = new Map(changes.map(({ id, effect }) => [id, effect]));
  return proposals.flatMap(({ name, kind, rationale, changes: ids, costDeltaUsd }) => {
    const effects = ids.map((id) => available.get(id));
    if (!effects.every((effect) => effect !== undefined)) return [];
    return [{ name, kind, rationale, effects, source: "carbon", cost: [costDeltaUsd.low, costDeltaUsd.mode, costDeltaUsd.high] }];
  });
}
