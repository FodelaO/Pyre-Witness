/** Stable step IDs shared by the demo controls and the Live tool schema. */
export const TOUR_STEP_IDS = [
  "capture", "placement", "better-option", "threat-watch", "approve-todo", "test-alert", "clear-test", "proof",
] as const;

export type TourStepId = typeof TOUR_STEP_IDS[number];

export function isTourStepId(value: unknown): value is TourStepId {
  return TOUR_STEP_IDS.some((id) => id === value);
}
