/** Wraps mono, signed little-endian 16-bit PCM in a browser-playable WAV container. */
export const GEMINI_OUTPUT_RATE = 24_000;

export function pcmToWav(pcm: Uint8Array, sampleRate = GEMINI_OUTPUT_RATE): Uint8Array<ArrayBuffer> {
  if (!pcm.length || pcm.length % 2 !== 0 || !Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error("Invalid mono PCM audio.");
  }
  const wav = new Uint8Array(44 + pcm.length);
  const header = new DataView(wav.buffer);
  header.setUint32(0, 0x52494646); // RIFF
  header.setUint32(4, wav.length - 8, true);
  header.setUint32(8, 0x57415645); // WAVE
  header.setUint32(12, 0x666d7420); // fmt
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true); // Linear PCM
  header.setUint16(22, 1, true); // Mono
  header.setUint32(24, sampleRate, true);
  header.setUint32(28, sampleRate * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  header.setUint32(36, 0x64617461); // data
  header.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
}

export function isWav(audio: Uint8Array): boolean {
  if (audio.length <= 44) return false;
  const header = new DataView(audio.buffer, audio.byteOffset, audio.byteLength);
  return header.getUint32(0) === 0x52494646 && header.getUint32(8) === 0x57415645;
}
