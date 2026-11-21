/** Pins the recorded Chief briefing in the 3D view with the shared dismissal action. */
"use client";

import type { Ref } from "react";
import { Pin, X } from "lucide-react";
import { useCrewStore } from "@/crew/crewStore";
import type { WorkRun } from "./crewWork";

export default function CrewWorkBriefing({ ref, briefing }: { ref: Ref<HTMLElement>; briefing: WorkRun["briefing"] }) {
  const speech = useCrewStore((state) => state.avatars?.chief?.speech);
  if (!briefing || speech?.kind !== "briefing" || !briefing.text.trim()) return null;

  return <section ref={ref} className="pw3d-work-briefing" aria-label="Chief briefing" data-pw3d-ui>
    <header>
      <Pin size={15} aria-hidden="true" />
      <strong>Chief briefing</strong>
      <button type="button" aria-label="Dismiss Chief briefing" onClick={() => useCrewStore.getState().dismissBriefing()}><X size={16} /></button>
    </header>
    <div className="pw3d-work-source pw-mono">{briefing.model}</div>
    <div className="pw3d-work-copy" tabIndex={0}>{briefing.text.trim()}</div>
  </section>;
}
