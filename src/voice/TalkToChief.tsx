/** Floating push-to-talk, microphone level, and live captions for the Chief. */
"use client";

import { LoaderCircle, Mic, Route, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import { attachBriefings } from "./briefings";
import { useChiefPath, watchChiefContext } from "./chiefActions";
import { TalkSession, type TalkStatus } from "./talkSession";
import { voicePath } from "./toolDispatch";
import "./voice.css";

const IDLE: TalkStatus = { phase: "idle", level: 0, transcript: "", speaker: "You", error: "" };
const LABELS = {
  idle: "Hold to talk",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Chief is thinking",
  speaking: "Chief is speaking",
  error: "Hold to retry",
};
type Press = number | "Space" | "Enter" | "assistive";

function isTextOrControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(
    'button, input, textarea, select, summary, a[href], [role="button"], [role="textbox"], [contenteditable]:not([contenteditable="false"])',
  );
}

export default function TalkToChief() {
  const [status, setStatus] = useState(IDLE);
  const session = useRef<TalkSession | null>(null);
  const press = useRef<Press | null>(null);
  const talkButton = useRef<HTMLButtonElement>(null);
  const view = useTwinStore((state) => state.view);
  const pathId = useChiefPath((state) => state.pathId);
  const currentPaths = useTwinStore((state) => state.risk.paths);
  const checkedPaths = useRunStore((state) => state.selfCheck?.paths);
  const path = pathId ? voicePath(pathId, currentPaths, checkedPaths) : undefined;

  useEffect(() => {
    const detachBriefings = attachBriefings();
    const controller = new TalkSession((update) => setStatus((state) => ({ ...state, ...update })));
    const detachContext = watchChiefContext(() => controller.refresh());
    session.current = controller;
    function keydown(event: KeyboardEvent) {
      if (!event.isTrusted || event.defaultPrevented) return;
      if (event.key === "Escape" && (press.current !== null || controller.engaged)) {
        event.preventDefault();
        press.current = null;
        controller.cancel();
        return;
      }
      const focused = event.target === talkButton.current;
      const key = event.code === "Space" || event.key === " " ? "Space"
        : focused && event.key === "Enter" ? "Enter" : null;
      if (!key || (!focused && isTextOrControl(event.target)) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      if (event.repeat || press.current !== null) return;
      press.current = key;
      controller.hold();
    }
    function keyup(event: KeyboardEvent) {
      const key = event.code === "Space" || event.key === " " ? "Space" : event.key;
      if (!event.isTrusted || press.current !== key) return;
      event.preventDefault();
      press.current = null;
      controller.release();
    }
    function blur() {
      if (press.current !== null) {
        press.current = null;
        controller.release();
      }
    }
    function visibility() {
      if (document.visibilityState === "hidden") { press.current = null; controller.cancel(); }
    }
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      press.current = null;
      session.current = null;
      detachContext();
      detachBriefings();
      controller.dispose();
    };
  }, []);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.nativeEvent.isTrusted || event.button !== 0 || !event.isPrimary || press.current !== null) return;
    press.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current?.hold();
  }

  function pointerEnd(event: PointerEvent<HTMLButtonElement>, cancelled: boolean) {
    if (press.current !== event.pointerId) return;
    press.current = null;
    if (cancelled) session.current?.cancel();
    else {
      session.current?.unlockAudio();
      session.current?.release();
    }
  }

  const busy = status.phase !== "idle" && status.phase !== "error";
  const transcript = status.transcript ? `${status.speaker} · ${status.transcript}` : "";
  return (
    <section className="pw-chief-talk" data-view={view} data-phase={status.phase} aria-label="Talk to the Chief">
      <div className="pw-chief-bar">
        <button ref={talkButton} type="button" className="pw-voice-icon pw-chief-mic"
          title={status.error || "Hold to talk to the Chief (Space)"} aria-label="Hold to talk to the Chief"
          aria-keyshortcuts="Space" aria-pressed={status.phase === "listening"}
          onPointerDown={pointerDown} onPointerUp={(event) => pointerEnd(event, false)}
          onPointerCancel={(event) => pointerEnd(event, true)} onLostPointerCapture={(event) => pointerEnd(event, true)}
          onClick={(event) => {
            if (!event.nativeEvent.isTrusted || event.detail !== 0) return;
            if (press.current === "assistive") { press.current = null; session.current?.release(); }
            else if (press.current === null) { press.current = "assistive"; session.current?.hold(); }
          }}>
          {status.phase === "connecting" ? <LoaderCircle size={17} aria-hidden className="pw-voice-spin" /> : <Mic size={17} aria-hidden />}
        </button>
        <div className="pw-chief-body">
          <div className="pw-chief-title"><strong>Chief</strong><span role="status">{LABELS[status.phase]}</span></div>
          <meter min={0} max={1} value={status.level} aria-label="Microphone level" className="pw-chief-level" />
        </div>
        {busy ? (
          <button type="button" className="pw-voice-icon pw-chief-stop" title="Stop voice (Esc)" aria-label="Stop voice"
            onClick={() => { press.current = null; session.current?.cancel(); }}><Square size={12} aria-hidden /></button>
        ) : <kbd className="pw-chief-key">Space</kbd>}
      </div>
      {status.error && <div className="pw-chief-error" role="alert">{status.error}</div>}
      {transcript && <div className="pw-chief-transcript" aria-label="Live transcript" title={transcript}>{transcript}</div>}
      {path && (
        <div className="pw-chief-path" aria-label="Highlighted simulated path">
          <Route size={13} aria-hidden />
          <span title={path.title}>Simulated · {path.title}</span>
          <button type="button" className="pw-voice-icon" aria-label="Clear path highlight"
            onClick={() => useChiefPath.setState({ pathId: null })}><X size={12} aria-hidden /></button>
        </div>
      )}
    </section>
  );
}
