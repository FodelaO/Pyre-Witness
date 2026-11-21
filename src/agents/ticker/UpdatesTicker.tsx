/** Shows the highest-risk plant updates under the crew cards. */
"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatUsd } from "@/econ/format";
import { Equipment, FOOTPRINT } from "@/equipment";
import { rankTickerItems } from "./items";
import { openTickerItem } from "./navigation";
import { connectTicker, useTickerStore } from "./tickerStore";
import styles from "./UpdatesTicker.module.css";

const VISIBLE_ROWS = 6;
const DWELL_MS = 4_000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PAUSED = ":hover, :focus-within";
const status = { alert: "Alert", warn: "Warning", ok: "OK" } as const;

function timeAgo(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default function UpdatesTicker() {
  const items = useTickerStore((state) => state.items);
  const [now, setNow] = useState(Date.now);
  const [showMore, setShowMore] = useState(false);
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const listId = useId();
  const ranked = useMemo(() => rankTickerItems(items, now), [items, now]);
  const more = Math.max(0, ranked.length - VISIBLE_ROWS);
  const expanded = showMore && more > 0;
  const visible = expanded ? ranked : ranked.slice(0, VISIBLE_ROWS);
  const hasItems = visible.length > 0;

  useEffect(connectTicker, []);
  useEffect(() => {
    if (!hasItems) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [hasItems]);

  useLayoutEffect(() => {
    const element = viewport.current;
    const additional = expanded ? element?.querySelectorAll("li")[VISIBLE_ROWS] : undefined;
    element?.scrollTo({ top: additional?.offsetTop ?? 0, behavior: "instant" });
  }, [expanded]);

  useEffect(() => {
    const container = section.current;
    const element = viewport.current;
    if (!container || !element || !hasItems) return;
    const motion = window.matchMedia(REDUCED_MOTION);
    const stopScroll = () => element.scrollTo({ top: element.scrollTop, behavior: "instant" });
    let direction = 1;
    const tick = () => {
      if (motion.matches || container.matches(PAUSED) || document.hidden) return;
      const end = element.scrollHeight - element.clientHeight;
      const rowHeight = element.querySelector("li")?.offsetHeight;
      if (!rowHeight || end <= 0) return;
      if (element.scrollTop >= end - 1) direction = -1;
      else if (element.scrollTop <= 1) direction = 1;
      element.scrollTo({ top: element.scrollTop + direction * rowHeight, behavior: "smooth" });
    };
    const timer = window.setInterval(tick, DWELL_MS);
    container.addEventListener("pointerenter", stopScroll);
    container.addEventListener("focusin", stopScroll);
    motion.addEventListener("change", stopScroll);
    return () => {
      window.clearInterval(timer);
      container.removeEventListener("pointerenter", stopScroll);
      container.removeEventListener("focusin", stopScroll);
      motion.removeEventListener("change", stopScroll);
    };
  }, [hasItems, expanded]);

  return (
    <section ref={section} className={styles.ticker} aria-label="Recent updates" data-filled={hasItems || undefined}>
      <header className={styles.header}>
        <span className={styles.heading}>Updates</span>
        {more > 0 && <button type="button" className={styles.more}
          aria-controls={listId} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} ${more} more updates`}
          onClick={() => setShowMore(!expanded)}>{expanded ? "−" : "+"}{more}</button>}
      </header>
      <div ref={viewport} id={listId} className={styles.viewport}>
        {hasItems ? (
          <ol className={styles.list} role="list">
            {visible.map((item, index) => {
              const Icon = item.tone === "ok" ? Check : TriangleAlert;
              const kind = item.assetKind ?? "generic_device";
              const { w, h } = FOOTPRINT[kind];
              const subject = [item.title, item.assetId].filter(Boolean).join(" · ");
              const details = `${timeAgo(item.at, now)} · ${item.loss === undefined ? "Loss estimate unavailable" : `Est. loss ${formatUsd(item.loss)}/event`}`;
              const descriptionId = `${listId}-description-${index}`;
              return (
                <li key={item.id} className={styles.item}>
                  <button type="button" className={styles.row} data-tone={item.tone}
                    aria-label={`${subject} · ${status[item.tone]}`} aria-describedby={descriptionId} title={`${subject} · ${details}`}
                    onClick={() => openTickerItem(item)}>
                    <span className={styles.title}>{item.title}</span>
                    <span className={styles.asset}>
                      {item.assetId && <svg className={styles.glyph} viewBox={`${-w * 0.62} ${-h * 0.62} ${w * 1.24} ${h * 1.24}`} aria-hidden="true">
                        <Equipment kind={kind} compact running={false} />
                      </svg>}
                      <span className={styles.tag}>{item.assetId ?? "—"}</span>
                    </span>
                    <Icon size={14} strokeWidth={2} aria-hidden="true" className={styles.icon} />
                    <span id={descriptionId} hidden>{details}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : <p className={styles.empty}>No updates yet</p>}
      </div>
    </section>
  );
}
