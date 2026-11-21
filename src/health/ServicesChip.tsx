/** Opens the services board from the top bar with native popover dismissal. */
"use client";

import { useId, useRef, useState } from "react";
import ServicesBoard from "./ServicesBoard";
import { healthAge, initialServices, summarizeHealth } from "./services";
import { useHealth, useHealthPolling } from "./useHealth";

export default function ServicesChip() {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useHealthPolling(!open);
  const snapshot = useHealth((state) => state.snapshot);
  const fromSession = useHealth((state) => state.fromSession);
  const { status, healthy, completed } = summarizeHealth(snapshot?.services ?? initialServices);
  const issue = status === "failing" ? "Core service failure" : status === "degraded" ? "Auxiliary service failure" : null;
  const label = status === "ok" ? "OK" : issue ? `${healthy}/${completed}` : `· ${status}`;
  const summary = status === "ok" || issue ? `${healthy} of ${completed} checked services healthy` : status;
  const cachedAge = fromSession && snapshot?.checkedAt ? healthAge(snapshot.checkedAt, Date.now()) : null;

  return (
    <>
      <button ref={trigger} type="button" className="pw-health-chip" popoverTarget={id} data-status={status}
        aria-expanded={open} aria-label={`Gemini services, ${issue ? `${issue}, ` : ""}${summary}${cachedAge ? `, cached ${cachedAge}` : ""}`}>
        <span className="pw-health-dot" data-status={status} aria-hidden />
        <span className="pw-health-chip-value"><span>Gemini</span>{" "}
          <span>{label}</span>
        </span>
        {cachedAge && <span className="pw-health-chip-age" aria-hidden>· {cachedAge}</span>}
      </button>
      <div id={id} popover="auto" className="pw-health-popover" onToggle={(event) => {
        const visible = event.newState === "open";
        if (visible && trigger.current) {
          event.currentTarget.style.setProperty("--pw-health-top", `${Math.ceil(trigger.current.getBoundingClientRect().bottom) + 8}px`);
        }
        setOpen(visible);
      }}>
        {open && <ServicesBoard />}
      </div>
    </>
  );
}
