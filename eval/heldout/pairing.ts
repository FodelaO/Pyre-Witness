// Derives Run 5 side order and blinded type-judge inputs from paired receipts.
import { SIDES, type EvaluatedItem, type Side } from "../types";

export function sideOrder(index: number): readonly Side[] {
  return index % 2 === 0 ? SIDES : ["system", "baseline"];
}

export function judgeInput({ item, observations }: EvaluatedItem, index: number) {
  const expected = item.expected.deviceType;
  const predictions = sideOrder(index).flatMap((side): [Side, string][] => {
    const type = observations[side]?.prediction?.profile?.device_type;
    return type ? [[side, type]] : [];
  });
  return expected && predictions.length ? { expected, predictions } : null;
}
