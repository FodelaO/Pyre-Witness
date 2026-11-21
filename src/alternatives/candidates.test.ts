/** Checks radio shutdown against the captured PLC's actual connectivity requirements. */
import { expect, it } from "vitest";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import { officeAssessment, pressureProfile } from "@/pipeline/server/__fixtures__/placement";
import type { DeviceProfile } from "@/pipeline/types";
import { evaluateTwin } from "@/rules/engine";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { SEED_TWIN } from "@/twin/seed";
import { buildCandidates } from "./candidates";

it.each([
  { ports: ["RJ45 serial console (RS-232 only)"], claim: "Wi-Fi is the only plant network uplink.", offer: false },
  { ports: ["RJ45"], claim: "", offer: false },
  { ports: ["RS-485 (not Ethernet)"], claim: "", offer: false },
  { ports: ["Ethernet (maintenance only)"], claim: "", offer: false },
  { ports: ["Ethernet"], claim: "Wi-Fi is required for operation.", offer: false },
  { ports: ["Ethernet"], claim: "The plant uses Wi-Fi, which is required for operation.", offer: false },
  { ports: ["Ethernet"], claim: "The Ethernet jack is for maintenance only.", offer: false },
  { ports: ["Ethernet"], claim: "No radio is required for operation.", offer: true },
  { ports: ["PROFINET"], claim: "Plant telemetry requires wireless.", offer: false },
  { ports: ["Ethernet"], claim: "The Wi-Fi radio is not optional.", offer: false },
  { ports: ["PROFINET", "Maintenance-only Ethernet"], claim: "Wi-Fi is optional.", offer: true },
  { ports: ["EtherNet/IP", "RJ45 serial console"], claim: "Wi-Fi is optional.", offer: true },
])("CAP-01 requires a usable wired port and an optional radio ($ports, $claim)", ({ ports, claim, offer }) => {
  const profile: DeviceProfile = {
    ...pressureProfile, category: "controller", object_class: "networked_device", physical_kind: "plc_cabinet",
    device_type: "Wireless PLC", radios: ["wifi"], ports, evidence: [{ claim, source: "text", confidence: 1 }],
  };
  const asset = assetFromProfile(profile, SEED_TWIN, "PLC-901", DEFAULT_DROP);
  const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, asset] };
  const findings = evaluateTwin(twin).findings.filter(({ assetId }) => assetId === asset.id);
  const assessment = { ...officeAssessment, risks: [], mitigations: [], attack_paths: [] };
  const { rules, changes } = buildCandidates(twin, asset, profile, assessment, findings);
  const variant = rules.find(({ effects }) => effects.some(({ type }) => type === "disable_radio"));
  expect(!!variant).toBe(offer);
  expect(!!variant?.cost).toBe(offer);
  expect(changes.some(({ id }) => id === "disable_wifi")).toBe(offer);
});
