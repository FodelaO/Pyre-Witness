/** Keeps the network's smallest primary lettering (10.2 units) above 9 CSS pixels. */
export function printScale(pixelsPerUnit: number): number {
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return 1;
  return Math.max(1, 0.89 / pixelsPerUnit);
}
