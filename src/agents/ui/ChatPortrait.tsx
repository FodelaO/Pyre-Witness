/** Uses the dock's twin focus behavior on agent portraits inside a conversation. */
"use client";

import type { CSSProperties } from "react";
import { useCrewHoverEvents } from "@/crew/crewHover";
import { CREW, type CrewId } from "@/crew/types";

export default function ChatPortrait({ id }: { id: CrewId }) {
  const hover = useCrewHoverEvents(id);
  const { name, colorVar } = CREW[id];
  return (
    <span {...hover} className="pw-agent-chat-portrait" data-agent-portrait={id} tabIndex={0}
      role="img" aria-label={`${name} in twin`} style={{ "--crew-color": `var(${colorVar})` } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/crew/${id}.png`} width={26} height={26} alt="" draggable={false} />
    </span>
  );
}
