/** Verifies Chief's verdict, deadline retry and real smaller fallback. */
import { afterEach, expect, it, vi } from "vitest";
import { officeAssessment, pressureProfile } from "@/pipeline/server/__fixtures__/placement";
import type { Assessment, SelfCheckResult } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { briefEngineerWithinDeadline, BRIEFING_WAIT_MS } from "./briefing";
import type { GeminiClients } from "./transport";

const assessment: Assessment = {
  placement: officeAssessment.placement,
  physical_placement: officeAssessment.physical_placement,
  never_place: [], attack_paths: [], risks: [], compliance: [], mitigations: [], confidence: 0.9,
};
const checked: SelfCheckResult = { passed: true, findings: [], paths: [], disagreements: [], revised: false };
const ready = (caution: string | null) => ({ status: "completed", output_text: JSON.stringify({ caution }) });
const client = (create: (...args: never[]) => unknown) => ({ create }) as unknown as GeminiClients["interactions"];

afterEach(() => vi.restoreAllMocks());

it("states the actual clear verdict and adds only the provider's caution topic", async () => {
  const create = vi.fn().mockResolvedValue(ready("mounting clearance"));
  await expect(briefEngineerWithinDeadline(client(create), SEED_TWIN, assessment, checked, new AbortController().signal))
    .resolves.toEqual({ kind: "ready", text: "Placement: Corporate office, Purdue 4.\nRules engine: Placement cleared.\nCaution: verify mounting clearance." });
  expect(create).toHaveBeenCalledOnce();
  expect(JSON.parse(create.mock.calls[0][0].input)).toMatchObject({ passed: true, hold: false, blocking: [] });
});

it("retries a contradictory model caution and preserves the passive scope", async () => {
  const create = vi.fn().mockResolvedValueOnce(ready("hold placement")).mockResolvedValueOnce(ready("fragile material"));
  const profile = { ...pressureProfile, object_class: "passive_object" as const };
  await expect(briefEngineerWithinDeadline(client(create), SEED_TWIN, assessment, checked, new AbortController().signal, profile))
    .resolves.toEqual({ kind: "ready", text: "Corporate office. Rules engine: Placement cleared.\nCaution: verify fragile material.\nNot a networked device: assessed for physical and food-safety compliance." });
  expect(create).toHaveBeenCalledTimes(2);
});

it("retries an unresponsive provider after a full deadline, then uses a smaller real request", async () => {
  const first = new AbortController();
  const second = new AbortController();
  const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
  const primaryTimers = [first.signal, second.signal];
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) =>
    ms === BRIEFING_WAIT_MS ? primaryTimers.shift()! : originalTimeout(ms));
  const create = vi.fn().mockImplementationOnce(() => new Promise(() => {}))
    .mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(ready(null));
  const pending = briefEngineerWithinDeadline(client(create), SEED_TWIN, assessment, checked, new AbortController().signal);
  expect(timeout).toHaveBeenCalledExactlyOnceWith(15_000);
  expect(create).toHaveBeenCalledOnce();

  first.abort(new DOMException("Deadline exceeded", "TimeoutError"));
  await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  second.abort(new DOMException("Deadline exceeded", "TimeoutError"));

  await expect(pending).resolves.toMatchObject({ kind: "ready", text: expect.stringContaining("Placement cleared") });
  expect(create).toHaveBeenCalledTimes(3);
  expect(create.mock.calls[2][0].generation_config.max_output_tokens).toBeLessThan(create.mock.calls[0][0].generation_config.max_output_tokens);
});

it("propagates capture cancellation without sending another request", async () => {
  const caller = new AbortController();
  const create = vi.fn(() => new Promise(() => {}));
  const pending = briefEngineerWithinDeadline(client(create), SEED_TWIN, assessment, checked, caller.signal);
  caller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(create).toHaveBeenCalledOnce();
});

it("reports actual unavailability after both request shapes fail with a permanent provider error", async () => {
  const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
  const create = vi.fn().mockRejectedValue(Object.assign(new Error("fixture"), { status: 403 }));
  await expect(briefEngineerWithinDeadline(client(create), SEED_TWIN, assessment, checked, new AbortController().signal))
    .resolves.toEqual({ kind: "unavailable", text: "Chief briefing is unavailable. The checked placement is available." });
  expect(diagnostic).toHaveBeenCalledTimes(2);
  expect(create).toHaveBeenCalledTimes(2);
});
