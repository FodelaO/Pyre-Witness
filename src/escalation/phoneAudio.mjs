/** Provides gesture-unlocked ringing and playback of the unmodified Chief speech WAV. */
export class PhoneAudio {
  context = null;
  ringing;
  bellGain = null;
  briefing = null;
  request = null;
  cache = null;

  async enable() {
    const context = this.context ??= new AudioContext();
    if (context.state !== "running") await context.resume();
    return context;
  }

  ring() {
    if (this.ringing || this.context?.state !== "running") return;
    const context = this.context;
    const bellGain = context.createGain();
    bellGain.gain.value = 0.14;
    bellGain.connect(context.destination);
    this.bellGain = bellGain;

    function pulse() {
      for (const offset of [0, 0.31]) {
        const now = context.currentTime + offset;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
        gain.connect(bellGain);
        for (const frequency of [440, 554]) {
          const tone = context.createOscillator();
          tone.frequency.value = frequency;
          tone.connect(gain);
          tone.start(now);
          tone.stop(now + 0.24);
        }
      }
      navigator.vibrate?.([160, 110, 160]);
    }

    pulse();
    this.ringing = setInterval(pulse, 2400);
  }

  stopRing() {
    if (this.ringing !== undefined) navigator.vibrate?.(0);
    clearInterval(this.ringing);
    this.ringing = undefined;
    this.bellGain?.disconnect();
    this.bellGain = null;
  }

  stopSpeech() {
    this.request?.abort();
    this.request = null;
    const source = this.briefing;
    if (source) {
      source.onended = null;
      source.stop();
      this.briefing = null;
    }
  }

  async speak(id, script, onGenerated, onEnd) {
    this.stopSpeech();
    this.stopRing();
    const request = new AbortController();
    this.request = request;
    const context = await this.enable();
    let buffer = this.cache?.id === id ? this.cache.buffer : null;
    if (!buffer) {
      const response = await fetch("/api/voice/speak", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "audio/wav" },
        body: JSON.stringify({ text: script }), signal: request.signal,
      });
      if (!response.ok) throw new Error("Chief audio unavailable. Read the call script.");
      buffer = await context.decodeAudioData(await response.arrayBuffer());
      request.signal.throwIfAborted();
      onGenerated(buffer.duration);
      if (buffer.duration > 25) throw new Error("Chief audio exceeded 25 seconds. Read the call script.");
      this.cache = { id, buffer };
    }
    request.signal.throwIfAborted();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (this.briefing === source) {
        this.briefing = null;
        onEnd();
      }
    };
    this.briefing = source;
    source.start();
  }

  close() {
    this.stopRing();
    this.stopSpeech();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.cache = null;
  }
}
