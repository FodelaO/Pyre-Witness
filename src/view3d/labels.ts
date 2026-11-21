/** Label declutter for the HTML overlay: greedy by priority, no overlapping boxes. */

export interface LabelBox {
  id: string;
  /** Anchor in CSS pixels: the label is centred horizontally and sits above this point. */
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  /** Always shown (selected, hovered, crew); still blocks lower-priority labels. */
  forced?: boolean;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const rectOf = (box: LabelBox, pad: number): Rect => ({
  left: box.x - box.width / 2 - pad,
  right: box.x + box.width / 2 + pad,
  top: box.y - box.height - pad,
  bottom: box.y + pad,
});

const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Returns the ids to show. Higher priority wins; forced labels are always kept. */
export function declutter(boxes: readonly LabelBox[], pad = 3): Set<string> {
  const ordered = [...boxes].sort((a, b) => Number(b.forced ?? false) - Number(a.forced ?? false) || b.priority - a.priority);
  const placed: Rect[] = [];
  const shown = new Set<string>();
  for (const box of ordered) {
    const rect = rectOf(box, pad);
    if (!box.forced && placed.some((other) => overlaps(rect, other))) continue;
    placed.push(rect);
    shown.add(box.id);
  }
  return shown;
}

/** Rough width of a monospace tag at a font size, without measuring the DOM every frame. */
export function estimateWidth(text: string, fontSize: number, padding = 12): number {
  return text.length * fontSize * 0.62 + padding;
}
