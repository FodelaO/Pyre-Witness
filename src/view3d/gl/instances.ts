/** Packs scene parts into per-(layer, primitive) Float32Array instance buffers. */
import type { Part, Layer } from "../parts";
import type { Prim } from "./geometry";

/** mat4 (16) + colour rgba (4) + misc (emissive, pattern, param, id) + extra (spin, pivot x, pivot z, edge). */
export const FLOATS_PER_INSTANCE = 28;

export interface Batch {
  layer: Layer;
  prim: Prim;
  data: Float32Array;
  count: number;
}

export interface IdentifiedParts {
  /** Picking / highlight integer shared by every part of the node (0 = none). */
  pickNumber: number;
  parts: readonly Part[];
}

export function packParts(groups: readonly IdentifiedParts[]): Batch[] {
  const counts = new Map<string, number>();
  for (const group of groups) {
    for (const part of group.parts) {
      const key = part.layer + ":" + part.prim;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const batches = new Map<string, Batch>();
  const cursor = new Map<string, number>();
  for (const [key, count] of counts) {
    const [layer, prim] = key.split(":") as [Layer, Prim];
    batches.set(key, { layer, prim, count, data: new Float32Array(count * FLOATS_PER_INSTANCE) });
    cursor.set(key, 0);
  }
  for (const group of groups) {
    for (const part of group.parts) {
      const key = part.layer + ":" + part.prim;
      const batch = batches.get(key) as Batch;
      const offset = cursor.get(key) as number;
      const d = batch.data;
      d.set(part.m, offset);
      d[offset + 16] = part.color[0];
      d[offset + 17] = part.color[1];
      d[offset + 18] = part.color[2];
      d[offset + 19] = part.alpha;
      d[offset + 20] = part.emissive;
      d[offset + 21] = part.pattern;
      d[offset + 22] = part.param;
      d[offset + 23] = group.pickNumber;
      d[offset + 24] = part.spin;
      d[offset + 25] = part.pivot[0];
      d[offset + 26] = part.pivot[1];
      d[offset + 27] = part.edge;
      cursor.set(key, offset + FLOATS_PER_INSTANCE);
    }
  }
  return [...batches.values()];
}
