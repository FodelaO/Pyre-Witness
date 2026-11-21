/** Coordinates gesture-gated briefing playback across the panel and Live control. */
import { create } from "zustand";
import { pipelineBus } from "@/pipeline/bus";
import { PcmPlayback } from "./liveAudio";

const PREFERENCE = "pw:chief-auto-speak";

type Playback = {
  text: string;
  status: "loading" | "playing" | "error";
  error?: string;
};

export const useBriefingPlayback = create<{ autoSpeak: boolean; playback: Playback | null }>(() => ({
  autoSpeak: false,
  playback: null,
}));

let audio: AudioContext | null = null;
let active: { abort: AbortController; player?: PcmPlayback } | null = null;
let liveBusy = false;
let pending: string | null = null;
let mounts = 0;
let detach: (() => void) | undefined;

function resumeFromGesture(): Promise<AudioContext> {
  try {
    const context = audio ??= new AudioContext();
    return context.state === "running" ? Promise.resolve(context) : context.resume().then(() => context);
  } catch (error) {
    return Promise.reject(error);
  }
}

export function stopBriefing() {
  const previous = active;
  active = null;
  previous?.abort.abort();
  previous?.player?.stop();
  useBriefingPlayback.setState({ playback: null });
}

export async function playBriefing(text: string, userGesture = false): Promise<void> {
  text = text.trim();
  if (!text || liveBusy || (!userGesture && audio?.state !== "running")) return;
  stopBriefing();
  const playback: NonNullable<typeof active> = { abort: new AbortController() };
  active = playback;
  useBriefingPlayback.setState({ playback: { text, status: "loading" } });
  try {
    const context = userGesture ? resumeFromGesture() : Promise.resolve(audio!);
    const result = fetch("/api/voice/speak", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "audio/pcm" }, body: JSON.stringify({ text }),
      signal: playback.abort.signal,
    });
    const [response, output] = await Promise.all([result, context]);
    if (!response.ok) throw new Error(await readVoiceError(response, "The briefing could not be played."));
    if (active !== playback) return;
    if (!response.body || !response.headers.get("content-type")?.startsWith("audio/pcm")) {
      throw new Error("The server returned an unsupported briefing audio format.");
    }
    let complete = false;
    let started = false;
    const player = new PcmPlayback(output, settle, 0.12);
    playback.player = player;
    function settle() {
      if (complete && active === playback && !player.playing) {
        active = null;
        useBriefingPlayback.setState({ playback: null });
      }
    }
    const reader = response.body.getReader();
    try {
      while (active === playback) {
        const chunk = await reader.read();
        if (active !== playback) return;
        if (chunk.done) break;
        player.enqueuePcm(chunk.value);
        if (!started && player.playing) {
          started = true;
          useBriefingPlayback.setState({ playback: { text, status: "playing" } });
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    if (!started) throw new Error("Gemini returned no briefing audio.");
    complete = true;
    settle();
  } catch (error) {
    if (active !== playback) return;
    active = null;
    playback.abort.abort();
    playback.player?.stop();
    const message = error instanceof Error && error.name === "Error" && error.message
      ? error.message : "The briefing could not be played. Press play to try again.";
    useBriefingPlayback.setState({ playback: { text, status: "error", error: message } });
  }
}

export async function readVoiceError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body && typeof body.error === "string"
    ? body.error : fallback;
}

function playPending() {
  if (!pending || liveBusy || audio?.state !== "running") return;
  const text = pending;
  pending = null;
  void playBriefing(text);
}

export function setLiveAudioBusy(busy: boolean) {
  if (liveBusy === busy) return;
  liveBusy = busy;
  if (busy) stopBriefing();
  else playPending();
}

export function setAutoSpeak(enabled: boolean) {
  useBriefingPlayback.setState({ autoSpeak: enabled });
  try { localStorage.setItem(PREFERENCE, enabled ? "on" : "off"); } catch { /* Storage can be disabled. */ }
  if (enabled) void resumeFromGesture().then(playPending, () => undefined);
  else pending = null;
}

/** The shell stays subscribed while the panel has no summary to render. */
export function attachBriefings(): () => void {
  if (mounts++ === 0) {
    try {
      useBriefingPlayback.setState({ autoSpeak: localStorage.getItem(PREFERENCE) === "on" });
    } catch { /* The preference still works for this page. */ }
    const off = pipelineBus.on((event) => {
      if (event.type === "run.started") pending = null;
      if (event.type === "summary.done" && useBriefingPlayback.getState().autoSpeak) {
        pending = event.text;
        playPending();
      }
    });
    const unlock = (event: Event) => {
      if (event.isTrusted && !liveBusy && useBriefingPlayback.getState().autoSpeak && audio?.state !== "running") {
        void resumeFromGesture().then(playPending, () => undefined);
      }
    };
    document.addEventListener("pointerup", unlock, true);
    document.addEventListener("keydown", unlock, true);
    detach = () => {
      off();
      document.removeEventListener("pointerup", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      pending = null;
      stopBriefing();
      if (audio) void audio.close().catch(() => undefined);
      audio = null;
    };
  }
  return () => {
    if (--mounts === 0) {
      detach?.();
      detach = undefined;
    }
  };
}
