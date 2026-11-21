/** Exercises the browser client against chunked SSE, run IDs, thumbnails and final proposals. */
import { afterEach, expect, it, vi } from "vitest";
import { evaluatePlacement } from "@/rules/engine";
import { assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { assetFromProfile, capturedAssetId } from "./assetFromProfile";
import { pipelineBus } from "./bus";
import { analyze, cancelRun, moveToRecommended, reassessAsset } from "./client";
import { useRunStore } from "./runStore";
import { officeAssessment, pressureProfile } from "./server/__fixtures__/placement";
import type { StreamEvent } from "./server/sse";
import type { Assessment, CaptureImage, CaptureInput, DeviceProfile, GateResult, ReassessRequest, SelfCheckResult } from "./types";

const capture = { kind: "text", description: "A pressure gauge" } as const;
const photo: CaptureImage = { mimeType: "image/png", dataBase64: "AQID" };
const productUrl = "https://example.com/pressure-gauge";
const gate: GateResult = { proceed: true, reason: null, answers: {} };
const base = { runId: "test-a00-1234", at: 10 };
const checkedOffice: Assessment = { ...officeAssessment, risks: [], attack_paths: [], mitigations: [] };

function frame(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function sse(text: string, frameBytes = 1024): Response {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += frameBytes) controller.enqueue(bytes.subarray(offset, offset + frameBytes));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

afterEach(() => {
  cancelRun();
  useRunStore.getState().reset();
  useTwinStore.getState().reset();
  vi.unstubAllGlobals();
});

it("reads UTF-8 and multiline CRLF frames across chunks and ignores stale terminal events", async () => {
  const start = 'event: pipeline\r\ndata: {"type":"run.started",\r\ndata: "runId":"test-a00-1234","at":10,'
    + '"dropPoint":null,"input":{"kind":"text","label":"Gauge"}}\r\n\r\n';
  const reply = sse(": heartbeat\r\n\r\n" + start + [
    frame({ ...base, runId: "stale", type: "run.error", stage: "gate", message: "An older run failed" }),
    frame({ ...base, type: "summary.done", text: "Vérifier l’étanchéité.", latencyMs: 5, model: "fixture" }),
    frame({ ...base, type: "run.completed", totalMs: 20 }),
  ].join(""), 1);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply));
  await analyze(capture);
  expect(useRunStore.getState()).toMatchObject({ status: "done", summary: "Vérifier l’étanchéité." });
  expect(useRunStore.getState().events.map(({ type }) => type)).toEqual(["run.started", "summary.done", "run.completed"]);
});

it("keeps receiving the Chief's briefing and transcript after the placement completes", async () => {
  const { promise: completed, resolve: placementArrived } = Promise.withResolvers<void>();
  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array>();
  const writer = stream.writable.getWriter();
  const publish = (event: StreamEvent) => writer.write(encoder.encode(frame(event)));
  const off = pipelineBus.on(({ type }) => { if (type === "run.completed") placementArrived(); });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream" },
  })));
  const pending = analyze(capture);
  try {
    await publish({ ...base, type: "run.started", input: { kind: "text", label: "Gauge" }, dropPoint: null });
    const result: SelfCheckResult = { passed: true, revised: false, paths: [], findings: [], disagreements: [] };
    const assessment: Assessment = { ...checkedOffice, risks: [{
      id: "PROFILE-PHYSICAL-DATA-PORT:INS-901", title: "Physical port access", kind: "cyber",
      severity: 2, likelihood: 3, technique: null, description: "From device profile.", mitigation: "Restrict access.",
    }] };
    await publish({ ...base, type: "reasoning.done", model: "gemini-4-carbon", latencyMs: 20, assessment: checkedOffice });
    await publish({ ...base, type: "selfcheck.done", phase: "recommendation", latencyMs: 1, result });
    await publish({ ...base, type: "summary.started", model: "gemini-4-neon", assessment });
    await publish({ ...base, type: "run.completed", totalMs: 25 });
    await completed;
    await pending;
    expect(useRunStore.getState()).toMatchObject({ status: "done", summary: null, transcript: [], selfCheck: result, assessment });

    const text = "Rules engine: Placement cleared.";
    const entry = { stage: "summary", crew: "chief", engine: "gemini-4-neon", response: { text }, latencyMs: 35 } as const;
    await publish({ ...base, runId: "stale", type: "summary.done", model: "gemini-4-neon", text: "Previous briefing", latencyMs: 1 });
    await publish({ ...base, type: "transcript.entry", entry });
    await publish({ ...base, type: "summary.done", model: "gemini-4-neon", text, latencyMs: 35 });
    await writer.close();
    await vi.waitFor(() => expect(useRunStore.getState().summary).toBe(text));
    expect(useRunStore.getState()).toMatchObject({ status: "done", summary: text, transcript: [entry] });
    expect(useRunStore.getState().events.map(({ type }) => type)).toEqual([
      "run.started", "reasoning.done", "selfcheck.done", "summary.started", "run.completed", "transcript.entry", "summary.done",
    ]);
  } finally {
    off();
  }
});

it.each([
  ["data: {broken}\n\n", "sent an invalid analysis event"],
  ["", "closed before the run finished"],
])("reports a failed stream for tail %j", async (tail, reason) => {
  const header = frame({ ...base, type: "run.started", input: { kind: "text", label: "Gauge" }, dropPoint: null });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sse(header + tail)));
  await expect(analyze(capture)).rejects.toThrow(reason);
  expect(useRunStore.getState()).toMatchObject({ status: "error", runId: base.runId });
});

it.each(["photo", "link"] as const)("keeps the %s thumbnail and queues the grounded assessment once when revision was skipped", async (kind) => {
  const run = { ...base, runId: `${kind}-unique` };
  const assetId = capturedAssetId(run.runId, pressureProfile, useTwinStore.getState().twin);
  const assessment: Assessment = {
    ...checkedOffice, mitigations: [{
      id: `${run.runId}:mitigation:1`, title: "Check the bench", kind: "procedural", description: "Confirm mounting",
      status: "proposed", proposedBy: "architect", riskDelta: 0, targets: [assetId], effects: [{ type: "note", text: "Review mounting" }],
    }],
  };
  const input: CaptureInput = kind === "photo"
    ? { kind, images: [photo, { ...photo, dataBase64: "CAFE" }] }
    : { kind, url: productUrl };
  const link = kind === "link" ? frame({
    ...run, type: "link.fetched", latencyMs: 10, thumbnail: photo,
    snapshot: { title: "Pressure gauge", url: productUrl, imageUrl: "https://example.com/gauge.png" },
  }) : "";
  const original = sse(frame({ ...run, type: "run.started", input: { kind, label: "Gauge" }, dropPoint: null }) + link + [
    frame({ ...run, type: "gate.done", model: "fixture", latencyMs: 5, gate }),
    frame({ ...run, type: "perception.done", model: "fixture", latencyMs: 5, profile: pressureProfile }),
    frame({ ...run, type: "reasoning.done", model: "fixture", latencyMs: 5, assessment }),
    frame({ ...run, type: "selfcheck.done", latencyMs: 5, result: {
      passed: true, revised: false, findings: [], paths: [], disagreements: ["Revision skipped because Gemini returned no interaction ID."],
    } }),
    frame({ ...run, type: "summary.started", model: "fixture" }),
    frame({ ...run, type: "run.completed", totalMs: 25 }),
  ].join(""));
  const next = { ...run, runId: `${run.runId}-reassess` };
  const reassessment = sse([
    frame({ ...next, type: "run.started", mode: "reassess", input: { kind: "text", label: "Reassess" }, dropPoint: null }),
    frame({ ...next, type: "run.completed", totalMs: 25 }),
  ].join(""));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(original).mockResolvedValueOnce(reassessment));
  await analyze(input);
  expect(useRunStore.getState().captureThumbnail).toEqual(photo);
  if (kind === "link") {
    expect(useRunStore.getState().events.find(({ type }) => type === "link.fetched")).not.toHaveProperty("thumbnail");
  }
  expect(useTwinStore.getState().mitigations).toEqual(assessment.mitigations);
  await reassessAsset(assetId);
  expect(useRunStore.getState()).toMatchObject({ runId: next.runId, placedAssetId: assetId, profile: pressureProfile, gate, captureThumbnail: photo });
  expect(useTwinStore.getState().mitigations).toHaveLength(1);
});

it("shows the checked drop and its paths before the Architect, then keeps only the final recommendation verdict", async () => {
  const run = { ...base, runId: "drop-check" };
  const dropPoint = { area: "filler3", x: 700, y: 640 } as const;
  const profile: DeviceProfile = {
    ...pressureProfile, device_type: "Wi-Fi camera", category: "camera", physical_kind: "ip_camera",
    radios: ["wifi"], cloud_connectivity: true,
  };
  const twin = useTwinStore.getState().twin;
  const id = capturedAssetId(run.runId, profile, twin);
  const dropped = evaluatePlacement(twin, assetFromProfile(profile, twin, id, dropPoint));
  expect(dropped.findings.some(({ severity }) => severity >= 4)).toBe(true);
  expect(dropped.paths.length).toBeGreaterThan(0);
  const preliminary: SelfCheckResult = { ...dropped, passed: false, revised: false, disagreements: [] };
  const first: SelfCheckResult = { ...preliminary, disagreements: ["Change placement"] };
  const final: SelfCheckResult = { passed: true, paths: [], findings: [], disagreements: [], revised: true };
  const reply = sse([
    frame({ ...run, type: "run.started", input: { kind: "text", label: "Camera" }, dropPoint }),
    frame({ ...run, type: "perception.done", model: "fixture", latencyMs: 5, profile }),
    frame({ ...run, type: "selfcheck.started", engine: "rules engine", phase: "as-dropped" }),
    frame({ ...run, type: "selfcheck.path", path: dropped.paths[0], phase: "as-dropped" }),
    frame({ ...run, type: "selfcheck.done", latencyMs: 1, result: preliminary, phase: "as-dropped" }),
    frame({ ...run, type: "reasoning.started", model: "fixture", candidateArea: dropPoint.area }),
    frame({ ...run, type: "reasoning.done", model: "fixture", latencyMs: 5, assessment: checkedOffice }),
    frame({ ...run, type: "selfcheck.done", latencyMs: 1, result: first, phase: "recommendation" }),
    frame({ ...run, type: "revision.done", model: "fixture", latencyMs: 5, assessment: checkedOffice }),
    frame({ ...run, type: "selfcheck.done", latencyMs: 1, result: final, phase: "post-revision" }),
    frame({ ...run, type: "summary.started", model: "fixture" }),
    frame({ ...run, type: "run.completed", totalMs: 20 }),
  ].join(""));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply));
  const beforeRecommendations: Array<SelfCheckResult | null> = [];
  let earlyDrop;
  const off = pipelineBus.on(({ type }) => {
    if (type === "reasoning.started") {
      const state = useTwinStore.getState();
      earlyDrop = {
        asset: assetById(state.twin, id), verdict: useRunStore.getState().selfCheck,
        hasPath: state.risk.paths.some(({ causedBy }) => causedBy === id),
      };
    }
    if (type === "reasoning.done" || type === "revision.done") {
      beforeRecommendations.push(useRunStore.getState().selfCheck);
    }
  });
  try {
    await analyze({ kind: "text", description: "Wi-Fi camera" }, dropPoint);
  } finally {
    off();
  }
  expect(earlyDrop).toMatchObject({ asset: { physical: dropPoint, placement: "unsafe" }, verdict: preliminary, hasPath: true });
  expect(beforeRecommendations).toEqual([null, null]);
  expect(useRunStore.getState()).toMatchObject({ status: "done", selfCheck: final });
  expect(useRunStore.getState().events.filter(({ type }) => type === "selfcheck.done")).toMatchObject([
    { phase: "as-dropped" }, { phase: "recommendation" }, { phase: "post-revision" },
  ]);
  expect(assetById(useTwinStore.getState().twin, id)).toMatchObject({ physical: dropPoint, placement: "unsafe" });
});

it("does not treat a passed drop check as approval to move to an unchecked recommendation", async () => {
  const run = { ...base, runId: "unchecked" };
  const id = capturedAssetId(run.runId, pressureProfile, useTwinStore.getState().twin);
  const dropPoint = { area: "corporate_office", x: 135, y: 150 } as const;
  const preliminary: SelfCheckResult = { passed: true, paths: [], findings: [], disagreements: [], revised: false };
  const assessment: Assessment = {
    ...checkedOffice,
    physical_placement: { ...checkedOffice.physical_placement, area: "filler3" },
  };
  const reply = sse([
    frame({ ...run, type: "run.started", input: { kind: "text", label: "Gauge" }, dropPoint }),
    frame({ ...run, type: "perception.done", model: "fixture", latencyMs: 5, profile: pressureProfile }),
    frame({ ...run, type: "selfcheck.done", latencyMs: 1, result: preliminary }),
    frame({ ...run, type: "reasoning.done", model: "fixture", latencyMs: 5, assessment }),
    frame({ ...run, type: "run.error", stage: "selfcheck", message: "Placement check failed" }),
  ].join(""));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply));
  await expect(analyze(capture, dropPoint)).rejects.toThrow("Placement check failed");
  expect(useRunStore.getState().selfCheck).toBeNull();
  const before = assetById(useTwinStore.getState().twin, id);
  expect(before?.placement).toBe("recommended");
  moveToRecommended(id);
  expect(assetById(useTwinStore.getState().twin, id)).toBe(before);
});

it("normalizes a moved passive asset in the store and reassessment request", async () => {
  const run = { ...base, runId: "mug-capture" };
  const profile: DeviceProfile = { ...pressureProfile, object_class: "passive_object", device_type: "Mug", material: "ceramic" };
  const id = capturedAssetId(run.runId, profile, useTwinStore.getState().twin);
  const original = sse([
    frame({ ...run, type: "run.started", input: { kind: "text", label: "Mug" }, dropPoint: null }),
    frame({ ...run, type: "perception.done", model: "fixture", latencyMs: 5, profile }),
    frame({ ...run, type: "run.completed", totalMs: 25 }),
  ].join(""));
  const next = { ...run, runId: "mug-reassess" };
  const reassessment = sse([
    frame({ ...next, type: "run.started", mode: "reassess", input: { kind: "text", label: "Reassess" }, dropPoint: null }),
    frame({ ...next, type: "run.completed", totalMs: 25 }),
  ].join(""));
  const fetch = vi.fn().mockResolvedValueOnce(original).mockResolvedValueOnce(reassessment);
  vi.stubGlobal("fetch", fetch);
  await analyze({ kind: "text", description: "Ceramic mug" });
  const moved = { area: "corporate_office", x: 135, y: 150 } as const;
  useTwinStore.getState().updateAsset(id, (asset) => ({
    ...asset, physical: { ...asset.physical, ...moved },
    network: { level: 4, area: "Enterprise", conduit: "C-ENT-DMZ", ip: "192.0.2.1" },
  }));
  await reassessAsset(id);
  const request: ReassessRequest = JSON.parse(fetch.mock.calls[1][1].body);
  const expected = {
    physical: { ...moved, kind: "generic_device", connections: [] },
    network: { level: 0, area: "Corporate office", conduit: null },
  };
  expect(request.placement).toEqual({ ...moved, level: 0 });
  expect(assetById(request.twin, id)).toMatchObject(expected);
  expect(assetById(useTwinStore.getState().twin, id)).toMatchObject(expected);
});

it("keeps readable sequential tags unique across captures on the same twin", async () => {
  const mug: DeviceProfile = { ...pressureProfile, object_class: "passive_object", device_type: "Coffee mug" };
  const camera: DeviceProfile = { ...pressureProfile, object_class: "networked_device", device_type: "Camera", physical_kind: "ip_camera" };
  const fetch = vi.fn().mockImplementation((_url, options: RequestInit) => {
    const request = JSON.parse(String(options.body)) as { input: Extract<CaptureInput, { kind: "text" }> };
    const profile = request.input.description === "Coffee mug" ? mug : camera;
    const run = { ...base, runId: `tags-${fetch.mock.calls.length}` };
    return Promise.resolve(sse([
      frame({ ...run, type: "run.started", input: { kind: "text", label: profile.device_type }, dropPoint: null }),
      frame({ ...run, type: "perception.done", model: "fixture", latencyMs: 3, profile }),
      frame({ ...run, type: "run.completed", totalMs: 15 }),
    ].join("")));
  });
  vi.stubGlobal("fetch", fetch);
  await analyze({ kind: "text", description: "Camera" });
  expect(useRunStore.getState().placedAssetId).toBe("CAM-901");
  await analyze({ kind: "text", description: "Coffee mug" });
  expect(useRunStore.getState().placedAssetId).toBe("MUG-902");
  await analyze({ kind: "text", description: "Camera" });
  expect(useRunStore.getState().placedAssetId).toBe("CAM-903");
  expect(useTwinStore.getState().twin.assets.map(({ id }) => id)).toEqual(expect.arrayContaining(["CAM-901", "MUG-902", "CAM-903"]));
});
