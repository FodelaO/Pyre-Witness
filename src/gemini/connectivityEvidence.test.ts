/** Verifies connectivity inference with offline device evidence fixtures. */
import { expect, it } from "vitest";
import type { DeviceProfile, Evidence } from "@/pipeline/types";
import { enrichConnectivity } from "./connectivityEvidence";

const evidence = (claim: string, source: Evidence["source"] = "spec_sheet", confidence = 0.95): Evidence =>
  ({ claim, source, confidence });

function profile(overrides: Partial<DeviceProfile> = {}): DeviceProfile {
  return {
    device_type: "Field device", category: "instrument", object_class: "electrical_equipment",
    vendor: null, model: null, radios: [], ports: [], storage: null,
    default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: null,
    power: null, physical_kind: "instrument", capacity_or_size: null, material: null,
    food_grade: null, hazardous_area_rating: null, ip_rating: null, evidence: [], unknowns: [],
    confidence: 0.95, ...overrides,
  };
}

it.each([
  ["Screen shows a Wi‑Fi logo", "screen", "wifi"],
  ["Specs list 802.11ax", "spec_sheet", "wifi"],
  ["Bluetooth pairing button", "shape", "bluetooth"],
  ["Supports Bluetooth Low Energy; enabled state unknown", "text", "bluetooth"],
  ["LTE antenna marked on the module", "label", "cellular"],
  ["Nano-SIM card slot", "port", "cellular"],
  ["Integrated Zigbee module", "spec_sheet", "zigbee"],
  ["Specs include a LoRaWAN transceiver", "spec_sheet", "lora"],
  ["NFC pairing icon on the housing", "label", "nfc"],
] as const)("recovers the named radio from %s", (claim, source, radio) => {
  expect(enrichConnectivity(profile({ evidence: [evidence(claim, source)] })).radios).toEqual([radio]);
});

it("recognizes a physical SIM tray in the ports field", () => {
  expect(enrichConnectivity(profile({ ports: ["Nano-SIM tray", "microSD card slot"] })).radios).toEqual(["cellular"]);
  expect(enrichConnectivity(profile({ ports: ["Nano-SIM tray unconfirmed"] })).radios).toEqual([]);
  expect(enrichConnectivity(profile({ ports: ["Memory card slot", "SMA antenna connector"] })).radios).toEqual([]);
});

it.each([
  "Two 2.4 GHz antennas on the housing",
  "May support cellular",
  "Bluetooth capability unknown",
  "Does not support Wi-Fi or Bluetooth",
  "Wi-Fi is enabled by an optional adapter",
  "Specs list Bluetooth on some variants",
  "Nearby router has a Wi-Fi logo",
  "Connects to the network through a gateway with LoRaWAN",
])("leaves radio capability unknown for %s", (claim) => {
  expect(enrichConnectivity(profile({ evidence: [evidence(claim)] })).radios).toEqual([]);
});

it("merges supported radios while ignoring speculation and conflicting evidence", () => {
  const original = profile({
    radios: ["nfc"],
    evidence: [
      evidence("NFC icon next to the Bluetooth pairing button; built-in Wi-Fi, no LoRaWAN"),
      evidence("Label lists Zigbee support"),
      evidence("The captured model has no Zigbee support"),
      evidence("LTE modem", "shape", 0.55),
    ],
    unknowns: ["May have an LTE modem"],
  });
  const enriched = enrichConnectivity(original);
  expect(enriched).toEqual({ ...original, radios: ["nfc", "wifi", "bluetooth"] });
  expect(original.radios).toEqual(["nfc"]);
  expect(enrichConnectivity(enriched)).toBe(enriched);
});

it.each([
  ["Cloud connectivity: Yes", true],
  ["The label identifies a cloud-managed terminal", true],
  ["The device requires a cloud account", true],
  ["Cloud backup is optional", true],
  ["Cloud recording is turned on", true],
  ["Cloud support: No", false],
  ["Device does not support cloud services", false],
  ["Cloud connectivity is unsupported", false],
  ["It is purely mechanical", false],
  ["The probe is a passive analog transducer", false],
  ["Device has no onboard network interface", false],
  ["An offline-only design", false],
] as const)("resolves the cloud flag from %s", (claim, cloud) => {
  expect(enrichConnectivity(profile({ evidence: [evidence(claim)] })).cloud_connectivity).toBe(cloud);
});

it.each([
  "Mobile app for local setup over Ethernet",
  "Label reads 'Cloud Edition'",
  "Works offline",
  "Cloud account not required",
  "Does not require a cloud account",
  "No cloud services are required",
  "Cloud sync is unavailable",
  "Cloud connectivity is currently unavailable",
  "No cloud service is in use",
  "No network interfaces are visible on this side",
  "The device is not purely mechanical",
  "Supports cloud backup via an external gateway",
  "May support cloud storage",
])("keeps cloud unknown for %s", (claim) => {
  expect(enrichConnectivity(profile({ evidence: [evidence(claim)] })).cloud_connectivity).toBeNull();
});

it("keeps cloud unknown on conflicting evidence or inferred local-only design with network capability", () => {
  expect(enrichConnectivity(profile({
    evidence: [evidence("Cloud: Yes"), evidence("Cloud services unsupported")],
  })).cloud_connectivity).toBeNull();
  expect(enrichConnectivity(profile({
    evidence: [evidence("Cloud support: Yes", "screen", 0.55)],
  })).cloud_connectivity).toBeNull();
  const wireless = profile({
    evidence: [evidence("A local-only design."), evidence("Supports Wi-Fi")],
  });
  expect(enrichConnectivity(wireless)).toMatchObject({ cloud_connectivity: null, radios: ["wifi"] });
  expect(enrichConnectivity(profile({
    object_class: "networked_device", evidence: [evidence("A local-only device.")],
  })).cloud_connectivity).toBeNull();
});

it("preserves asserted cloud values and leaves passive objects alone", () => {
  const local = profile({ cloud_connectivity: false, evidence: [evidence("Cloud support: Yes")] });
  const remote = profile({ cloud_connectivity: true, evidence: [evidence("Cloud support: No")] });
  const passive = profile({ object_class: "passive_object", evidence: [evidence("Wi-Fi logo; cloud: yes")] });
  expect(enrichConnectivity(local)).toBe(local);
  expect(enrichConnectivity(remote)).toBe(remote);
  expect(enrichConnectivity(passive)).toBe(passive);
});
