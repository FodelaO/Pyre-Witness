/** Verifies the byte layout and validation of the WAV fallback. */
import { describe, expect, it } from "vitest";
import { isWav, pcmToWav } from "./wav";

describe("mono PCM to WAV", () => {
  it("writes a canonical 24 kHz, 16-bit little-endian WAV and preserves samples", () => {
    const pcm = Uint8Array.of(0, 128, 255, 127, 0, 0);
    const wav = pcmToWav(pcm);
    const header = new DataView(wav.buffer);
    expect(isWav(wav)).toBe(true);
    expect(header.getUint32(4, true)).toBe(wav.length - 8);
    expect(header.getUint16(20, true)).toBe(1);
    expect(header.getUint16(22, true)).toBe(1);
    expect(header.getUint32(24, true)).toBe(24_000);
    expect(header.getUint32(28, true)).toBe(48_000);
    expect(header.getUint16(34, true)).toBe(16);
    expect(header.getUint32(40, true)).toBe(pcm.length);
    expect(wav.slice(44)).toEqual(pcm);
  });

  it("rejects partial frames and distinguishes PCM from a WAV container", () => {
    expect(() => pcmToWav(Uint8Array.of(0))).toThrow();
    expect(() => pcmToWav(Uint8Array.of(0, 0), 0)).toThrow();
    expect(isWav(new Uint8Array(96))).toBe(false);
    const wav = pcmToWav(Uint8Array.of(0, 0));
    const padded = new Uint8Array(wav.length + 7);
    padded.set(wav, 7);
    expect(isWav(padded.subarray(7))).toBe(true);
  });
});
