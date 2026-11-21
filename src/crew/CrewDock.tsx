/** Keeps all four crew members and their live run state visible beside the drawing. */
"use client";

import type { CSSProperties } from "react";
import { ArrowUpRight, Check, ChevronRight, Circle, FileText, ScanLine, TriangleAlert } from "lucide-react";
import { useTranscriptStore } from "@/transcript/transcriptStore";
import { crewLive, useCrewStore } from "./crewStore";
import { focusCrew } from "./focusCrew";
import { CREW, CREW_ORDER, type CrewId } from "./types";
import "./crewDock.css";

const stateIcon = { idle: Circle, walking: ChevronRight, working: ScanLine, done: Check, error: TriangleAlert };

function CrewCard({ id }: { id: CrewId }) {
  const { name, engine: defaultEngine, colorVar } = CREW[id];
  const live = useCrewStore((state) => crewLive(id, state.live));
  const walking = useCrewStore((state) => state.avatars?.[id]?.walking ?? false);
  const speechKind = useCrewStore((state) => state.avatars?.[id]?.speech?.kind);
  const phase = useCrewStore((state) => state.phase);
  const active = live.status === "working" && (phase === "running" || (id === "chief" && phase !== "error"));
  const stopped = !active && live.status === "working";
  const returning = walking && phase !== "running" && !speechKind;
  const atDesk = phase === "idle" && !walking && !speechKind && live.status !== "error";
  const status = walking ? "walking" : atDesk || stopped ? "idle" : live.status;
  const engine = live.engine || defaultEngine;
  let message = (!stopped && live.message) || "Standing by";
  if (id === "chief" && live.status === "done") message = "Briefing ready";
  if (atDesk) message = "At desk";
  if (returning) message = "Returning to desk";
  const latency = live.latencyMs === undefined ? undefined : live.latencyMs < 1000
    ? `${Math.round(live.latencyMs)} ms`
    : `${(live.latencyMs / 1000).toFixed(1)} s`;
  const attention = live.attention && message === live.message;
  const StateIcon = attention ? TriangleAlert : stateIcon[status];

  function showMember() {
    focusCrew(id);
    useTranscriptStore.getState().open({ crewId: id });
  }

  return (
    <button type="button" className="pw-crew-dock-card" data-crew={id} data-state={status} data-active={active || undefined}
      data-attention={attention || undefined} aria-haspopup="dialog"
      aria-label={`Open ${name} transcript · ${engine} · ${message}${latency ? ` · last latency ${latency}` : ""}`}
      title={`${name} · ${engine}\n${message}${latency ? ` · Last latency ${latency}` : ""}`}
      onClick={showMember} style={{ "--crew-color": `var(${colorVar})` } as CSSProperties}>
      <span className="pw-crew-dock-face">
        {/* These same-size local portraits are shared with the SVG and the transcript. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/crew/${id}.png`} alt="" width={40} height={40} draggable={false} />
        <span className="pw-crew-dock-ring" aria-hidden />
        <span className="pw-crew-dock-state" aria-hidden><StateIcon size={8} strokeWidth={2.5} /></span>
      </span>
      <span className="pw-crew-dock-readout" aria-hidden>
        <span className="pw-crew-dock-identity"><strong>{name}</strong><ArrowUpRight size={12} strokeWidth={1.7} /></span>
        <span className="pw-crew-dock-engine pw-mono">{engine}</span>
        <span className="pw-crew-dock-row">
          <span className="pw-crew-dock-message">{message}</span>
          {latency && <span className="pw-crew-dock-latency pw-mono">{latency}</span>}
        </span>
      </span>
    </button>
  );
}

export default function CrewDock() {
  return (
    <section className="pw-crew-dock" aria-label="AI crew">
      <header className="pw-crew-dock-header">
        <h2 className="pw-mono">AI crew</h2>
        <button type="button" className="pw-crew-dock-transcript" title="Open transcript (T)" aria-label="Open transcript"
          aria-keyshortcuts="T" aria-haspopup="dialog"
          onClick={() => useTranscriptStore.getState().open()}><FileText size={14} aria-hidden /><kbd>T</kbd></button>
      </header>
      <div className="pw-crew-dock-cards">
        {CREW_ORDER.map((id) => <CrewCard key={id} id={id} />)}
      </div>
    </section>
  );
}
