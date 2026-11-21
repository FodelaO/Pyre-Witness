/** Formats the actual and counterfactual results of a completed tabletop exercise. */
import type { SimRun } from "./types";

export function formatSimTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60).toString().padStart(2, "0");
  return minutes + ":" + (whole % 60).toString().padStart(2, "0");
}

export function counterfactualText({ counterfactual }: SimRun): string {
  const { removedControl, heldBy, containedAt, consequence } = counterfactual;
  if (!removedControl) return "No credited safeguard to remove";
  const hold = heldBy ? ` · ${heldBy} held at ${containedAt} s` : "";
  return `Without ${removedControl} · ${consequence.summary}${hold}`;
}
