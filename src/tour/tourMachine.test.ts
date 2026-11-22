/** Verifies presenter input, live captions, timeouts, and cancellation without app state. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTourArrow, TourAdvance } from "./tourAdvance";
import { pause, runTour, type TourFrame, type TourStep } from "./tourMachine";
import { LIVE_READ_MS } from "./tourPace";

const step = (title: string, run: TourStep["run"], timeoutMs = 100): TourStep => ({
  title, run, timeoutMs, initial: { text: "Waiting" }, timeoutReason: "No completion received.",
});

describe("live demo sequencing", () => {
  afterEach(() => vi.useRealTimers());

  it("requires Next before a checkpoint action and after real completion", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const advance = new TourAdvance();
    const completed = Promise.withResolvers<void>();
    const action = vi.fn();
    const frames: TourFrame[] = [];
    const job = runTour([step("Live", async ({ next, show }) => {
      await next();
      action();
      await completed.promise;
      show({ text: "Actual result" });
    })], step("Proof", async ({ show }) => show({ text: "Saved results" })),
    new AbortController().signal, (frame) => frames.push(frame), advance);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(frames.at(-1)).toMatchObject({ title: "Live", status: "ready" });
    expect(action).not.toHaveBeenCalled();
    expect(advance.press()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(action).toHaveBeenCalledOnce();
    expect(advance.press()).toBe(false);
    completed.resolve();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(frames.at(-1)).toMatchObject({ title: "Live", status: "ready", text: "Actual result" });
    expect(advance.press()).toBe(true);
    await job;
    expect(frames.at(-1)).toEqual({ index: 1, total: 1, title: "Proof", text: "Saved results", status: "done" });
  });

  it("holds live captions, drops intermediate events, and then shows the result", async () => {
    vi.useFakeTimers();
    const advance = new TourAdvance();
    const completed = Promise.withResolvers<void>();
    const frames: TourFrame[] = [];
    const job = runTour([step("Live", async ({ showLive, show }) => {
      showLive({ text: "First event" });
      showLive({ text: "Intermediate event" });
      showLive({ text: "Latest event" });
      await completed.promise;
      await show({ text: "Result" });
    }, 10_000)], step("Proof", async () => {}), new AbortController().signal, (frame) => frames.push(frame), advance);
    const caption = () => frames.at(-1)?.text;

    await vi.advanceTimersByTimeAsync(LIVE_READ_MS - 1);
    expect(caption()).toBe("First event");
    await vi.advanceTimersByTimeAsync(1);
    expect(caption()).toBe("Latest event");
    completed.resolve();
    await vi.advanceTimersByTimeAsync(LIVE_READ_MS - 1);
    expect(caption()).toBe("Latest event");
    await vi.advanceTimersByTimeAsync(1);
    expect(caption()).toBe("Result");
    expect(frames.some(({ text }) => text === "Intermediate event")).toBe(false);
    expect(advance.press()).toBe(true);
    await job;
  });

  it("holds rejected and timed-out steps until Next and discards late captions", async () => {
    vi.useFakeTimers();
    const advance = new TourAdvance();
    const frames: TourFrame[] = [];
    const late = Promise.withResolvers<void>();
    const next = vi.fn(async () => {});
    const job = runTour([
      step("Rejected", async () => { throw new Error("Provider unavailable."); }),
      step("Timed out", async ({ show }) => {
        await late.promise;
        show({ text: "Late event" });
      }, 20),
      step("Next", next),
    ], step("Proof", async () => {}), new AbortController().signal, (frame) => frames.push(frame), advance);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(frames.at(-1)?.text).toBe("Skipped · Provider unavailable.");
    expect(advance.press()).toBe(true);
    await vi.advanceTimersByTimeAsync(20);
    expect(frames.at(-1)?.text).toBe("Skipped · No completion received.");
    late.resolve();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(next).not.toHaveBeenCalled();
    expect(advance.press()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(next).toHaveBeenCalledOnce();
    expect(advance.press()).toBe(true);
    await job;
    expect(frames.some(({ text }) => text === "Late event")).toBe(false);
  });

  it.each(["live action", "Next checkpoint"])("cancels a pending %s and never performs later actions", async (phase) => {
    vi.useFakeTimers();
    const advance = new TourAdvance();
    const parent = new AbortController();
    const cleanup = vi.fn();
    const proof = vi.fn(async () => {});
    const job = runTour([step("Live", ({ signal, next }) => (phase === "live action"
      ? pause(80, signal) : next()).finally(cleanup))], step("Proof", proof), parent.signal, () => {}, advance);
    await vi.advanceTimersByTimeAsync(10);
    parent.abort();
    await job;
    await vi.runAllTimersAsync();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(advance.press()).toBe(false);
    expect(proof).not.toHaveBeenCalled();
  });

  it.each(["input", "textarea", "select", "contenteditable"])("lets ArrowRight through while editing %s", (field) => {
    const editor = { closest: vi.fn((selector: string) => selector.includes(field) ? editor : null) } as unknown as Element;
    const preventDefault = vi.fn();
    const event = { key: "ArrowRight", composedPath: () => [editor], preventDefault } as unknown as KeyboardEvent;
    const advance = vi.fn(() => true);
    handleTourArrow(event, editor, advance);
    expect(advance).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();

    handleTourArrow({ ...event, composedPath: () => [] }, null, advance);
    expect(advance).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});
