/** Audits the live demo for honest, event-driven captions, cleanup on Stop or timeout, and single-run locking. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import heldout from "../../eval/heldout/results.json";
import { TourLock } from "./tourLock";
import { runTour, type TourCue, type TourFrame, type TourStep } from "./tourMachine";
import { TourAdvance } from "./tourAdvance";

const here = import.meta.dirname;
const sources = readdirSync(here)
  .filter((name) => /\.tsx?$/.test(name) && !name.endsWith(".test.ts"))
  .map((name) => ({ name, text: readFileSync(join(here, name), "utf8") }));

type FakeOptions = { text?: string; attrs?: Record<string, string>; click?: () => void };
function fakeElement({ text = "", attrs = {}, click = () => {} }: FakeOptions = {}) {
  return {
    textContent: text, disabled: false, isConnected: true,
    getClientRects: () => [{}], closest: () => null, scrollIntoView: () => {},
    getAttribute: (name: string) => attrs[name] ?? null, click,
  };
}

function stubDom(elements: Record<string, ReturnType<typeof fakeElement>[]>) {
  vi.stubGlobal("document", { querySelectorAll: (selector: string) => elements[selector] ?? [], querySelector: () => null });
  vi.stubGlobal("getComputedStyle", () => ({ visibility: "visible" }));
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.doUnmock("../../eval/heldout/results.json");
  vi.resetModules();
});

describe("no invented numbers or timer-driven steps", () => {
  it("contains no hard-typed percentages or scores in tour captions", () => {
    for (const { name, text } of sources) {
      expect(text, name).not.toMatch(/["'`][^"'`\n]*\d+\s?%[^"'`\n]*["'`]/);
      expect(text, name).not.toMatch(/(?:risk|score|recall|naming)\s+\d/i);
    }
  });

  it("limits timers to live-caption dwell, the per-step skip timeout, and UI polling", () => {
    const count = (pattern: RegExp) => Object.fromEntries(sources
      .map(({ name, text }) => [name, text.match(pattern)?.length ?? 0] as const).filter(([, n]) => n > 0));
    // tourMachine: pause() and the step timeout. tourDom: a poll that only re-reads real UI state.
    expect(count(/\bsetTimeout\(/g)).toEqual({ "tourMachine.ts": 2 });
    expect(count(/\bsetInterval\(/g)).toEqual({ "tourDom.ts": 1 });
  });

  it("holds a step that receives no completion until its timeout, then skips with the reason", async () => {
    vi.useFakeTimers();
    const frames: TourFrame[] = [];
    const next = vi.fn(async () => {});
    const advance = new TourAdvance();
    const job = runTour([
      { title: "Silent", initial: { text: "Waiting" }, timeoutMs: 10_000, timeoutReason: "No event arrived.", run: () => new Promise(() => {}) },
      { title: "Next", initial: { text: "Next" }, timeoutMs: 100, timeoutReason: "x", run: next },
    ], { title: "Proof", initial: { text: "Proof" }, timeoutMs: 100, timeoutReason: "x", run: async () => {} },
    new AbortController().signal, (frame) => frames.push(frame), advance);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(frames.map(({ title, status }) => `${title}:${status}`)).toEqual(["Silent:running"]);
    expect(next).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(frames.at(-1)).toMatchObject({ title: "Silent", status: "skipped", text: "Skipped · No event arrived." });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(next).not.toHaveBeenCalled();
    expect(advance.press()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(advance.press()).toBe(true);
    await job;
    expect(next).toHaveBeenCalledTimes(1);
    expect(frames.at(-1)).toMatchObject({ title: "Proof", status: "done" });
  });
});

describe("held-out proof caption", () => {
  const proofLink = 'a[href="/proof"][aria-label="Proof"]';

  async function proofCaption() {
    stubDom({ [proofLink]: [fakeElement()] });
    const { proofStep } = await import("./proofStep");
    const cues: TourCue[] = [];
    await proofStep.run({
      signal: new AbortController().signal,
      show: (cue) => { cues.push(cue); },
      showLive: () => {},
      next: async () => {},
    });
    return cues.at(-1)?.text;
  }

  it("matches eval/heldout/results.json", async () => {
    const metric = (key: string) => heldout.metrics.find((entry) => entry.key === key)!;
    const risk = metric("riskRecall");
    const naming = metric("deviceTypeMatch");
    expect(await proofCaption()).toBe(`Key-risk recall ${percent(risk.system.value)} vs ${percent(risk.baseline.value)}`
      + ` · Device naming ${percent(naming.system.value)} vs ${percent(naming.baseline.value)}.`);
  });

  it("follows the artifact when it changes and skips when a metric is missing", async () => {
    vi.doMock("../../eval/heldout/results.json", () => ({ default: { metrics: [
      { key: "riskRecall", system: { value: 0.12 }, baseline: { value: 0.34 } },
      { key: "deviceTypeMatch", system: { value: 0.56 }, baseline: { value: 0.78 } },
    ] } }));
    expect(await proofCaption()).toBe("Key-risk recall 12% vs 34% · Device naming 56% vs 78%.");

    vi.resetModules();
    vi.doMock("../../eval/heldout/results.json", () => ({ default: { metrics: [
      { key: "riskRecall", system: { value: 0.12 }, baseline: { value: null } },
    ] } }));
    await expect(proofCaption()).rejects.toThrow("The held-out comparison is incomplete.");
  });
});

describe("test escalation cleanup", () => {
  it.each([
    ["Stop or Escape", () => new DOMException("Stopped", "AbortError")],
    ["step timeout", () => new Error("The test escalation did not finish in time.")],
  ])("clears the drill it started on %s", async (_, reason) => {
    const [{ runTestAlert, TEST_ASSET_ID }, { useTwinStore }, { useEscalationStore }, { createOperations }] = await Promise.all([
      import("@/escalation/testScenario"), import("@/twin/store"), import("@/escalation/store"), import("./operationsSteps"),
    ]);
    stubDom({
      'button[aria-label="Escalation thresholds"]': [fakeElement({ attrs: { "aria-expanded": "true" } })],
      '[aria-label="Escalation settings"] .pw-es-test-action': [fakeElement({ text: "Run test alert", click: () => runTestAlert() })],
    });
    const hasTest = () => useTwinStore.getState().twin.assets.some(({ id }) => id === TEST_ASSET_ID);
    expect(hasTest()).toBe(false);

    const controller = new AbortController();
    const step = createOperations().steps.find(({ title }) => title === "Review a test escalation")!;
    vi.useFakeTimers();
    const advance = new TourAdvance();
    const run = step.run({ signal: controller.signal, show: () => {}, showLive: () => {},
      next: () => advance.wait(controller.signal, () => {}) });
    await vi.advanceTimersByTimeAsync(0);
    expect(hasTest()).toBe(false);
    expect(advance.press()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(hasTest()).toBe(false);
    expect(advance.press()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(hasTest()).toBe(true);
    controller.abort(reason());
    await expect(run).rejects.toBeDefined();
    expect(hasTest()).toBe(false);
    expect(useEscalationStore.getState().records.some(({ trigger, resolvedAt }) => trigger.test && resolvedAt === undefined))
      .toBe(false);
  });
});

describe("single live tour", () => {
  it("refuses a second run until the first is released or stopped", () => {
    const lock = new TourLock();
    const first = lock.acquire()!;
    expect(first).toBeInstanceOf(AbortController);
    expect(lock.acquire()).toBeNull();
    expect(lock.running).toBe(true);

    lock.stop();
    expect(first.signal.aborted).toBe(true);
    expect(lock.running).toBe(false);

    const second = lock.acquire()!;
    // The stopped run finishing late must not free the replay that replaced it.
    expect(lock.release(first)).toBe(false);
    expect(lock.acquire()).toBeNull();
    expect(lock.release(second)).toBe(true);
    expect(lock.acquire()).not.toBeNull();
  });

  it("launches every run through the shared lock", () => {
    const launcher = sources.find(({ name }) => name === "PlayDemo.tsx")!.text;
    const controller = sources.find(({ name }) => name === "controller.ts")!.text;
    expect(launcher).toContain("tourController.start");
    expect(launcher).toContain("tourController.stop");
    expect(controller).toContain("tourLock.acquire()");
    expect(launcher).not.toMatch(/new AbortController\(/);
  });
});
