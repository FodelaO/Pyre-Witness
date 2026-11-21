/** Reveals the three review tabs and supports arrow-key navigation. */
"use client";

import { motion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";

const tabs = [
  { id: "todo", label: "To-dos" },
  { id: "watch", label: "Threat watch" },
  { id: "updates", label: "Updates" },
] as const;

export type RiskReviewTab = typeof tabs[number]["id"];

export function RiskReviewTabs({ open, active, reducedMotion, todoCount, watchCount, onSelect }: {
  open: boolean;
  active: RiskReviewTab;
  reducedMotion: boolean;
  todoCount: number;
  watchCount: number;
  onSelect: (tab: RiskReviewTab) => void;
}) {
  const buttons = useRef<Partial<Record<RiskReviewTab, HTMLButtonElement>>>({});
  const counts = { todo: todoCount, watch: watchCount, updates: undefined };

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next = { ArrowLeft: index === 0 ? last : index - 1, ArrowRight: index === last ? 0 : index + 1, Home: 0, End: last };
    if (!Object.hasOwn(next, event.key)) return;
    event.preventDefault();
    const { id } = tabs[next[event.key as keyof typeof next]];
    onSelect(id);
    buttons.current[id]?.focus();
  }

  return (
    <div id="pw-risk-reviews" className="pw-risk-tabs" hidden={!open}>
      {open && <div className="pw-risk-tablist" role="tablist" aria-label="Plant risk review">
        {tabs.map(({ id, label }, index) => (
          <motion.button key={id} ref={(element) => { if (element) buttons.current[id] = element; else delete buttons.current[id]; }}
            className="pw-risk-tab" type="button" id={`pw-risk-tab-${id}`} role="tab"
            aria-controls={`pw-risk-panel-${id}`} aria-selected={active === id} tabIndex={active === id ? 0 : -1}
            initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, delay: reducedMotion ? 0 : 0.07 + 0.045 * index, ease: "easeOut" }}
            onClick={() => onSelect(id)} onKeyDown={(event) => navigate(event, index)}>
            {label}
            {counts[id] !== undefined && <span className="pw-risk-tab-count pw-mono"
              title={id === "watch" ? "Sourced advisories" : "Pending actions"}>{counts[id]}</span>}
          </motion.button>
        ))}
      </div>}
    </div>
  );
}
