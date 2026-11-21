/** Formats the actual and counterfactual results of a completed tabletop exercise. */
import type { SimRun } from "./types";

export function counterfactualText({ counterfactual }: SimRun): string {
  const { removedControl, heldBy, containedAt, consequence } = counterfactual;
  if (!removedControl) return `No credited safeguard to remove · ${consequence.summary}`;
  const hold = heldBy ? ` · ${heldBy} held at ${containedAt} s` : "";
  return `Without ${removedControl} · ${consequence.summary}${hold}`;
}
