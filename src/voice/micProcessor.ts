/** Captures short mono blocks in the browser audio rendering thread. */
export const MIC_PROCESSOR = `
class ChiefMic extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frames = new Float32Array(Math.round(sampleRate * 0.032));
    this.used = 0;
    this.finished = false;
    this.port.onmessage = () => {
      this.finished = true;
      this.flush();
      this.port.postMessage({ done: true });
    };
  }

  flush() {
    if (!this.used) return;
    const pcm = new ArrayBuffer(this.used * 2);
    const bytes = new DataView(pcm);
    let energy = 0;
    for (let i = 0; i < this.used; i++) {
      const sample = Math.max(-1, Math.min(1, this.frames[i]));
      bytes.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
      energy += sample * sample;
    }
    const level = Math.sqrt(energy / this.used);
    this.used = 0;
    this.port.postMessage({ pcm, level }, [pcm]);
  }

  process(inputs) {
    if (this.finished) return false;
    const channel = inputs[0]?.[0];
    if (channel) {
      for (const sample of channel) {
        this.frames[this.used++] = sample;
        if (this.used === this.frames.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor("chief-mic", ChiefMic);
`;
