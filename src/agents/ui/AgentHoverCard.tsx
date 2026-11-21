/** Shows a crew member's current twin task and owns its temporary asset highlight. */
"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CREW_ACTIVITY_TOOLTIP_ID, useCrewHoverSource } from "@/crew/crewHover";
import DockMessage from "@/crew/DockMessage";
import { CREW } from "@/crew/types";
import { useCrewTask } from "@/crew/useCrewTask";
import { useTwinStore } from "@/twin/store";
import { useAnchoredLayer } from "./useAnchoredLayer";
import "./agentHover.css";

const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });

function Activity({ source }: { source: NonNullable<ReturnType<typeof useCrewHoverSource>> }) {
  const { id, element } = source;
  const { message, status, work } = useCrewTask(id);
  const { assets, areas, entryPoints } = useTwinStore((state) => state.twin);
  const target = work?.target;
  const known = target?.ids.filter((tag) => assets.some(({ id }) => id === tag)
    || areas.some(({ id }) => id === tag) || entryPoints.some(({ id }) => id === tag)) ?? [];
  const fallback = target?.fallbackArea && areas.find(({ id }) => id === target.fallbackArea);
  const ids = known.length ? known : fallback ? [fallback.id] : [];
  const key = ids.join("\u001f");
  const asset = known.length === 1 ? assets.find(({ id }) => id === known[0]) : undefined;
  const location = asset ? [asset.id, target?.label ?? asset.name].filter((label, index) => index === 0 || label !== asset.id).join(" · ")
    : target?.label ?? (known.length ? known.join(" · ") : fallback ? fallback.name : message === "At desk" ? "Crew office" : "Plant twin");
  const since = work && new Date(work.at);
  const panel = useRef<HTMLDivElement>(null);
  useAnchoredLayer(panel, element);

  useLayoutEffect(() => {
    if (!key) return;
    const ids = key.split("\u001f");
    // Restore a highlight another feature held (a modeler preview, a watch row) instead of wiping it.
    const { highlightIds: previous, setHighlight } = useTwinStore.getState();
    setHighlight(ids);
    return () => {
      if (useTwinStore.getState().highlightIds === ids) setHighlight(previous);
    };
  }, [key]);

  return createPortal(
    <div ref={panel} id={CREW_ACTIVITY_TOOLTIP_ID} className="pw-agent-activity" role="tooltip"
      data-crew={id} data-state={status} style={{ "--crew-color": `var(${CREW[id].colorVar})` } as CSSProperties}>
      <strong><DockMessage message={message} /></strong>
      <div className="pw-agent-activity-meta">
        <DockMessage message={location} />
        {since && <time className="pw-mono" dateTime={since.toISOString()} title={since.toLocaleString()}>{clock.format(since)}</time>}
      </div>
    </div>, document.body,
  );
}

export default function AgentHoverCard() {
  const source = useCrewHoverSource();
  return source ? <Activity key={source.key} source={source} /> : null;
}
