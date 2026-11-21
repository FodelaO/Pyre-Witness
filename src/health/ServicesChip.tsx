/** Opens the services board from the top bar with native popover dismissal. */
"use client";

import { useId, useRef, useState } from "react";
import ServicesBoard from "./ServicesBoard";
import { SERVICES } from "./services";
import { useHealth, useHealthPolling } from "./useHealth";

export default function ServicesChip() {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useHealthPolling(!open);
  const snapshot = useHealth((state) => state.snapshot);
  const checked = snapshot?.services.some(({ last }) => last !== null);
  const healthy = snapshot?.services.filter(({ last }) => last?.ok).length ?? 0;
  const status = snapshot?.services.some(({ last }) => last?.ok === false) ? "failing"
    : healthy === SERVICES.length ? "ok" : "unknown";

  return (
    <>
      <button ref={trigger} type="button" className="pw-health-chip" popoverTarget={id}
        aria-expanded={open} aria-label={`Gemini services, ${healthy} of ${SERVICES.length} healthy`}>
        <span className="pw-health-dot" data-status={status} aria-hidden />
        <span className="pw-health-chip-value"><span>Gemini</span>{" "}
          <span>{checked ? healthy : "—"}/{SERVICES.length}</span>
        </span>
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
