/** Displays participant messages, staff exchanges, errors, and typing in stream order. */
"use client";

import { ArrowRight, Ellipsis } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { CREW } from "@/crew/types";
import ChatPortrait from "./ChatPortrait";
import ChatText from "./ChatText";
import { type useChatThread } from "./chatStore";
import { isCrewId, type ChatMessage, type ChatParty } from "./chatStream";

function partyName(party: ChatParty) {
  return party === "user" ? "You" : party === "group" ? "Group" : CREW[party].name;
}

function AgentMessage({ message }: { message: ChatMessage }) {
  if (!isCrewId(message.from)) return null;
  const recipient = isCrewId(message.to) ? message.to : null;
  return (
    <article className="pw-agent-chat-message" data-channel={recipient ? "peer" : "reply"} data-kind={message.kind}
      data-from={message.from} data-to={message.to}>
      <div className="pw-agent-chat-byline">
        <ChatPortrait id={message.from} />
        {recipient && <><ArrowRight size={12} aria-hidden /><ChatPortrait id={recipient} /></>}
        <strong>{partyName(message.from)} <span>→ {partyName(message.to)}</span></strong>
        <small className="pw-mono">{message.engine}</small>
      </div>
      <p><ChatText text={message.text} /></p>
    </article>
  );
}

export default function ChatLog({ thread, hint }: { thread: ReturnType<typeof useChatThread>; hint?: string }) {
  const { entries, typing } = thread;
  const scroll = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scroll.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [entries, typing]);

  return (
    <div className="pw-agent-chat-log" role="log" aria-label="Conversation" ref={scroll}>
      {!entries.length && !typing && hint && <p className="pw-agent-chat-hint">{hint}</p>}
      {entries.map((entry) => {
        if (entry.type === "user") return (
          <article key={entry.id} className="pw-agent-chat-message" data-channel="user" data-from="user" data-to={entry.to}>
            <div className="pw-agent-chat-byline"><strong>You <span>→ {partyName(entry.to)}</span></strong></div>
            <p>{entry.text}</p>
          </article>
        );
        if (entry.type === "error") return (
          <p key={entry.id} className="pw-agent-chat-error">{entry.agent && `${CREW[entry.agent].name} · `}{entry.message}</p>
        );
        return <AgentMessage key={entry.id} message={entry} />;
      })}
      {typing && <div className="pw-agent-chat-typing" data-typing={typing}>
        <ChatPortrait id={typing} /><span>{CREW[typing].name} is typing</span><Ellipsis size={16} aria-hidden />
      </div>}
    </div>
  );
}
