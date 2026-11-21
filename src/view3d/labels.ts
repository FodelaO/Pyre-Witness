/** Label declutter for the HTML overlay: greedy by priority, no overlapping boxes. */

interface Point {
  x: number;
  y: number;
}

export interface LabelBox extends Point {
  id: string;
  width: number;
  height: number;
  priority: number;
  /** Other anchors within the same room, in order of preference. */
  alternates?: readonly Point[];
  /** Crew plates can be lifted above the foot of their stem. */
  lift?: number;
  /** Always shown (selected, hovered, crew); still blocks lower-priority labels. */
  forced?: boolean;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const rectOf = (box: LabelBox, point: Point, pad: number): Rect => ({
  left: point.x - box.width / 2 - pad,
  right: point.x + box.width / 2 + pad,
  top: point.y - (box.lift ?? 0) - box.height - pad,
  bottom: point.y - (box.lift ?? 0) + pad,
});

const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Returns visible labels and their anchors. Higher priority wins; forced labels are always kept. */
export function declutter(boxes: readonly LabelBox[], pad = 3): Map<string, Point> {
  const ordered = [...boxes].sort((a, b) => Number(b.forced ?? false) - Number(a.forced ?? false) || b.priority - a.priority);
  const placed: Rect[] = [];
  const shown = new Map<string, Point>();
  for (const box of ordered) {
    let point: Point = box;
    let rect = rectOf(box, point, pad);
    if (!box.forced && placed.some((other) => overlaps(rect, other))) {
      const alternate = box.alternates?.find((candidate) =>
        !placed.some((other) => overlaps(rectOf(box, candidate, pad), other)));
      if (!alternate) continue;
      point = alternate;
      rect = rectOf(box, point, pad);
    }
    placed.push(rect);
    shown.set(box.id, point);
  }
  return shown;
}

/** Rough width of a monospace tag at a font size, without measuring the DOM every frame. */
export function estimateWidth(text: string, fontSize: number, padding = 12): number {
  return text.length * fontSize * 0.62 + padding;
}
