/** Plays the Chief's briefing on demand and exposes the saved auto-speak setting. */
"use client";

import { AudioLines, CircleAlert, LoaderCircle, Square, Volume2 } from "lucide-react";
import { useEffect } from "react";
import { attachBriefings, playBriefing, setAutoSpeak, stopBriefing, useBriefingPlayback } from "./briefings";
import "./voice.css";

export default function SpeakButton({ text }: { text: string }) {
  const stored = useBriefingPlayback((state) => state.playback);
  const autoSpeak = useBriefingPlayback((state) => state.autoSpeak);
  useEffect(attachBriefings, []);

  const playback = stored?.text === text.trim() ? stored : null;
  const working = playback?.status === "loading" || playback?.status === "playing";
  const label = playback?.status === "loading" ? "Cancel loading briefing"
    : working ? "Stop Chief briefing" : playback?.error ? "Retry Chief briefing" : "Play Chief briefing";
  const Icon = playback?.status === "loading" ? LoaderCircle : working ? Square : playback?.error ? CircleAlert : Volume2;

  return (
    <span className="pw-voice-briefing">
      <button type="button" className="pw-voice-icon" aria-label={label} title={playback?.error ?? label}
        data-attention={!!playback?.error} disabled={!text.trim()}
        onClick={(event) => {
          if (working) stopBriefing();
          else if (event.nativeEvent.isTrusted) void playBriefing(text, true);
        }}>
        <Icon size={15} aria-hidden className={playback?.status === "loading" ? "pw-voice-spin" : undefined} />
      </button>
      <button type="button" className="pw-voice-icon" aria-label="Auto-speak Chief briefings"
        aria-pressed={autoSpeak} title={`Auto-speak ${autoSpeak ? "on" : "off"}`}
        onClick={(event) => { if (event.nativeEvent.isTrusted) setAutoSpeak(!autoSpeak); }}>
        <AudioLines size={14} aria-hidden />
      </button>
      {playback?.error && <span className="pw-voice-briefing-error" role="status">{playback.error}</span>}
    </span>
  );
}
