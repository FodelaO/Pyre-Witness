/** Picks the first clear label location, or the one with least overlap. */
export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlap(a: LabelBox, b: LabelBox): number {
  const width = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return width * height;
}

export function chooseLabelBox(first: LabelBox, alternatives: LabelBox[], obstacles: LabelBox[]): LabelBox {
  let result = first;
  let leastOverlap = Infinity;
  for (const candidate of [first, ...alternatives]) {
    const area = obstacles.reduce((sum, obstacle) => sum + overlap(candidate, obstacle), 0);
    if (area === 0) return candidate;
    if (area < leastOverlap) {
      result = candidate;
      leastOverlap = area;
    }
  }
  return result;
}
