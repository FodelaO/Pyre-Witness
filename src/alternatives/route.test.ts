/** Exercises the POST boundary with a stubbed Gemini SDK and real Zod/transport validation. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/alternatives/route";
import { MODEL_IDS } from "@/gemini/models";
import { DEVICE_CATEGORIES } from "@/pipeline/types";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class { interactions = { create }; decisions = {}; },
}));
const body = {
  profile: {
    device_type: "Inspection camera", category: DEVICE_CATEGORIES[0], vendor: null, model: null,
    radios: ["wifi"], ports: ["RJ45"], storage: null, default_credentials_visible: false,
    cloud_connectivity: null, power: null, physical_kind: "ip_camera", capacity_or_size: null,
    material: null, food_grade: null, hazardous_area_rating: null, ip_rating: null, confidence: 0.8,
  },
  kind: "ip_camera", placement: { area: "filler3", level: 2, zone: "Cell F3" },
  findings: [],
  changes: [{ id: "disable_wifi", description: "Use the existing wired link." }],
};
const proposal = {
  name: "Wired camera", kind: "ip_camera", rationale: "Keep the existing inspection workflow.",
  changes: ["disable_wifi"], costDeltaUsd: { low: 20, mode: 40, high: 100 },
};

function request(data: unknown = body) {
  return new Request("http://local.test/api/alternatives", {
    method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" },
  });
}
function output(candidates: unknown[]) {
  create.mockResolvedValue({ status: "completed", output_text: JSON.stringify({ candidates }) });
}

beforeEach(() => {
  create.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "offline-fixture");
});
afterEach(() => vi.unstubAllEnvs());

it("returns valid candidates via a stateless Carbon structured interaction", async () => {
  output([proposal]);
  const response = await POST(request());
  expect(await response.json()).toEqual({ candidates: [proposal] });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({
    model: MODEL_IDS.reasoning, store: false,
    response_format: expect.objectContaining({ type: "text", mime_type: "application/json" }),
  }), expect.anything());
});

it.each([
  { ...proposal, risk: 10 },
  { ...proposal, name: "A proposal with too many words" },
  { ...proposal, rationale: "One line\nTwo lines" },
  { ...proposal, changes: ["remove_asset"] },
  { ...proposal, changes: ["managed"] },
  { ...proposal, changes: ["disable_wifi", "disable_wifi"] },
  { ...proposal, kind: "plc_cabinet" },
  { ...proposal, costDeltaUsd: { low: 90, mode: 50, high: 100 } },
])("falls back for an invalid proposal", async (invalid) => {
  output([proposal, invalid]);
  expect(await (await POST(request())).json()).toEqual({ candidates: [], unavailable: true });
});

it("rejects malformed input without calling Carbon", async () => {
  expect((await POST(request({ ...body, kind: "unknown" }))).status).toBe(400);
  expect(create).not.toHaveBeenCalled();
});

it("falls back when Carbon fails", async () => {
  create.mockRejectedValue(new Error("Provider unavailable"));
  expect(await (await POST(request())).json()).toEqual({ candidates: [], unavailable: true });
});
