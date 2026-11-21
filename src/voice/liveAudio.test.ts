/** Verifies PCM sample alignment across arbitrary HTTP response boundaries. */
import { describe, expect, it } from "vitest";
import { PcmFrames } from "./liveAudio";

describe("streamed PCM frames", () => {
  it("preserves sample boundaries when a read ends on the low byte", () => {
    const frames = new PcmFrames();
    expect(frames.push(Uint8Array.of(0x34))).toHaveLength(0);
    expect(frames.push(new Uint8Array(0))).toHaveLength(0);
    expect(frames.push(Uint8Array.of(0x12, 0x00, 0x80, 0xff))).toEqual(Uint8Array.of(0x34, 0x12, 0x00, 0x80));
    expect(frames.push(Uint8Array.of(0x7f, 0x00, 0x00))).toEqual(Uint8Array.of(0xff, 0x7f, 0x00, 0x00));
  });

  it("passes an aligned subarray without exposing adjacent bytes", () => {
    const frames = new PcmFrames();
    const bytes = Uint8Array.of(7, 0, 128, 8);
    expect(frames.push(bytes.subarray(1, 3))).toEqual(Uint8Array.of(0, 128));
    expect(frames.push(Uint8Array.of(0x34, 0x12))).toEqual(Uint8Array.of(0x34, 0x12));
  });
});
