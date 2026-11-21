/** Exercises ordering and revision through the real SSE routes with offline provider fixtures. */
import { afterEach, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as reassess } from "@/app/api/reassess/route";
import { BRIEFING_WAIT_MS } from "@/gemini/briefing";
import { UNUSABLE_CAPTURE_MESSAGE } from "@/gemini/capture";
import { MODEL_IDS } from "@/gemini/models";
import * as productPage from "@/link/fetchProductPage";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import { SEED_TWIN } from "@/twin/seed";
import { officeAssessment, pressureProfile } from "./__fixtures__/placement";
import type { StreamEvent } from "./sse";

const location = { x: 1420, y: 150, area: "utilities" } as const;
const candidate = assetFromProfile(pressureProfile, SEED_TWIN, "NEW-TEST", location);
const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, candidate] };
const brief = { caution: "equipment ratings" };
const pixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMQClwKAAGBAQnBRazOAAAAAElFTkSuQmCC";

function interaction(value: unknown, stream: boolean, thoughts: string[] = []) {
  const text = JSON.stringify(value);
  const steps = [{ type: "model_output", content: [{ type: "text", text }] }];
  const usage = { total_input_tokens: 37, total_output_tokens: 23, total_thought_tokens: 5, total_tokens: 65 };
  const response = { id: "v1_fixture", status: "completed", steps, usage };
  if (!stream) return Response.json(response);
  const events = [
    ...thoughts.map((text) => ({ event_type: "step.delta", delta: { type: "thought_summary", content: { type: "text", text } } })),
    { event_type: "step.delta", delta: { type: "text", text } },
    { event_type: "interaction.completed", interaction: response },
  ];
  return new Response(events.map((event) => `event: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function request(body: unknown) {
  return new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) });
}

async function readEvents(response: Response): Promise<StreamEvent[]> {
  return (await response.text()).trim().split("\n\n").map((frame) => JSON.parse(frame.slice(6)));
}

function lifecycle(events: StreamEvent[]) {
  return events.filter(({ type }) => type !== "transcript.entry").map(({ type }) => type);
}

function transcripts(events: StreamEvent[]) {
  return events.flatMap((event) => event.type === "transcript.entry" ? [event.entry] : []);
}

function positiveGateResponse(): Response {
  const noul = { type: "noul", noul: 1, confidence: 1 };
  return Response.json({ answers: {
    is_device: noul, is_object: noul, is_readable: noul, label_visible: noul,
    object_class: {
      type: "choice", choice: "process_equipment", confidence: 1,
      probabilities: { networked_device: 0, electrical_equipment: 0, process_equipment: 1, passive_object: 0, unusable: 0 },
    },
    route: {
      type: "choice", choice: "process_equipment", confidence: 1,
      probabilities: { it_ot_device: 0, process_equipment: 1, document_or_spec: 0, other: 0 },
    },
  } });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("streams the raw provider calls and placed checks in transcript order without images or secrets", async () => {
  const key = "offline-transcript-test-placeholder";
  vi.stubEnv("GEMINI_API_KEY", key);
  const note = "My pressure gauge photo.";
  const rawProfile = {
    ...pressureProfile, device_type: " Pressure gauge ",
    provider_extension: { dataBase64: pixelPng, detail: `${key} ${pixelPng} ${"raw output ".repeat(4000)}` },
  };
  const rawAssessment = { ...officeAssessment, review_paths: [], provider_extension: "raw only" };
  const sent: Record<string, { input: string; system_instruction: string }> = {};
  const thoughts = ["Compare the submitted spot.", "Check the inspection bench."];
  const { promise: releaseScout, resolve: finishGate } = Promise.withResolvers<void>();
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    sent[body.model] = body;
    if (body.model === MODEL_IDS.decisions) {
      setImmediate(finishGate);
      return positiveGateResponse();
    }
    if (body.model === MODEL_IDS.perception) {
      expect(JSON.stringify(body.input)).toContain(pixelPng);
      await releaseScout;
      return interaction(rawProfile, body.stream);
    }
    if (body.model === MODEL_IDS.reasoning) return interaction(rawAssessment, body.stream, thoughts);
    expect(body.model).toBe(MODEL_IDS.chief);
    return interaction(brief, body.stream);
  }));
  const events = await readEvents(analyze(request({
    input: { kind: "photo", images: [{ mimeType: "image/png", dataBase64: pixelPng }], note },
    twin: SEED_TWIN, dropPoint: location,
  })));
  expect(lifecycle(events)).toContain("run.completed");
  expect(lifecycle(events)).not.toContain("run.error");
  const entries = transcripts(events);
  const calls = entries.filter((entry) => entry.request);
  expect(calls.map(({ stage, crew, engine }) => [stage, crew, engine])).toEqual([
    ["gate", "gate", MODEL_IDS.decisions], ["perception", "scout", MODEL_IDS.perception],
    ["selfcheck", "inspector", "rules engine"], ["reasoning", "architect", MODEL_IDS.reasoning],
    ["selfcheck", "inspector", "rules engine"], ["summary", "chief", MODEL_IDS.chief],
  ]);
  const [gate, scout, drop, architect, recommended, chief] = calls;
  expect(gate.request).toMatchObject({ attachments: 1, schema: expect.stringContaining("is_object"), text: expect.stringContaining(note) });
  expect(gate.response?.json).toMatchObject({ is_object: { type: "noul", noul: 1 } });
  expect(scout.request).toMatchObject({
    system: sent[MODEL_IDS.perception].system_instruction, schema: "DeviceProfile", attachments: 1, text: expect.stringContaining(note),
  });
  expect(scout.response?.json).toMatchObject({ device_type: rawProfile.device_type });
  expect(events.find((event) => event.type === "perception.done")?.profile.device_type).toBe("Pressure gauge");
  const rawScout = scout.response?.json as typeof rawProfile;
  expect(rawScout.provider_extension.detail.length).toBeLessThanOrEqual(40_000);
  expect(scout.note).toMatch(/truncat/i);
  expect(drop.request?.text).toEqual(expect.stringContaining("as-dropped"));
  expect(drop.request?.text).toEqual(expect.stringContaining("utilities"));
  expect(recommended.request?.text).toEqual(expect.stringContaining("recommendation"));
  expect(recommended.request?.text).toEqual(expect.stringContaining("corporate_office"));
  for (const inspector of [drop, recommended]) {
    expect(inspector.response?.json).toMatchObject({ findings: expect.any(Array), paths: expect.any(Array), disagreements: expect.any(Array) });
  }
  expect(architect.request).toMatchObject({
    system: sent[MODEL_IDS.reasoning].system_instruction, text: sent[MODEL_IDS.reasoning].input, schema: expect.any(String),
  });
  expect(architect).toMatchObject({ response: { json: rawAssessment }, thoughts, thinkingLevel: expect.any(String) });
  expect(chief.request).toMatchObject({ system: sent[MODEL_IDS.chief].system_instruction, text: sent[MODEL_IDS.chief].input });
  expect(chief.response?.text).toContain(brief.caution);
  for (const entry of calls) expect(entry.latencyMs).toBeGreaterThanOrEqual(0);
  for (const entry of [scout, architect, chief]) expect(entry.usage).toMatchObject({ inputTokens: 37, outputTokens: 23, totalTokens: 65 });
  const published = JSON.stringify(entries);
  expect(published).not.toContain(pixelPng);
  expect(published).not.toContain(key);
});

it.each(["cosmetic", "rejected-revision", "successful-revision"] as const)(
  "ends reassessment with the recommendation's check after %s",
  async (scenario) => {
    vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      const body = await new Request(input, init).json();
      if (body.model === MODEL_IDS.chief) return interaction(brief, body.stream);
      expect(body.model).toBe(MODEL_IDS.reasoning);
      const schema = body.response_format.schema.properties;
      const context = JSON.parse(body.input);
      if (context.prior) {
        expect(Object.keys(schema)).toEqual(["placement", "physical_placement", "never_place", "mitigations"]);
        expect(body.previous_interaction_id).toBeUndefined();
        if (scenario === "rejected-revision") return Response.json({ error: { code: 404 } }, { status: 404 });
        return interaction({
          placement: officeAssessment.placement,
          physical_placement: officeAssessment.physical_placement,
        }, body.stream);
      }
      expect(schema).not.toHaveProperty("attack_paths");
      expect(schema.review_paths.items.enum).toEqual([1, 2, 3, 4]);
      for (const field of ["id", "status", "proposedBy", "riskDelta"]) expect(schema.mitigations.items.properties).not.toHaveProperty(field);
      expect(schema.risks.items.properties).not.toHaveProperty("id");
      expect(JSON.stringify(schema.mitigations.items)).toContain("add_protection");
      expect(context.inspector.passed).toBe(false);
      expect(context.current_placement.environment).toMatchObject({ zones: ["utilities", "nh3_hazard"], hazards: ["NH3"] });
      const { placement, physical_placement } = officeAssessment;
      const initial = scenario === "cosmetic"
        ? { ...officeAssessment, physical_placement: { ...physical_placement, near_asset_id: "missing-anchor" } }
        : { ...officeAssessment, placement: { ...placement, network_area: "Unknown zone" } };
      return interaction({ ...initial, review_paths: [] }, body.stream);
    });
    vi.stubGlobal("fetch", fetch);

    const events = await readEvents(reassess(request({ profile: pressureProfile, twin, assetId: candidate.id, placement: location })));
    const types = lifecycle(events);
    expect(events[0]).toMatchObject({ type: "run.started", mode: "reassess" });
    expect(types).not.toContain("perception.started");
    expect(types).not.toContain("gate.started");
    expect(types.slice(-3)).toEqual(["summary.started", "run.completed", "summary.done"]);
    expect(types.indexOf("selfcheck.done")).toBeLessThan(types.indexOf("reasoning.started"));
    expect(types.includes("revision.started")).toBe(scenario !== "cosmetic");
    const revision = events.find((event) => event.type === "revision.done");
    expect(revision?.model).toBe(scenario === "cosmetic" ? undefined
      : scenario === "successful-revision" ? MODEL_IDS.reasoning : "rules engine");
    const checks = events.filter((event) => event.type === "selfcheck.done");
    expect(checks.map(({ phase }) => phase)).toEqual(scenario === "cosmetic" ? ["as-dropped", "recommendation"]
      : ["as-dropped", "recommendation", "post-revision"]);
    expect(checks[0].result).toMatchObject({
      passed: false, findings: expect.arrayContaining([expect.objectContaining({ ruleId: "HAZ-01" })]),
    });
    expect(checks.at(-1)?.result).toMatchObject({
      passed: true, revised: scenario === "successful-revision",
    });
    if (scenario === "cosmetic") {
      expect(checks.at(-1)?.result.disagreements).toEqual([expect.stringContaining("Removed placement anchor")]);
      expect(transcripts(events)).toContainEqual(expect.objectContaining({
        stage: "revision", note: expect.stringMatching(/skipped/i),
      }));
    }
    if (scenario === "rejected-revision") {
      expect(checks.at(-1)?.result.disagreements).toContainEqual(expect.stringContaining("Revision could not finish"));
      expect(revision?.assessment.placement.why).toMatch(/^HOLD:/);
      expect(events.find((event) => event.type === "summary.done")?.text).toContain("HOLD remains in effect.");
    }
    if (scenario === "successful-revision") {
      expect(transcripts(events)).toContainEqual(expect.objectContaining({
        stage: "revision", crew: "architect", engine: MODEL_IDS.reasoning,
        request: expect.objectContaining({ text: expect.stringContaining("Unknown zone") }),
        response: { json: { placement: officeAssessment.placement, physical_placement: officeAssessment.physical_placement } },
      }));
    }
    expect(fetch).toHaveBeenCalledTimes(scenario === "cosmetic" ? 2 : 3);
  },
);

it.each([true, false])("starts Scout before Decisions settles and only publishes admitted observations (%s)", async (proceed) => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  let scoutStarted!: () => void;
  const started = new Promise<void>((resolve) => { scoutStarted = resolve; });
  let scoutSignal: AbortSignal | null = null;
  const noun = { type: "noul", noul: 1, confidence: 1 };
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const providerRequest = new Request(input, init);
    const body = await providerRequest.json();
    if (body.model === MODEL_IDS.decisions) {
      await started;
      return Response.json({ answers: {
        is_device: { ...noun, noul: Number(proceed) }, is_object: { ...noun, noul: Number(proceed) },
        is_readable: noun, label_visible: noun,
        object_class: {
          type: "choice", choice: proceed ? "process_equipment" : "unusable", confidence: 1,
          probabilities: {
            networked_device: 0, electrical_equipment: 0, process_equipment: Number(proceed),
            passive_object: 0, unusable: Number(!proceed),
          },
        },
        route: {
          type: "choice", choice: "it_ot_device", confidence: 1,
          probabilities: { it_ot_device: 1, process_equipment: 0, document_or_spec: 0, other: 0 },
        },
      } });
    }
    if (body.model === MODEL_IDS.perception) {
      scoutSignal = providerRequest.signal;
      scoutStarted();
      return interaction(pressureProfile, body.stream);
    }
    if (body.model === MODEL_IDS.reasoning) return interaction({ ...officeAssessment, review_paths: [] }, body.stream);
    return interaction(brief, body.stream);
  });
  vi.stubGlobal("fetch", fetch);
  const events = await readEvents(analyze(request({
    input: { kind: "text", description: "Pressure gauge" }, twin: SEED_TWIN, dropPoint: location,
  })));
  const types = lifecycle(events);
  expect(types.slice(0, 4)).toEqual(["run.started", "gate.started", "perception.started", "gate.done"]);
  if (proceed) {
    expect(types.indexOf("perception.done")).toBeLessThan(types.indexOf("selfcheck.started"));
    expect(types.indexOf("selfcheck.done")).toBeLessThan(types.indexOf("reasoning.started"));
    expect(types.slice(-2)).toEqual(["run.completed", "summary.done"]);
  } else {
    expect(types.slice(4)).toEqual(["run.error"]);
    expect(events.at(-1)).toMatchObject({ stage: "gate" });
    expect(scoutSignal).toHaveProperty("aborted", true);
  }
});

it("grounds a passive assessment before exposing it and labels the briefing scope", async () => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  const profile = { ...pressureProfile, device_type: "Ceramic mug", object_class: "passive_object" as const, material: "ceramic" };
  const drop = { x: 700, y: 640, area: "filler3" } as const;
  const mug = assetFromProfile(profile, SEED_TWIN, "NEW-MUG", drop);
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    if (body.model === MODEL_IDS.chief) return interaction(brief, body.stream);
    expect(body.response_format.schema.properties).not.toHaveProperty("review_paths");
    expect(JSON.parse(body.input)).toMatchObject({ object: "Ceramic mug", material: "ceramic" });
    return interaction({
      area: "corporate_office", why: "Store away from production.", position_hint: "Use the break-area shelf.",
      risks: [{ title: "Invented", kind: "cyber", severity: 3, likelihood: 2, description: "Invented.", mitigation: "Invented." }],
      never_place: [], compliance: [], confidence: 0.9, attack_paths: [{ id: "invented" }],
    }, body.stream);
  }));
  const events = await readEvents(reassess(request({
    profile, assetId: mug.id, placement: { ...drop, level: 4 }, twin: { ...SEED_TWIN, assets: [...SEED_TWIN.assets, mug] },
  })));
  const checks = events.filter((event) => event.type === "selfcheck.done");
  expect(checks[0]?.result.paths).toEqual([]);
  expect(checks.at(-1)?.result.disagreements).toContain("Model invented a cyber risk for a passive object.");
  const assessment = events.find((event) => event.type === "reasoning.done")?.assessment;
  expect(assessment).toMatchObject({ attack_paths: [], risks: [], placement: { level: 0, conduit: null } });
  expect(events.find((event) => event.type === "summary.done")?.text).toContain("Not a networked device: assessed for physical and food-safety compliance.");
});

it.each([true, false])("uses one smaller Carbon retry inside the 60 s stage (%s)", async (recover) => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  const initial = new AbortController();
  const total = new AbortController();
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) =>
    ms === 38_000 ? initial.signal : ms === 60_000 ? total.signal : originalTimeout(ms));
  let firstStarted!: () => void;
  let retryStarted!: () => void;
  const first = new Promise<void>((resolve) => { firstStarted = resolve; });
  const retry = new Promise<void>((resolve) => { retryStarted = resolve; });
  const inputs: string[] = [];
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    if (body.model === MODEL_IDS.chief) return interaction(brief, body.stream);
    inputs.push(body.input);
    if (inputs.length === 1) {
      firstStarted();
      return new Promise<Response>(() => {});
    }
    retryStarted();
    if (!recover) return new Promise<Response>(() => {});
    return interaction({ ...officeAssessment, review_paths: [] }, body.stream);
  }));
  const pending = readEvents(reassess(request({
    profile: pressureProfile, twin, assetId: candidate.id, placement: location,
  })));
  await first;
  initial.abort();
  await retry;
  if (!recover) total.abort();
  const events = await pending;
  expect(inputs).toHaveLength(2);
  expect(inputs[1].length).toBeLessThan(inputs[0].length);
  if (recover) {
    expect(lifecycle(events).slice(-2)).toEqual(["run.completed", "summary.done"]);
  } else {
    expect(events.at(-1)).toMatchObject({
      type: "run.error", stage: "reasoning", message: expect.stringContaining("timed out after 60 seconds"),
    });
  }
});

it("routes a link's source material only to Scout, then gates and reasons over its profile", async () => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  const url = "https://example.com/gauge";
  const title = "PAGE_TITLE_SENTINEL";
  const specs = "RAW_HTML_SPEC_SENTINEL";
  const base64 = pixelPng;
  vi.spyOn(productPage, "fetchProductPage").mockResolvedValue({
    url, title, specText: specs, imageUrl: `${url}.png`, image: { mimeType: "image/png", dataBase64: base64 },
  });
  const profile = {
    ...pressureProfile, capacity_or_size: "x".repeat(130), material: "stainless steel", ip_rating: "IP67",
    hazardous_area_rating: "Class I rating", radios: ["wifi"], power: "24 V",
  };
  const noun = { type: "noul", noul: 1, confidence: 1 };
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    const evidence = JSON.stringify(body.input);
    if (body.model === MODEL_IDS.perception) {
      for (const item of [title, specs, base64]) expect(evidence).toContain(item);
      return interaction(profile, body.stream);
    }
    for (const item of [title, specs, base64]) expect(evidence).not.toContain(item);
    if (body.model === MODEL_IDS.decisions) {
      expect(evidence).toContain(profile.device_type);
      return Response.json({ answers: {
        is_device: noun, is_object: noun, is_readable: noun, label_visible: noun,
        object_class: {
          type: "choice", choice: "process_equipment", confidence: 1,
          probabilities: { networked_device: 0, electrical_equipment: 0, process_equipment: 1, passive_object: 0, unusable: 0 },
        },
        route: {
          type: "choice", choice: "process_equipment", confidence: 1,
          probabilities: { it_ot_device: 0, process_equipment: 1, document_or_spec: 0, other: 0 },
        },
      } });
    }
    if (body.model === MODEL_IDS.reasoning) {
      const { device } = JSON.parse(body.input);
      expect(device.key_specs).toEqual({
        capacity_or_size: "x".repeat(96), material: "stainless steel", ingress_protection: "IP67",
        hazardous_area_rating: "Class I rating", radios: ["wifi"], power: "24 V",
      });
      return interaction({ ...officeAssessment, review_paths: [] }, body.stream);
    }
    return interaction(brief, body.stream);
  });
  vi.stubGlobal("fetch", fetch);
  const events = await readEvents(analyze(request({ input: { kind: "link", url }, twin: SEED_TWIN })));
  expect(lifecycle(events).slice(0, 7)).toEqual([
    "run.started", "link.started", "link.fetched", "perception.started", "gate.started", "gate.done", "perception.done",
  ]);
  expect(lifecycle(events).slice(-2)).toEqual(["run.completed", "summary.done"]);
});

it("ends an unreadable link at the link stage with a practical next step", async () => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  vi.spyOn(productPage, "fetchProductPage").mockRejectedValue(new Error("Unreadable page"));
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const events = await readEvents(analyze(request({ input: { kind: "link", url: "https://example.com/product" }, twin: SEED_TWIN })));
  expect(events.map(({ type }) => type)).toEqual(["run.started", "link.started", "run.error"]);
  expect(events.at(-1)).toMatchObject({ stage: "link", message: "This page did not return readable product details; try a photo or paste the specs as text." });
  expect(fetch).not.toHaveBeenCalled();
});

it("completes the checked run before Chief delivers a smaller fallback", async () => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  const timers = [new AbortController(), new AbortController()];
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  let primaryAttempts = 0;
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => ms === BRIEFING_WAIT_MS
    ? timers[primaryAttempts++].signal : originalTimeout(ms));
  const requests: { input: string; system_instruction: string; generation_config: { max_output_tokens: number } }[] = [];
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    if (body.model === MODEL_IDS.chief) {
      requests.push(body);
      if (requests.length > timers.length) return interaction(brief, body.stream);
      timers[requests.length - 1].abort(new DOMException("Deadline exceeded", "TimeoutError"));
      return new Promise<Response>(() => {});
    }
    return interaction({ ...officeAssessment, review_paths: [] }, body.stream);
  }));
  const events = await readEvents(reassess(request({
    profile: pressureProfile, twin, assetId: candidate.id, placement: location,
  })));
  expect(lifecycle(events).slice(-4)).toEqual(["selfcheck.done", "summary.started", "run.completed", "summary.done"]);
  expect(events.find((event) => event.type === "summary.done")).toMatchObject({
    model: MODEL_IDS.chief, text: expect.stringContaining(brief.caution),
  });
  expect(requests).toHaveLength(3);
  expect(requests[1].system_instruction).toBe(requests[0].system_instruction);
  expect(requests[2].system_instruction.length).toBeLessThan(requests[0].system_instruction.length);
  expect(requests[2].generation_config.max_output_tokens).toBeLessThan(requests[0].generation_config.max_output_tokens);
  for (const call of requests) expect(JSON.parse(call.input)).toMatchObject({ passed: true, hold: false, blocking: [] });
  const calls = transcripts(events).filter((entry) => entry.crew === "chief");
  expect(calls).toHaveLength(3);
  expect(calls[1]).toMatchObject({ note: expect.stringMatching(/retry/i) });
  expect(calls[2]).toMatchObject({ note: expect.stringMatching(/fallback/i) });
});

it("continues independently when one concurrent capture's gate gets a permanent provider error", async () => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  const denied = vi.fn(() => Response.json({ error: { message: "Malformed Decision input", code: 400 } }, { status: 400 }));
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    if (body.model === MODEL_IDS.decisions) {
      return JSON.stringify(body.input).includes("gate failure") ? denied() : positiveGateResponse();
    }
    if (body.model === MODEL_IDS.perception) return interaction(pressureProfile, body.stream);
    if (body.model === MODEL_IDS.reasoning) return interaction({ ...officeAssessment, review_paths: [] }, body.stream);
    return interaction(brief, body.stream);
  }));
  const analyzeText = (description: string) => readEvents(analyze(request({
    input: { kind: "text", description }, twin: SEED_TWIN,
  })));
  const [advisory, normal] = await Promise.all([analyzeText("Pressure gauge with gate failure"), analyzeText("Pressure gauge")]);
  expect(denied).toHaveBeenCalledTimes(1);
  expect(advisory.find(({ type }) => type === "gate.done")).toMatchObject({
    gate: { answers: {}, proceed: true, reason: "Gate unavailable: continued without it" },
  });
  expect(normal.find(({ type }) => type === "gate.done")).toMatchObject({
    gate: { answers: { is_object: { value: 1 } }, proceed: true, reason: null },
  });
  expect(advisory[0].runId).not.toBe(normal[0].runId);
  for (const events of [advisory, normal]) {
    expect(events.every(({ runId }) => runId === events[0].runId)).toBe(true);
    expect(lifecycle(events).slice(-2)).toEqual(["run.completed", "summary.done"]);
  }
});

it("times out an uncooperative gate and lets Scout report an unidentifiable capture", async () => {
  vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
  const gateTimer = new AbortController();
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) =>
    ms === 4_000 ? gateTimer.signal : originalTimeout(ms));
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const body = await new Request(input, init).json();
    if (body.model === MODEL_IDS.decisions) {
      gateTimer.abort(new DOMException("Deadline exceeded", "TimeoutError"));
      return new Promise<Response>(() => {});
    }
    return interaction({ ...pressureProfile, object_class: "unusable", physical_kind: "generic_device" }, body.stream);
  });
  vi.stubGlobal("fetch", fetch);
  const events = await readEvents(analyze(request({
    input: { kind: "text", description: "An unrecognizable blur" }, twin: SEED_TWIN,
  })));
  expect(events.filter(({ type }) => type !== "transcript.entry").slice(-2)).toMatchObject([
    { type: "gate.done", gate: { proceed: true, reason: "Gate unavailable: continued without it" } },
    { type: "run.error", stage: "perception", message: UNUSABLE_CAPTURE_MESSAGE },
  ]);
  expect(events.some(({ type }) => type === "perception.done" || type === "reasoning.started")).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(2);
});
