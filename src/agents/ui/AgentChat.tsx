/** Anchored chat for one agent, the group, or Chief of staff. */
"use client";

import { ArrowUp, Badge, LoaderCircle, MessageCircle, UsersRound, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CREW, CREW_ORDER, type CrewId } from "@/crew/types";
import ChatLog from "./ChatLog";
import ChatPortrait from "./ChatPortrait";
import { CHAT_MESSAGE_LIMIT, chatThreadId, useAgentChat, useChatThread } from "./chatStore";
import type { ChatAddress } from "./chatStream";
import { useAnchoredLayer } from "./useAnchoredLayer";
import "./agentChat.css";

export const AGENT_CHAT_ID = "pw-agent-chat";
export type ChatMode = ChatAddress["mode"];

const modes = [
  { id: "direct", label: "Direct", Icon: MessageCircle },
  { id: "group", label: "Group", Icon: UsersRound },
  { id: "chief", label: "Chief of staff", Icon: Badge },
] as const;

function RoomHeader({ mode, direct }: { mode: ChatMode; direct: CrewId }) {
  const id = mode === "chief" ? "chief" : direct;
  return (
    <div className="pw-agent-chat-room">
      <div className="pw-agent-chat-participants">
        {mode === "group" ? CREW_ORDER.map((agent) => <ChatPortrait key={agent} id={agent} />) : <ChatPortrait id={id} />}
      </div>
      <h3>{mode === "group" ? "Crew chat" : CREW[id].name}</h3>
      {mode === "chief" && <span className="pw-agent-chat-staff pw-mono">Staff</span>}
      {mode !== "group" && <small className="pw-mono">{CREW[id].engine}</small>}
    </div>
  );
}

export default function AgentChat({ mode, direct, anchor, onMode, onClose }: {
  mode: ChatMode;
  direct: CrewId;
  anchor: RefObject<HTMLElement | null>;
  onMode: (mode: ChatMode) => void;
  onClose: () => void;
}) {
  const address: ChatAddress = mode === "direct" ? { mode, to: direct } : { mode };
  const key = chatThreadId(address);
  const thread = useChatThread(address);
  const panel = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Partial<Record<ReturnType<typeof chatThreadId>, string>>>({});
  const input = drafts[key] ?? "";
  const setInput = (value: string) => setDrafts((drafts) => ({ ...drafts, [key]: value }));
  const room = mode === "group" ? "Group" : mode === "chief" ? "Chief of staff" : CREW[direct].name;
  // One quiet line so an empty room already says how its mode differs.
  const hint = mode === "group" ? "All four answer · @mentions hand off"
    : mode === "chief" ? "Chief delegates, then reports back" : `Only ${CREW[direct].name} answers`;
  useAnchoredLayer(panel, anchor);
  useLayoutEffect(() => composer.current?.focus({ preventScroll: true }), []);

  const close = useEffectEvent(onClose);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector("dialog[open], :popover-open")) return;
      // A text field elsewhere (capture description, settings) keeps its own Escape handling.
      const target = event.target instanceof Element ? event.target : null;
      if (target && !panel.current?.contains(target)
        && target.closest("input, textarea, select, [contenteditable], [role='textbox']")) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  }, []);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || thread.pending) return;
    setInput("");
    void useAgentChat.getState().send(address, text);
    composer.current?.focus({ preventScroll: true });
  }

  return createPortal(
    <div ref={panel} id={AGENT_CHAT_ID} className="pw-agent-chat" data-mode={mode} data-pending={thread.pending || undefined}
      role="dialog" aria-modal="false" aria-label={`Chat · ${room}`}>
      <header className="pw-agent-chat-header">
        <RoomHeader mode={mode} direct={direct} />
        <button type="button" className="pw-agent-chat-close" aria-label="Close chat" onClick={onClose}><X size={16} aria-hidden /></button>
      </header>
      <div className="pw-agent-chat-modes" role="group" aria-label="Conversation mode">
        {modes.map(({ id, label, Icon }) => (
          <button type="button" key={id} aria-pressed={mode === id} onClick={() => onMode(id)}>
            <Icon size={13} aria-hidden />{label}
          </button>
        ))}
      </div>
      <ChatLog thread={thread} hint={hint} />
      <form className="pw-agent-chat-compose" onSubmit={send}>
        <input ref={composer} name="message" value={input} onChange={(event) => setInput(event.target.value)}
          maxLength={CHAT_MESSAGE_LIMIT} autoComplete="off" aria-label={`Message ${room}`} placeholder={`Message ${room}…`} />
        <button type="submit" aria-label="Send message" aria-busy={thread.pending} disabled={!input.trim() || thread.pending}>
          {thread.pending ? <LoaderCircle className="pw-agent-chat-spinner" size={16} aria-hidden /> : <ArrowUp size={16} aria-hidden />}
        </button>
      </form>
    </div>, document.body,
  );
}
