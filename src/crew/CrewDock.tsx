/** Opens live crew activity, conversations, and updates beside the drawing. */
"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Check, Circle, FileText, Footprints, MessageCircle, ScanLine, TriangleAlert } from "lucide-react";
import AgentChat, { AGENT_CHAT_ID, type ChatMode } from "@/agents/ui/AgentChat";
import AgentHoverCard from "@/agents/ui/AgentHoverCard";
import { CrewHealthDot, useCrewHealth } from "@/health/CrewHealthDot";
import ServicesChip from "@/health/ServicesChip";
import { useTranscriptStore } from "@/transcript/transcriptStore";
import { useCrewHoverEvents } from "./crewHover";
import DockMessage from "./DockMessage";
import { CREW, CREW_ORDER, type CrewId } from "./types";
import { useCrewTask } from "./useCrewTask";
import "./crewDock.css";

const stateIcon = { idle: Circle, walking: Footprints, working: ScanLine, done: Check, error: TriangleAlert };

function CrewCard({ id, open, onOpen }: { id: CrewId; open: boolean; onOpen: (button: HTMLButtonElement) => void }) {
  const { name, colorVar, engine: assignedEngine } = CREW[id];
  const { status, message, active, engine, attention } = useCrewTask(id);
  const health = useCrewHealth(id);
  const hover = useCrewHoverEvents(id);
  const StateIcon = attention ? TriangleAlert : stateIcon[status];

  return (
    <button {...hover} type="button" className="pw-crew-dock-card" data-crew={id} data-state={status} data-active={active || undefined}
      data-attention={attention || undefined} aria-haspopup="dialog" aria-description={health.label}
      aria-label={`Chat with ${name} · ${engine} · ${message}`} aria-controls={open ? AGENT_CHAT_ID : undefined} aria-expanded={open}
      onClick={(event) => onOpen(event.currentTarget)} style={{ "--crew-color": `var(${colorVar})` } as CSSProperties}>
      <span className="pw-crew-dock-face">
        {/* These same-size local portraits are shared with the SVG and the transcript. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/crew/${id}.png`} alt="" width={40} height={40} draggable={false} />
        <span className="pw-crew-dock-ring" aria-hidden />
        <span className="pw-crew-dock-state" aria-hidden><StateIcon size={9} strokeWidth={2.4} /></span>
        <CrewHealthDot health={health} portrait />
      </span>
      <span className="pw-crew-dock-readout" aria-hidden>
        <span className="pw-crew-dock-identity">
          <strong>{name}</strong>
          <MessageCircle size={12} strokeWidth={1.7} />
        </span>
        <span className="pw-crew-dock-engine pw-mono" title={health.label}>
          <CrewHealthDot health={health} />{assignedEngine}
        </span>
        <DockMessage message={message} />
      </span>
    </button>
  );
}

export default function CrewDock() {
  const dock = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [direct, setDirect] = useState<CrewId>("chief");

  function openChat(button: HTMLButtonElement, to: CrewId | "group") {
    opener.current = button;
    if (to !== "group") setDirect(to);
    setMode(to === "group" ? "group" : "direct");
    document.getElementById(AGENT_CHAT_ID)?.querySelector("input")?.focus({ preventScroll: true });
  }

  function closeChat() {
    setMode(null);
    opener.current?.focus({ preventScroll: true });
  }

  return (
    <section className="pw-crew-dock" aria-label="Agents" ref={dock}>
      <header className="pw-crew-dock-top">
        <div className="pw-crew-dock-header">
          <h2 className="pw-mono">Agents</h2>
          <ServicesChip />
          <button type="button" className="pw-crew-dock-transcript" title="Open transcript (T)" aria-label="Open transcript"
            aria-keyshortcuts="T" aria-haspopup="dialog"
            onClick={() => { setMode(null); useTranscriptStore.getState().open(); }}><FileText size={14} aria-hidden /><kbd>T</kbd></button>
        </div>
        <div className="pw-crew-dock-escalation" data-escalation-dock />
      </header>
      <div className="pw-crew-dock-cards">
        {CREW_ORDER.map((id) => <CrewCard key={id} id={id} open={mode === "direct" && direct === id}
          onOpen={(button) => openChat(button, id)} />)}
      </div>
      <button type="button" className="pw-crew-dock-group" aria-label="Open group chat" aria-haspopup="dialog"
        aria-controls={mode === "group" ? AGENT_CHAT_ID : undefined} aria-expanded={mode === "group"}
        onClick={(event) => openChat(event.currentTarget, "group")}>
        <span className="pw-crew-dock-group-portraits" aria-hidden>
          {CREW_ORDER.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={`/crew/${id}.png`} width={17} height={17} alt="" draggable={false} />
          ))}
        </span>
        <span className="pw-crew-dock-group-label">Group</span>
      </button>
      {mode && <AgentChat mode={mode} direct={direct} anchor={dock} onMode={setMode} onClose={closeChat} />}
      <AgentHoverCard />
    </section>
  );
}
