/** Reserves room for node symbols, finding badges and text on the network drawing. */
import { FOOTPRINT } from "@/equipment/types";
import { assetLabel, labelAboveWashdown } from "@/floor/assetLabel";
import type { LabelBox } from "@/floor/labelPlacement";
import type { Area, Asset, Twin } from "@/twin/types";

export function symbolBox({ physical }: Asset): LabelBox {
  const { w, h } = FOOTPRINT[physical.kind];
  const angle = physical.rotation * Math.PI / 180;
  const scale = physical.scale ?? 1;
  const width = scale * (Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle)));
  const height = scale * (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle)));
  return { x: physical.x - width / 2, y: physical.y - height / 2, w: width, h: height };
}

export function findingBadgeBox(symbol: LabelBox, width: number): LabelBox {
  return { x: symbol.x + symbol.w - 10, y: symbol.y - 10, w: width, h: 18 };
}

export function tagBox(asset: Asset, symbol: LabelBox, washdown: Area["bounds"] | undefined, fitScale: number, scale: number): LabelBox {
  const w = (assetLabel(asset).length * 6 + 4) / scale;
  const above = labelAboveWashdown(asset.physical.x, symbol.y + symbol.h, washdown, fitScale);
  const y = above ? symbol.y - 17 / scale : symbol.y + symbol.h;
  return { x: asset.physical.x - w / 2, y, w, h: 14 / scale };
}

export function networkLabelObstacles(rooms: readonly Area[], scale: number, marks: readonly LabelBox[]): LabelBox[] {
  const obstacleBoxes = [...marks];
  for (const { bounds, kind } of rooms) {
    if (kind === "context") continue;
    obstacleBoxes.push({ ...bounds, y: bounds.y - 7 / scale, h: 31 / scale });
  }
  return obstacleBoxes;
}

export function annotationFits(box: LabelBox, canvas: Twin["plant"]["canvas"], obstacles: readonly LabelBox[]): boolean {
  if (box.x < 6 || box.y < 6 || box.x + box.w > canvas.w - 6 || box.y + box.h > canvas.h - 6) return false;
  return obstacles.every(({ x, y, w, h }) => box.x + box.w + 4 <= x || box.x >= x + w + 4
    || box.y + box.h + 4 <= y || box.y >= y + h + 4);
}
