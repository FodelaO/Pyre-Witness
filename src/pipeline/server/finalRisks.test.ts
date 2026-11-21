/** Checks risk provenance, overlap, ranking and passive-object boundaries. */
import { expect, it } from "vitest";
import { assetFromProfile, resolveDropPoint } from "@/pipeline/assetFromProfile";
import type { Assessment, DeviceProfile, RiskItem, SelfCheckResult } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import type { RuleFinding } from "@/twin/types";
import { officeAssessment, pressureProfile } from "./__fixtures__/placement";
import { completeAssessmentRisks } from "./finalRisks";

const assessment: Assessment = { ...officeAssessment, risks: [], attack_paths: [], mitigations: [] };
const placedId = "DEVICE-901";
const check: SelfCheckResult = { passed: false, findings: [], paths: [], disagreements: [], revised: true };
const rfTechnique = { id: "T0860", name: "Wrong fixture name" };

function candidate(profile: DeviceProfile) {
  return assetFromProfile(profile, SEED_TWIN, placedId, resolveDropPoint(SEED_TWIN));
}

function finding(ruleId: string, values: Partial<RuleFinding> = {}): RuleFinding {
  return {
    ruleId, kind: "physical", title: `${ruleId} title`, detail: `${ruleId} detail`,
    severity: 4, references: [], assetId: placedId, ...values,
  };
}

it("includes Architect, checked-placement and uncovered profile risks with source labels", () => {
  const profile: DeviceProfile = {
    ...pressureProfile, physical_kind: "laptop", object_class: "networked_device", device_type: "Laptop with a webcam and microphone",
    radios: ["wifi"], ports: ["USB3.0", "SD card slot"], storage: "removable SD storage",
    default_credentials_visible: true, default_credentials_note: "fixture-secret", cloud_connectivity: true,
  };
  const architect: RiskItem = {
    id: "carbon-risk", kind: "cyber", title: "Unauthorized login", description: "CRED-01 applies.", mitigation: "Use plant credentials.",
    severity: 3, likelihood: 2, technique: null,
  };
  const rf = finding("RF-01", { title: "Radio in range", kind: "cyber", technique: rfTechnique, fix: "Isolate wireless links." });
  const cred = finding("CRED-01", { kind: "cyber", severity: 3 });
  const port = finding("PHYS-01", { title: "Exposed ports near visitor access", severity: 2 });
  const minor = finding("WASH-01", { severity: 1 });
  const result = completeAssessmentRisks({ ...assessment, risks: [architect] }, profile, candidate(profile), {
    ...check, findings: [rf, cred, rf, port, minor],
  });
  expect(result.risks[0]).toMatchObject({
    id: `RULE-RF-01:${placedId}:1`, title: rf.title, technique: { id: "T0860", name: "Wireless Compromise" },
    description: expect.stringContaining("Rules-engine finding"), mitigation: rf.fix,
  });
  expect(result.risks.map(({ id }) => id)).toEqual(expect.arrayContaining([
    architect.id, `PROFILE-REMOVABLE-STORAGE:${placedId}`, `PROFILE-CLOUD:${placedId}`,
    `PROFILE-RECORDING:${placedId}`, `PROFILE-UNMANAGED-PERSONAL:${placedId}`, `RULE-PHYS-01:${placedId}:4`,
  ]));
  expect(result.risks).toHaveLength(7);
  expect(result.risks.find(({ id }) => id.startsWith("PROFILE-RECORDING"))).toMatchObject({
    title: "Camera and microphone privacy exposure", description: expect.stringMatching(/^From device profile\./),
  });
  expect(JSON.stringify(result)).not.toContain("fixture-secret");
  expect(result.placement).toBe(assessment.placement);
});

it("deduplicates a finding against an Architect technique and a feature already described in prose", () => {
  const profile: DeviceProfile = { ...pressureProfile, object_class: "networked_device", radios: ["wifi"], cloud_connectivity: true };
  const wirelessAndCloud: RiskItem = {
    id: "carbon-risk", kind: "cyber", title: "Wireless isolation and cloud disclosure", description: "Segregate transient network equipment.",
    mitigation: "Use approved networks and disable cloud services.", severity: 4, likelihood: 2, technique: rfTechnique,
  };
  const result = completeAssessmentRisks({ ...assessment, risks: [wirelessAndCloud] }, profile, candidate(profile), {
    ...check, findings: [finding("RF-01", { kind: "cyber", technique: rfTechnique })],
  });
  expect(result.risks).toEqual([wirelessAndCloud]);
});

it("keeps the authoritative blocking severity and evidence when it merges with a lower model risk", () => {
  const profile: DeviceProfile = { ...pressureProfile, object_class: "networked_device", radios: ["wifi"] };
  const model: RiskItem = {
    id: "carbon-risk", kind: "cyber", title: "Wireless isolation", description: "Separate this device.",
    mitigation: "Use an approved network.", severity: 2, likelihood: 2, technique: rfTechnique,
  };
  const blocked = finding("RF-01", { kind: "cyber", technique: rfTechnique, fix: "Leave the radio disabled." });
  const result = completeAssessmentRisks({ ...assessment, risks: [model] }, profile, candidate(profile), {
    ...check, findings: [blocked],
  });
  expect(result.risks).toMatchObject([{
    id: `RULE-RF-01:${placedId}:1`, severity: 4, title: blocked.title, mitigation: blocked.fix,
    description: expect.stringContaining("RF-01 detail\nArchitect context: Wireless isolation."),
  }]);
});

it("preserves observed recording capability when an existing risk only makes an implicit technique match", () => {
  const profile: DeviceProfile = { ...pressureProfile, device_type: "Network camera", physical_kind: "ip_camera" };
  const risk: RiskItem = {
    id: "carbon-risk", kind: "cyber", title: "Operator panel observation", description: "Displays may reveal operational information.",
    mitigation: "Use an approved mounting point.", severity: 3, likelihood: 2,
    technique: { id: "T0882", name: "Theft of Operational Information" },
  };
  const result = completeAssessmentRisks({ ...assessment, risks: [risk] }, profile, candidate(profile), check);
  expect(result.risks).toMatchObject([{ id: risk.id, description: expect.stringContaining("From device profile. Camera capability") }]);
});

it("does not mistake a device label in a physical concern for wireless risk coverage", () => {
  const profile: DeviceProfile = { ...pressureProfile, radios: ["wifi"] };
  const risk: RiskItem = {
    id: "enclosure", kind: "physical", title: "Wi-Fi device housing", description: "Water can enter through the seams.",
    mitigation: "Keep the device dry.", severity: 3, likelihood: 2, technique: null,
  };
  const result = completeAssessmentRisks({ ...assessment, risks: [risk] }, profile, candidate(profile), check);
  expect(result.risks.map(({ id }) => id)).toEqual([`PROFILE-WIRELESS:${placedId}`, risk.id]);
});

it("distinguishes ordinary data connectors from removable media, pipe fittings, and power-only inputs", () => {
  const profile: DeviceProfile = {
    ...pressureProfile, device_type: "Camera mount", ports: ["USB-C charging only", "2-inch threaded pipe", "RJ45"],
    storage: "Internal storage without removable media", cloud_connectivity: null,
    evidence: [{ claim: "No microphone visible", confidence: 0.9, source: "shape" }],
  };
  const all = completeAssessmentRisks(assessment, profile, candidate(profile), check);
  expect(all.risks.map(({ id }) => id)).toEqual([`PROFILE-PHYSICAL-DATA-PORT:${placedId}`]);
  const powerOnly = { ...profile, ports: profile.ports.slice(0, 2) };
  expect(completeAssessmentRisks(assessment, powerOnly, candidate(powerOnly), check).risks).toEqual([]);
});

it.each([
  { storage: "Internal storage without removable media", ports: [], present: false },
  { storage: "Non-removable flash", ports: [], present: false },
  { storage: "no SD slot", ports: [], present: false },
  { storage: "Non-removable flash with a microSD slot", ports: [], present: true },
  { storage: "Non-removable flash", ports: ["SD card slot"], present: true },
])("CAP-05 enriches only documented removable media ($storage, $ports)", ({ storage, ports, present }) => {
  const profile = { ...pressureProfile, storage, ports };
  const result = completeAssessmentRisks(assessment, profile, candidate(profile), check);
  expect(result.risks.some(({ id }) => id.startsWith("PROFILE-REMOVABLE-STORAGE:"))).toBe(present);
});

it("reports a USB flash drive plug and a card slot as removable media without inventing a host port", () => {
  const profile: DeviceProfile = {
    ...pressureProfile, physical_kind: "usb_drive", category: "removable_storage", device_type: "USB flash storage",
    ports: ["USB-A", "microSD card slot"],
  };
  expect(completeAssessmentRisks(assessment, profile, candidate(profile), check).risks.map(({ id }) => id))
    .toEqual([`PROFILE-REMOVABLE-STORAGE:${placedId}`]);
});

it("keeps passive coverage physical even when other inputs contain cyber claims", () => {
  const profile: DeviceProfile = {
    ...pressureProfile, object_class: "passive_object", device_type: "Mug", radios: ["wifi"], cloud_connectivity: true,
  };
  const results = completeAssessmentRisks({ ...assessment, risks: [{
    id: "invented", kind: "cyber", title: "Wireless", description: "", mitigation: "", severity: 5, likelihood: 3, technique: rfTechnique,
  }] }, profile, candidate(profile), { ...check, findings: [
    finding("RF-01", { kind: "cyber", technique: rfTechnique }), finding("FOOD-02", { technique: rfTechnique }),
  ] });
  expect(results.risks).toMatchObject([{ id: `RULE-FOOD-02:${placedId}:2`, kind: "physical", technique: null }]);
});

it("caps low-severity clutter while retaining blockers and observed features", () => {
  const profile: DeviceProfile = { ...pressureProfile, radios: ["wifi"] };
  const clutter = Array.from({ length: 20 }, (_, i) => finding("PLACE-01", { detail: `Condition ${i}`, severity: 2 }));
  const result = completeAssessmentRisks(assessment, profile, candidate(profile), {
    ...check, findings: [...clutter, finding("HAZ-01", { severity: 5 })],
  });
  expect(result.risks).toHaveLength(16);
  expect(result.risks.slice(0, 2).map(({ id }) => id)).toEqual([`RULE-HAZ-01:${placedId}:21`, `PROFILE-WIRELESS:${placedId}`]);
});

it("keeps the most severe risk when it is last among 20 merged risks", () => {
  const findings = Array.from({ length: 20 }, (_, index) =>
    finding("PLACE-01", { detail: `Condition ${index + 1}`, severity: index === 19 ? 3 : 2 }));
  const result = completeAssessmentRisks(assessment, pressureProfile, candidate(pressureProfile), { ...check, findings });

  expect(result.risks).toHaveLength(16);
  expect(result.risks[0]).toMatchObject({ id: `RULE-PLACE-01:${placedId}:20`, severity: 3 });
});
