/** Shows the recorded Chief briefing and frees floor space when it collapses. */
"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { Pin, X } from "lucide-react";
import { useCrewStore } from "@/crew/crewStore";
import { useEscalationStore } from "@/escalation/store";
import { useRunStore } from "@/pipeline/runStore";
import { useWatchStore } from "@/watch/watchStore";
import type { WorkRun } from "./crewWork";

const BRIEFING_VISIBLE_MS = 12_000;
type BriefingCard = {
  briefing: NonNullable<WorkRun["briefing"]>;
  mode: "expanded" | "collapsed" | "dismissed";
};

export default function CrewWorkBriefing({ ref, briefing }: { ref: Ref<HTMLElement>; briefing: WorkRun["briefing"] }) {
  const isSpeaking = useCrewStore((state) => state.avatars?.chief?.speech?.kind === "briefing");
  const [card, setCard] = useState<BriefingCard | null>(null);
  const section = useRef<HTMLElement>(null);
  const mode = card?.mode;

  // Keep the last shown briefing accessible when a new run clears its pipeline events.
  if (isSpeaking && briefing?.text.trim() && briefing !== card?.briefing) {
    setCard({ briefing, mode: "expanded" });
  }

  useLayoutEffect(() => {
    const collapse = () => setCard((current) => current?.mode === "expanded" ? { ...current, mode: "collapsed" } : current);
    const unsubscribe = [
      useRunStore.subscribe((state, previous) => {
        if (state.status === "running" && (previous.status !== "running" || state.runId !== previous.runId)) collapse();
      }),
      useWatchStore.subscribe((state, previous) => {
        if ((state.review.status === "running" && previous.review.status !== "running")
          || (state.managed.status === "running" && previous.managed.status !== "running")) collapse();
      }),
      useEscalationStore.subscribe((state, previous) => {
        if (state.records.length > previous.records.length) collapse();
      }),
    ];
    return () => unsubscribe.forEach((stop) => stop());
  }, []);

  useEffect(() => {
    if (card?.mode !== "expanded") return;
    const timer = window.setTimeout(() => {
      setCard((current) => current === card ? { ...card, mode: "collapsed" } : current);
    }, BRIEFING_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [card]);

  // Refresh the floor overlay's reserved bounds when the card changes size.
  useLayoutEffect(() => {
    if (typeof ref === "function") return ref(section.current) ?? (() => { ref(null); });
    if (!ref) return;
    ref.current = section.current;
    return () => { ref.current = null; };
  }, [ref, mode]);

  if (!card || mode === "dismissed") return null;
  const expanded = mode === "expanded";

  return <section ref={section} className="pw3d-work-briefing" data-collapsed={!expanded || undefined} aria-label="Chief briefing" data-pw3d-ui>
    <header>
      <button type="button" className="pw3d-work-briefing-toggle" aria-expanded={expanded}
        onClick={() => setCard({ ...card, mode: expanded ? "collapsed" : "expanded" })}>
        <Pin size={15} aria-hidden="true" />
        <strong>Chief briefing</strong>
      </button>
      {expanded && <button type="button" aria-label="Dismiss Chief briefing" onClick={() => {
        setCard({ ...card, mode: "dismissed" });
        if (briefing === card.briefing) useCrewStore.getState().dismissBriefing();
      }}><X size={16} aria-hidden="true" /></button>}
    </header>
    {expanded && <>
      <div className="pw3d-work-source pw-mono">{card.briefing.model}</div>
      <div className="pw3d-work-copy" tabIndex={0}>{card.briefing.text.trim()}</div>
    </>}
  </section>;
}
