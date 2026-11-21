/** Checks keyboard focus against the dimension actually selected by the view store. */
import { afterEach, expect, it, vi } from "vitest";
import { handleViewArrow } from "@/view3d/View3DToggle";
import { useView3DStore } from "@/view3d/view3dStore";

afterEach(() => useView3DStore.setState(useView3DStore.getInitialState()));

it("view arrows focus the selected dimension", () => {
  const buttons = [{ focus: vi.fn() }, { focus: vi.fn() }];
  for (const [key, enabled] of [["ArrowLeft", false], ["ArrowRight", true]] as const) {
    expect(handleViewArrow(key, buttons)).toBe(true);
    expect(useView3DStore.getState().enabled).toBe(enabled);
    expect(buttons[Number(enabled)].focus).toHaveBeenCalledOnce();
  }
});

it("keeps focus on 2D when playback defers the 3D choice", () => {
  const buttons = [{ focus: vi.fn() }, { focus: vi.fn() }];
  useView3DStore.getState().showIn2D("Simulation shown in 2D");
  handleViewArrow("ArrowRight", buttons);
  expect(useView3DStore.getState()).toMatchObject({ enabled: false, resume3D: true });
  expect(buttons[0].focus).toHaveBeenCalledOnce();
  expect(buttons[1].focus).not.toHaveBeenCalled();
});
