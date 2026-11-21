/** Opens the services board beside the crew dock with native popover dismissal. */
"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import ServicesBoard from "./ServicesBoard";
import { healthAge, initialServices, summarizeHealth } from "./services";
import { useHealth, useHealthPolling } from "./useHealth";

export default function ServicesChip() {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useHealthPolling(!open);
  const snapshot = useHealth((state) => state.snapshot);
  const fromSession = useHealth((state) => state.fromSession);
  const { status, healthy, completed } = summarizeHealth(snapshot?.services ?? initialServices);
  const condition = status === "failing" ? "core service failure" : status === "degraded" ? "auxiliary service failure" : status;
  const summary = completed ? ` · ${healthy} of ${completed} checked services healthy` : "";
  const cachedAge = fromSession && snapshot?.checkedAt ? healthAge(snapshot.checkedAt, Date.now()) : null;
  const description = `Gemini services · ${condition}${summary}${cachedAge ? ` · cached ${cachedAge}` : ""}`;

  useLayoutEffect(() => {
    const panel = popover.current;
    const dock = trigger.current?.closest(".pw-crew-dock");
    if (!open || !panel || !dock) return;

    const position = () => {
      const anchor = dock.getBoundingClientRect();
      const beside = anchor.right + panel.offsetWidth + 20 <= window.innerWidth;
      const available = window.innerHeight - 12;
      const panelHeight = Math.min(panel.scrollHeight + 2, beside ? available - 12 : available * .7);
      const top = Math.max(12, Math.min(beside ? anchor.top : anchor.bottom + 8, available - panelHeight));
      panel.style.setProperty("--pw-health-top", `${top}px`);
      panel.style.setProperty("--pw-health-left", `${beside ? anchor.right + 8 : 12}px`);
    };

    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [open]);

  function keepEscape(event: KeyboardEvent<HTMLElement>) {
    // Let the native popover close before any surrounding drawer handles Escape.
    if (open && event.key === "Escape") event.stopPropagation();
  }

  return (
    <>
      <button ref={trigger} type="button" className="pw-health-chip" popoverTarget={id} data-status={status}
        aria-expanded={open} aria-controls={id} aria-label={description} title={description} onKeyDown={keepEscape}>
        <span className="pw-health-dot" data-status={status} aria-hidden />
        <span>Gemini</span>
      </button>
      <div ref={popover} id={id} popover="auto" className="pw-health-popover" onKeyDown={keepEscape}
        onToggle={(event) => setOpen(event.newState === "open")}>
        {open && <ServicesBoard />}
      </div>
    </>
  );
}
