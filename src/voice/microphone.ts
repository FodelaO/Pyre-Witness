/** Starts capture only for a gesture-held turn and releases the physical microphone on release. */
import { MIC_PROCESSOR } from "./micProcessor";

export interface MicBlock { pcm: ArrayBuffer; level: number; sampleRate: number }

export interface Microphone {
  finish(): Promise<void>;
  cancel(): void;
}

const modules = new WeakMap<AudioContext, Promise<void>>();

function prepare(context: AudioContext): Promise<void> {
  const previous = modules.get(context);
  if (previous) return previous;
  const url = URL.createObjectURL(new Blob([MIC_PROCESSOR], { type: "text/javascript" }));
  const loading = context.audioWorklet.addModule(url).catch((error) => {
    modules.delete(context);
    throw error;
  }).finally(() => URL.revokeObjectURL(url));
  modules.set(context, loading);
  return loading;
}

export async function openMicrophone(context: AudioContext, signal: AbortSignal,
  onBlock: (block: MicBlock) => void, onEnded: () => void): Promise<Microphone> {
  if (!navigator.mediaDevices?.getUserMedia || !context.audioWorklet) {
    throw new Error("Microphone capture requires a supported browser on HTTPS or localhost.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const tracks = stream.getTracks();
  const stopTracks = () => { for (const track of tracks) track.stop(); };
  signal.addEventListener("abort", stopTracks, { once: true });
  try {
    signal.throwIfAborted();
    await prepare(context);
    signal.throwIfAborted();
    const source = context.createMediaStreamSource(stream);
    const processor = new AudioWorkletNode(context, "chief-mic", { channelCount: 1, channelCountMode: "explicit" });
    // The processor writes silence to its output and the destination keeps the graph running.
    processor.connect(context.destination);
    source.connect(processor);

    let closed = false;
    let finishPromise: Promise<void> | undefined;
    let resolveFinish: (() => void) | undefined;
    let flushTimer: number | undefined;
    const cancel = () => {
      if (closed) return;
      closed = true;
      signal.removeEventListener("abort", stopTracks);
      stopTracks();
      for (const track of tracks) track.removeEventListener("ended", onEnded);
      source.disconnect();
      processor.disconnect();
      processor.port.close();
      window.clearTimeout(flushTimer);
      resolveFinish?.();
    };
    for (const track of tracks) track.addEventListener("ended", onEnded, { once: true });
    processor.port.onmessage = ({ data }: MessageEvent<{ pcm?: ArrayBuffer; level?: number; done?: boolean }>) => {
      if (data.done) cancel();
      else if (!closed && data.pcm) onBlock({ pcm: data.pcm, level: data.level ?? 0, sampleRate: context.sampleRate });
    };
    processor.onprocessorerror = onEnded;

    return {
      cancel,
      finish() {
        if (closed) return Promise.resolve();
        return finishPromise ??= new Promise<void>((resolve) => {
          resolveFinish = resolve;
          stopTracks();
          flushTimer = window.setTimeout(cancel, 120);
          processor.port.postMessage("flush");
        });
      },
    };
  } catch (error) {
    signal.removeEventListener("abort", stopTracks);
    stopTracks();
    throw error;
  }
}

export function microphoneError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError": return "Microphone permission is required. Allow it in your browser and hold again.";
      case "NotFoundError": return "No microphone is available.";
      case "NotReadableError": return "The microphone is in use or unavailable.";
    }
  }
  return error instanceof Error && error.name === "Error" ? error.message : "The microphone could not start. Hold to try again.";
}
