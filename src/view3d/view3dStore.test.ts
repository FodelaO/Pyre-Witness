/** View preference survives the temporary 2D simulation stage. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIMULATION_NOTICE, useView3DStore } from "./view3dStore";

const state = useView3DStore.getState;
const setItem = vi.fn();

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: { setItem } });
  setItem.mockClear();
  useView3DStore.setState(useView3DStore.getInitialState(), true);
});

afterEach(() => vi.unstubAllGlobals());

describe("simulation view", () => {
  it("defaults to 3D and restores it after temporary 2D, even after dismissing the notice", () => {
    expect(state().enabled).toBe(true);
    state().showIn2D(SIMULATION_NOTICE);
    state().showIn2D(SIMULATION_NOTICE);
    expect(state()).toMatchObject({ enabled: false, resume3D: true, notice: SIMULATION_NOTICE });
    state().clearNotice();
    state().restoreAfterSimulation();
    expect(state()).toMatchObject({ enabled: true, resume3D: null, notice: null });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps a chosen 2D view after the simulation", () => {
    state().chooseView(false);
    state().showIn2D(SIMULATION_NOTICE);
    expect(state().notice).toBeNull();
    state().restoreAfterSimulation();
    expect(state().enabled).toBe(false);
    expect(setItem.mock.calls).toEqual([["pw-view", "2d"]]);
  });

  it("keeps an explicit 2D choice made during playback", () => {
    state().showIn2D(SIMULATION_NOTICE);
    state().chooseView(false);
    state().restoreAfterSimulation();
    expect(state().enabled).toBe(false);
    expect(setItem.mock.calls).toEqual([["pw-view", "2d"]]);
  });

  it("queues a 3D request until playback ends", () => {
    state().chooseView(false);
    state().showIn2D(SIMULATION_NOTICE);
    state().chooseView(true);
    expect(state().enabled).toBe(false);
    state().restoreAfterSimulation();
    expect(state().enabled).toBe(true);
    expect(setItem.mock.calls).toEqual([["pw-view", "2d"], ["pw-view", "3d"]]);
  });
});
