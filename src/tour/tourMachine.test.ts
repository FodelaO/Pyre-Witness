/** Verifies sequencing, timeouts, failure visibility, and cancellation without app state. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { pause, runTour, type TourFrame, type TourStep } from "./tourMachine";

const step = (title: string, run: TourStep["run"], timeoutMs = 100): TourStep => ({
  title, run, timeoutMs, initial: { text: "Waiting" }, timeoutReason: "No completion received.",
});

describe("live demo sequencing", () => {
  afterEach(() => vi.useRealTimers());

  it("waits for the action to complete before advancing and keeps proof outside the count", async () => {
    const action = Promise.withResolvers<void>();
    const frames: TourFrame[] = [];
    const job = runTour([step("Live", ({ show }) => {
      show({ text: "Actual event" });
      return action.promise;
    })], step("Proof", async ({ show }) => show({ text: "Saved results" })),
    new AbortController().signal, (frame) => frames.push(frame));
    await Promise.resolve();
    expect(frames.map(({ title, text }) => [title, text])).toEqual([["Live", "Waiting"], ["Live", "Actual event"]]);
    action.resolve();
    await job;
    expect(frames.at(-1)).toEqual({ index: 1, total: 1, title: "Proof", text: "Saved results", status: "done" });
  });

  it("shows both rejected and timed-out steps, then runs the following action", async () => {
    vi.useFakeTimers();
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
    ], step("Proof", async () => {}), new AbortController().signal, (frame) => frames.push(frame), 10);

    await vi.advanceTimersByTimeAsync(29);
    expect(frames.at(-1)?.status).toBe("running");
    await vi.advanceTimersByTimeAsync(1);
    expect(frames.at(-1)?.text).toBe("Skipped · No completion received.");
    late.resolve();
    await vi.advanceTimersByTimeAsync(10);
    await job;
    expect(next).toHaveBeenCalledTimes(1);
    expect(frames.filter(({ status }) => status === "skipped").map(({ text }) => text))
      .toEqual(["Skipped · Provider unavailable.", "Skipped · No completion received."]);
    expect(frames.some(({ text }) => text === "Late event")).toBe(false);
  });

  it("cancels a pending step and never performs later actions", async () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    const cleanup = vi.fn();
    const proof = vi.fn(async () => {});
    const frames: TourFrame[] = [];
    const job = runTour([step("Live", ({ signal }) => pause(80, signal).finally(cleanup))],
      step("Proof", proof), parent.signal, (frame) => frames.push(frame));
    await vi.advanceTimersByTimeAsync(10);
    parent.abort();
    await job;
    await vi.runAllTimersAsync();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(proof).not.toHaveBeenCalled();
    expect(frames.map(({ status }) => status)).toEqual(["running"]);
  });
});
