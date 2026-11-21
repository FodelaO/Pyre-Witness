/** Checks timeline scrubbing jumps to a stage, pauses mid-run and finishes on the last stage. */
import { afterEach, expect, it } from "vitest";
import { useTwinStore } from "@/twin/store";
import { useSimStore } from "./simStore";

afterEach(() => {
  useSimStore.getState().reset();
  useTwinStore.getState().reset();
});

it("seeks back to a stage and pauses, then forward to the outcome", () => {
  const sim = useSimStore.getState();
  sim.start("cip");
  const stages = useSimStore.getState().run!.stages;
  expect(stages.length).toBeGreaterThan(2);
  sim.seek(stages.length - 1);
  let state = useSimStore.getState();
  expect(state.mode).toBe("finished");
  expect(state.outcome).toBeTruthy();
  sim.seek(1);
  state = useSimStore.getState();
  expect(state.mode).toBe("paused");
  expect(state.currentStage).toBe(1);
  expect(state.elapsed).toBe(stages[1].t);
  expect(state.outcome).toBeNull();
  sim.seek(99);
  expect(useSimStore.getState().currentStage).toBe(1);
});
