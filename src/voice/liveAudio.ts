/** Converts microphone bytes to Base64 and schedules interruptible Gemini PCM output. */
import { GEMINI_OUTPUT_RATE } from "./wav";

export function audioBase64(pcm: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(pcm)));
}

export class LiveAudio {
  private next = 0;
  private sources = new Set<AudioBufferSourceNode>();

  constructor(private readonly context: AudioContext, private readonly changed: () => void) {}

  get playing() { return this.sources.size > 0; }

  enqueue(data: string) {
    const pcm = atob(data);
    if (!pcm.length || pcm.length % 2 !== 0) return;
    const buffer = this.context.createBuffer(1, pcm.length / 2, GEMINI_OUTPUT_RATE);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const unsigned = pcm.charCodeAt(i * 2) | (pcm.charCodeAt(i * 2 + 1) << 8);
      samples[i] = (unsigned >= 32_768 ? unsigned - 65_536 : unsigned) / 32_768;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      if (!this.playing) this.changed();
    };
    const start = Math.max(this.next, this.context.currentTime + (this.playing ? 0.005 : 0.04));
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
  }
}
