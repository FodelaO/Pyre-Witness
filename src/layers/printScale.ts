/**
 * Network lettering is drawn in plant units, so a small fitted drawing (a 1280x720 projector) shrinks it
 * to about 5 px. This returns how much to enlarge each mark about its own anchor so it prints near 8 px.
 */
export function printScale(pixelsPerUnit: number): number {
  if (!(pixelsPerUnit > 0)) return 1;
  return Math.round(Math.min(1.6, Math.max(1, 0.68 / pixelsPerUnit)) * 100) / 100;
}
