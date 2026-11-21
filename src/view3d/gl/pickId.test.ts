/** Picking id encode / decode round trip and the id table. */
import { describe, expect, it } from "vitest";
import { decodePickId, encodePickId, MAX_PICK_ID, PickTable } from "./pickId";

describe("pick id encoding", () => {
  it("round-trips ids through RGB bytes", () => {
    for (const id of [0, 1, 92, 255, 256, 257, 65535, 65536, 1234567, MAX_PICK_ID]) {
      const [r, g, b] = encodePickId(id);
      expect([r, g, b].every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)).toBe(true);
      expect(decodePickId(r, g, b)).toBe(id);
    }
  });

  it("puts the low byte in red, like the fragment shader", () => {
    expect(encodePickId(1)).toEqual([1, 0, 0]);
    expect(encodePickId(256)).toEqual([0, 1, 0]);
    expect(encodePickId(65536)).toEqual([0, 0, 1]);
  });

  it("rejects ids that do not fit in 24 bits", () => {
    expect(() => encodePickId(-1)).toThrow(RangeError);
    expect(() => encodePickId(MAX_PICK_ID + 1)).toThrow(RangeError);
    expect(() => encodePickId(1.5)).toThrow(RangeError);
  });

  it("treats the cleared framebuffer as no hit", () => {
    expect(decodePickId(0, 0, 0)).toBe(0);
  });
});

describe("PickTable", () => {
  it("allocates stable 1-based numbers and maps them back", () => {
    const table = new PickTable();
    const tank = table.numberOf("TK-101");
    const filler = table.numberOf("FIL-3");
    expect(tank).toBe(1);
    expect(filler).toBe(2);
    expect(table.numberOf("TK-101")).toBe(1);
    expect(table.idOf(filler)).toBe("FIL-3");
    expect(table.idOf(0)).toBeNull();
    expect(table.idOf(99)).toBeNull();
  });

  it("looks up without allocating", () => {
    const table = new PickTable();
    expect(table.lookup("unknown")).toBe(0);
    expect(table.lookup(null)).toBe(0);
    table.numberOf("HMI-F3");
    expect(table.lookup("HMI-F3")).toBe(1);
  });
});
