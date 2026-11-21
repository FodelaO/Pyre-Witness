/** Shows the plant's latest updates under the crew cards. */
"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { openTickerItem } from "./navigation";
import { connectTicker, useTickerStore } from "./tickerStore";
import styles from "./UpdatesTicker.module.css";

const VISIBLE_ROWS = 5;
const DWELL_MS = 4_000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PAUSED = ":hover, :focus-within";
const status = { alert: "Alert", warn: "Warning", ok: "OK" } as const;

function timeAgo(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export default function UpdatesTicker() {
  const items = useTickerStore((state) => state.items);
  const [now, setNow] = useState(Date.now);
  const viewport = useRef<HTMLDivElement>(null);
  const first = items[0]?.id;
  const hasItems = first !== undefined;

  useEffect(connectTicker, []);
  useEffect(() => {
    if (!hasItems) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [hasItems]);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (element && !element.matches(PAUSED) && !window.matchMedia(REDUCED_MOTION).matches) {
      element.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [first]);

  useEffect(() => {
    const element = viewport.current;
    if (!element || items.length <= VISIBLE_ROWS) return;
    const motion = window.matchMedia(REDUCED_MOTION);
    const stopScroll = () => element.scrollTo({ top: element.scrollTop, behavior: "instant" });
    const tick = () => {
      if (motion.matches || element.matches(PAUSED) || document.hidden) return;
      const rowHeight = element.querySelector("li")?.getBoundingClientRect().height;
      const end = element.scrollHeight - element.clientHeight;
      if (!rowHeight || end <= 0) return;
      const wrapped = element.scrollTop >= end - 1;
      element.scrollTo({ top: wrapped ? 0 : Math.min(end, element.scrollTop + rowHeight), behavior: wrapped ? "instant" : "smooth" });
    };
    const timer = window.setInterval(tick, DWELL_MS);
    element.addEventListener("pointerenter", stopScroll);
    element.addEventListener("focusin", stopScroll);
    motion.addEventListener("change", stopScroll);
    return () => {
      window.clearInterval(timer);
      element.removeEventListener("pointerenter", stopScroll);
      element.removeEventListener("focusin", stopScroll);
      motion.removeEventListener("change", stopScroll);
    };
  }, [first, items.length]);

  return (
    <section className={styles.ticker} aria-label="Recent updates">
      <h3 className={styles.heading}>Updates</h3>
      <div ref={viewport} className={styles.viewport}>
        {items.length ? (
          <ol className={styles.list} role="list">
            {items.map((item, index) => {
              const Icon = item.tone === "ok" ? CircleCheck : TriangleAlert;
              const date = new Date(item.at);
              const timestamp = date.toLocaleString();
              return (
                <li key={item.id} className={index === 0 ? styles.newest : undefined}>
                  <button type="button" className={styles.row} data-tone={item.tone} data-source={item.source}
                    title={item.assetId ? `${item.title} · ${item.assetId}` : item.title} onClick={() => openTickerItem(item)}>
                    <Icon size={14} strokeWidth={2} aria-hidden="true" className={styles.icon} />
                    <span className={styles.srOnly}>{status[item.tone]} · </span>
                    <span className={styles.title}>{item.title}</span>
                    <time dateTime={date.toISOString()} title={timestamp}>{timeAgo(item.at, now)}</time>
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
