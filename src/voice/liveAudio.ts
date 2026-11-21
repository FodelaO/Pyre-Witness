/** Converts microphone bytes to Base64 and plays interruptible streams of Gemini PCM. */
import { GEMINI_OUTPUT_RATE } from "./wav";

export function audioBase64(pcm: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(pcm)));
}

/** HTTP chunks may divide a 16-bit sample between reads. */
export class PcmFrames {
  private trailingByte: number | undefined;

  push(chunk: Uint8Array): Uint8Array {
    if (!chunk.length) return chunk;
    let bytes = chunk;
    if (this.trailingByte !== undefined) {
      bytes = new Uint8Array(chunk.length + 1);
      bytes[0] = this.trailingByte;
      bytes.set(chunk, 1);
    }
    const aligned = bytes.length - (bytes.length % 2);
    this.trailingByte = bytes[aligned];
    return bytes.subarray(0, aligned);
  }
}

export class PcmPlayback {
  private next = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private frames = new PcmFrames();

  constructor(private readonly context: AudioContext, private readonly drained: () => void,
    private readonly leadSeconds = 0.04) {}

  get playing() { return this.sources.size > 0; }

  enqueue(data: string) {
    this.enqueuePcm(Uint8Array.from(atob(data), (byte) => byte.charCodeAt(0)));
  }

  enqueuePcm(chunk: Uint8Array) {
    const pcm = this.frames.push(chunk);
    if (!pcm.length) return;
    const buffer = this.context.createBuffer(1, pcm.length / 2, GEMINI_OUTPUT_RATE);
    const samples = buffer.getChannelData(0);
    const data = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    for (let i = 0; i < samples.length; i++) samples[i] = data.getInt16(i * 2, true) / 32_768;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      if (!this.playing) this.drained();
    };
    const start = Math.max(this.next, this.context.currentTime + (this.playing ? 0.005 : this.leadSeconds));
    source.start(start);
    this.next = start + buffer.duration;
    this.sources.add(source);
  }

  stop() {
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
    this.next = 0;
    this.frames = new PcmFrames();
  }
}
