/** Covers Decisions admission and Scout profiles with validated, offline wire fixtures. */
import { expect, it, vi } from "vitest";
import { z } from "zod";
import type { CaptureInput, LinkSnapshot, TranscriptEntry } from "@/pipeline/types";
import { EQUIPMENT_KINDS } from "@/twin/types";
import { captureEvidence, gateCapture, perceive, UNUSABLE_CAPTURE_MESSAGE } from "./capture";
import { deviceProfileSchema, perceptionProfileSchema } from "./schemas";
import { withGeminiTranscript } from "./transcript";
import type { GeminiClients } from "./transport";

const noul = (value: number, confidence = 0.95) => ({ type: "noul", noul: value, confidence });
const classes = { networked_device: 0, electrical_equipment: 0, process_equipment: 0, passive_object: 0, unusable: 0 };
const route = { type: "choice", choice: "other", confidence: 0.95,
  probabilities: { it_ot_device: 0, process_equipment: 0, document_or_spec: 0.05, other: 0.95 } };

it.each([
  { name: "a readable mug", object: noul(0.95), readable: noul(0.95), classification: "passive_object", proceed: true, reason: null },
  { name: "a concrete equipment specification", object: noul(0.95), readable: noul(0.95), classification: "electrical_equipment", proceed: true, reason: null },
  { name: "no object", object: noul(0.15, 0.85), readable: noul(0.95), classification: "passive_object", proceed: false, reason: "identifiable object" },
  { name: "an unreadable image", object: noul(0.95), readable: noul(0.15, 0.85), classification: "passive_object", proceed: false, reason: "identifiable object" },
  { name: "an unusable scene", object: noul(0.65), readable: noul(0.65), classification: "unusable", proceed: false, reason: "identifiable object" },
  { name: "low-confidence object evidence", object: noul(0.15, 0.849), readable: noul(0.95), classification: "passive_object", proceed: true, reason: "uncertain" },
  { name: "a partially legible object", object: noul(0.95), readable: noul(0.699), classification: "passive_object", proceed: true, reason: "uncertain" },
])("routes $name using object usability", async ({ object, readable, classification, proceed, reason }) => {
  const device = classification === "electrical_equipment" ? noul(0.95) : noul(0.01);
  const create = vi.fn().mockResolvedValue({
    answers: {
      is_device: device, is_object: object, is_readable: readable, label_visible: noul(0.01),
      object_class: { type: "choice", choice: classification, confidence: 0.95, probabilities: { ...classes, [classification]: 1 } },
      route,
    },
  });
  const client = { create } as unknown as GeminiClients["decisions"];
  const result = await gateCapture(client, "Submitted evidence", new AbortController().signal);
  expect(result).toMatchObject({
    proceed, reason: reason === null ? null : expect.stringContaining(reason),
    answers: {
      is_device: { type: "noul", value: device.noul, confidence: device.confidence },
      is_object: { type: "noul", value: object.noul, confidence: object.confidence },
      object_class: { type: "choice", value: classification, confidence: 0.95 },
    },
  });
  expect(create).toHaveBeenCalledTimes(1);
  expect(create.mock.calls[0][0].questions.object_class.criteria).toMatchObject({
    passive_object: expect.any(String), unusable: expect.any(String),
  });
});

it("requires a Scout classification while accepting older stored profiles", () => {
  const schema = z.toJSONSchema(perceptionProfileSchema);
  expect(schema.required).toEqual(expect.arrayContaining(["object_class", "radios", "cloud_connectivity"]));
  expect(schema.properties).toMatchObject({
    radios: { description: expect.stringContaining("unknown enabled state") },
    cloud_connectivity: { description: expect.stringContaining("Null when unknown") },
  });
  expect(perceptionProfileSchema.shape.object_class.safeParse("unusable").success).toBe(true);
  expect(perceptionProfileSchema.shape.object_class.safeParse("passive_object").success).toBe(true);
  expect(deviceProfileSchema.shape.object_class.safeParse(undefined).success).toBe(true);
  expect(deviceProfileSchema.shape.object_class.safeParse("unusable").success).toBe(false);
});

it("only returns a profile when Scout identifies a physical object", async () => {
  const rejected = {
    object_class: "unusable", device_type: "Unidentifiable capture",
    category: "other", physical_kind: "generic_device", vendor: null, model: null, radios: [], ports: [],
    storage: null, default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: null,
    power: null, capacity_or_size: null, material: null, food_grade: null,
    hazardous_area_rating: null, ip_rating: null, evidence: [], unknowns: [], confidence: 0.95,
  };
  const create = vi.fn().mockResolvedValue({
    status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(rejected) }] }],
  });
  const client = { create } as unknown as GeminiClients["interactions"];
  await expect(perceive(client, "unreadably blurred", new AbortController().signal)).rejects.toThrow(UNUSABLE_CAPTURE_MESSAGE);
  expect(create).toHaveBeenCalledTimes(1);
});

it.each([
  { physical_kind: "gateway", category: "network", device_type: "Rack switch with a serial uplink" },
  { physical_kind: "hmi", category: "controller", device_type: "Control cabinet with operator buttons" },
  { physical_kind: "generic_device", category: "hmi", device_type: "Handheld test terminal with a screen" },
])("preserves Scout's valid $physical_kind even when the category or name suggests another kind", async (classification) => {
  const raw = {
    ...classification, object_class: "electrical_equipment", vendor: null, model: null, radios: [], ports: [],
    storage: null, default_credentials_visible: false, default_credentials_note: null, cloud_connectivity: null,
    power: null, capacity_or_size: null, material: null, food_grade: null, hazardous_area_rating: null,
    ip_rating: null, evidence: [
      { source: "label", claim: "Label lists built-in Zigbee", confidence: 0.95 },
      { source: "spec_sheet", claim: "Cloud connectivity: No", confidence: 0.95 },
    ], unknowns: [], confidence: 0.91,
  };
  const create = vi.fn().mockResolvedValue({ status: "completed", output_text: JSON.stringify(raw) });
  const client = { create } as unknown as GeminiClients["interactions"];
  const entries: TranscriptEntry[] = [];
  const observed = withGeminiTranscript((entry) => entries.push(entry),
    () => perceive(client, "An equipment photo", new AbortController().signal));
  await expect(observed).resolves.toMatchObject({ ...classification, radios: ["zigbee"], cloud_connectivity: false });
  expect(entries).toHaveLength(1);
  expect(entries[0].response?.json).toMatchObject({ radios: [], cloud_connectivity: null });
  const system = create.mock.calls[0][0].system_instruction;
  for (const kind of EQUIPMENT_KINDS) expect(system).toContain(`${kind}: `);
});

it("prepares capped product details and a low-resolution image for Scout", () => {
  const input: CaptureInput = { kind: "link", url: "https://example.com/product" };
  const link: LinkSnapshot = {
    url: input.url, title: "AXIS M3085-V Camera", specText: "Ingress protection: IP42\nPower: PoE",
    imageUrl: "https://example.com/product.png", image: { mimeType: "image/png", dataBase64: "AAAA" },
  };
  const evidence = captureEvidence(input, link);
  expect(evidence).toHaveLength(2);
  expect(evidence).toMatchObject([
    { type: "text", text: expect.stringContaining("Ingress protection: IP42") },
    { type: "image", resolution: "low" },
  ]);
});
