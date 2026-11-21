/** Verifies the route validates evidence and sends one typed choice question to the SDK. */
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/escalation/decide/route";
import { MODEL_IDS } from "@/gemini/models";
import { ACTIONS } from "./decision";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/gemini/transport", () => ({
  geminiClients: () => ({ decisions: { create } }),
  noSdkRetries: { strategy: "none" },
}));

const evidence = { asset: "PLC-F3", finding: "Simulated exposure", loss: 250_000, risk: 84, simulated: true };
function request(body: unknown) {
  return new Request("http://localhost:4119/api/escalation/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => create.mockReset());

it("forwards bounded evidence and returns the provider's choice and confidence", async () => {
  create.mockResolvedValue({ answers: { action: { choice: "add protection", confidence: 0.87 } } });
  const response = await POST(request(evidence));
  expect(await response.json()).toEqual({ model: MODEL_IDS.decisions, choice: "add protection", confidence: 0.87 });
  expect(create).toHaveBeenCalledOnce();
  const [payload, options] = create.mock.calls[0];
  expect(payload.model).toBe(MODEL_IDS.decisions);
  expect(JSON.parse(payload.input)).toEqual(evidence);
  expect(Object.keys(payload.questions)).toEqual(["action"]);
  expect(payload.questions.action.type).toBe("choice");
  expect(Object.keys(payload.questions.action.criteria)).toEqual(ACTIONS);
  expect(options.signal).toBeInstanceOf(AbortSignal);
});

it("returns unavailable on a provider failure or invalid provider answer", async () => {
  create.mockRejectedValueOnce(new Error("Provider failed")).mockResolvedValueOnce({
    answers: { action: { choice: "other", confidence: 4 } },
  });
  for (let i = 0; i < 2; i++) {
    const response = await POST(request(evidence));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Decision unavailable" });
  }
});

it("skips the SDK on invalid evidence", async () => {
  const response = await POST(request({ ...evidence, risk: 101 }));
  expect(response.status).toBe(400);
  expect(create).not.toHaveBeenCalled();
});
