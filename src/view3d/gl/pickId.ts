/**
 * Picking ids: every pickable scene node gets an integer (1-based, 0 = nothing). The pick pass
 * writes it as an RGB8 colour; these helpers mirror the GLSL encoding and decode the read pixel.
 */

export const MAX_PICK_ID = 256 * 256 * 256 - 1;

/** Integer id -> [r, g, b] bytes (low byte in red), exactly as the fragment shader writes it. */
export function encodePickId(id: number): [number, number, number] {
  if (!Number.isInteger(id) || id < 0 || id > MAX_PICK_ID) throw new RangeError("pick id out of range: " + id);
  return [id & 255, (id >> 8) & 255, (id >> 16) & 255];
}

/** RGB bytes read back from the pick framebuffer -> integer id (0 = background). */
export function decodePickId(r: number, g: number, b: number): number {
  return (r & 255) + ((g & 255) << 8) + ((b & 255) << 16);
}

/** Two-way table between twin ids (asset / entry point ids) and pick integers. */
export class PickTable {
  private readonly ids: string[] = [];
  private readonly numbers = new Map<string, number>();

  /** Returns the stable integer for an id, allocating the next one on first use. */
  numberOf(id: string): number {
    const known = this.numbers.get(id);
    if (known) return known;
    this.ids.push(id);
    this.numbers.set(id, this.ids.length);
    return this.ids.length;
  }

  /** Integer without allocating: 0 when the id is not in the scene. */
  lookup(id: string | null | undefined): number {
    return (id && this.numbers.get(id)) || 0;
  }

  idOf(number: number): string | null {
    return this.ids[number - 1] ?? null;
  }
}
