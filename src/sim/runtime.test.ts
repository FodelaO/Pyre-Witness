/** Checks the browser clock pauses the plant and replay while the page is hidden. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTwinStore } from "@/twin/store";
import { startSimRuntime } from "./runtime";
import { useSimStore } from "./simStore";

let document: EventTarget & { hidden: boolean };
let stop: () => void;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  document = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", { setInterval, clearInterval, location: { pathname: "/" } });
  stop = startSimRuntime();
});

afterEach(() => {
  stop();
  useSimStore.getState().reset();
  useSimStore.getState().setSpeed(1);
  useTwinStore.getState().reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("resumes visible plant ticks and replay without catching up hidden time", () => {
  const station = useTwinStore.getState();
  vi.advanceTimersByTime(1200);
  expect(useTwinStore.getState().twin).not.toBe(station.twin);
  useSimStore.getState().start("cip");
  vi.advanceTimersByTime(880);
  const before = useTwinStore.getState().twin;
  const elapsed = useSimStore.getState().elapsed;
  expect(elapsed).toBeGreaterThan(0);
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(6000);
  expect(useTwinStore.getState().twin).toBe(before);
  expect(useSimStore.getState().elapsed).toBe(elapsed);

  document.hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(1200);
  expect(useTwinStore.getState().twin).not.toBe(before);
  expect(useSimStore.getState().elapsed - elapsed).toBeCloseTo(1.2);
});

it("finishes the approved CIP branch replay at six seconds on the same running clock", () => {
  const { setSpeed, start, togglePlayback } = useSimStore.getState();
  setSpeed(4);
  start("cip");
  vi.advanceTimersByTime(3300);
  expect(useSimStore.getState()).toMatchObject({ mode: "finished", elapsed: 12 });
  const isolation = () => useTwinStore.getState().mitigations.find(({ id }) => id === "sim-cip-isolate");
  const projection = { before: 12, after: 6, safeguard: "CIP branch isolation" };
  expect(isolation()).toMatchObject({ riskDelta: 0, simulationContainment: projection });
  useTwinStore.getState().decideMitigation("sim-cip-isolate", "approved");
  expect(isolation()).toMatchObject({ status: "applied", riskDelta: 0, simulationContainment: projection });
  togglePlayback();
  vi.advanceTimersByTime(1800);
  expect(useSimStore.getState()).toMatchObject({ mode: "finished", elapsed: 6, run: { containedAt: 6 } });
});
