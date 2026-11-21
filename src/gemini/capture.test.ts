/** Covers Decisions gate thresholds with validated, offline wire fixtures. */
import { expect, it, vi } from "vitest";
import { gateCapture } from "./capture";
import type { GeminiClients } from "./transport";

it.each([
  { noul: 0.15, confidence: 0.85, readable: 0.95, route: 0.95, proceed: false, reason: "does not appear" },
  { noul: 0.151, confidence: 0.85, readable: 0.95, route: 0.95, proceed: true, reason: null },
  { noul: 0.15, confidence: 0.849, readable: 0.95, route: 0.95, proceed: true, reason: null },
  { noul: 0.8, confidence: 0.7, readable: 0.7, route: 0.7, proceed: true, reason: null },
  { noul: 0.8, confidence: 0.699, readable: 0.95, route: 0.95, proceed: true, reason: "uncertain" },
  { noul: 0.8, confidence: 0.95, readable: 0.699, route: 0.95, proceed: true, reason: "uncertain" },
  { noul: 0.8, confidence: 0.95, readable: 0.95, route: 0.699, proceed: true, reason: "uncertain" },
])("gates P(device)=$noul at confidence $confidence with readability $readable and route $route",
  async ({ noul, confidence, readable, route, proceed, reason }) => {
    const probabilities = { it_ot_device: route, process_equipment: 1 - route, document_or_spec: 0, other: 0 };
    const create = vi.fn().mockResolvedValue({
      answers: {
        is_device: { type: "noul", noul, confidence },
        is_readable: { type: "noul", noul: readable, confidence: 0.95 },
        label_visible: { type: "noul", noul: 0.99, confidence: 0.99 },
        route: { type: "choice", choice: "it_ot_device", confidence: route, probabilities },
      },
    });
    const client = { create } as unknown as GeminiClients["decisions"];
    const result = await gateCapture(client, "A gauge", new AbortController().signal);
    expect(result).toMatchObject({
      proceed, reason: reason === null ? null : expect.stringContaining(reason),
      answers: {
        is_device: { type: "noul", value: noul, confidence },
        route: { type: "choice", value: "it_ot_device", confidence: route, probabilities },
      },
    });
    expect(create).toHaveBeenCalledTimes(1);
  },
);
