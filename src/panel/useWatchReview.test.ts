/** Exercises watch disclosure across successive shortcut clicks and lens changes. */
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { LensMode } from "@/layers/lensStore";
import { useWatchReview } from "./useWatchReview";

type Step = LensMode | "click";

function runSteps(steps: Step[], narrow: boolean) {
  const states: { watchOpen: boolean; reviewsOpen: boolean; drawerOpen: boolean }[] = [];
  function Scenario() {
    const [index, advance] = useState(0);
    const [mode, setMode] = useState<LensMode>("both");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { watchOpen, reviewsOpen, toggleShortcut } = useWatchReview(mode);
    states.push({ watchOpen, reviewsOpen, drawerOpen });
    const step = steps[index];
    if (step) {
      if (step === "click") setDrawerOpen(toggleShortcut({ narrow, drawerOpen, captureOpen: false }).drawerOpen);
      else setMode(step);
      advance(index + 1);
    }
    return null;
  }
  renderToStaticMarkup(createElement(Scenario));
  return states;
}

it("second watch click restores the hero and closes the narrow drawer", () => {
  for (const narrow of [false, true]) {
    const closed = { watchOpen: false, reviewsOpen: false, drawerOpen: false };
    expect.soft(runSteps(["click", "click"], narrow)).toEqual([
      closed, { watchOpen: true, reviewsOpen: true, drawerOpen: narrow }, closed,
    ]);
  }
});

it("changing lenses preserves the open watch and expanded shortcut", () => {
  const states = runSteps(["click", "material", "data", "both"], false);
  for (const state of states.slice(1)) expect(state).toMatchObject({ watchOpen: true, reviewsOpen: true });
});
