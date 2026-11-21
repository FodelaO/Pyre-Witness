/** Shows the newest actual crew steps while preserving the reader's scroll position. */
"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { useTranscriptStore } from "@/transcript/transcriptStore";
import { useFeedStore } from "./feedStore";
import { CREW } from "./types";
import "./crewActivityFeed.css";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export default function ActivityFeed() {
  const entries = useFeedStore((state) => state.entries);
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const previous = useRef(entries);

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    if (pinned.current) element.scrollTop = 0;
    else {
      const rowHeight = element.firstElementChild?.getBoundingClientRect().height ?? 0;
      const oldIndex = Math.floor(element.scrollTop / (rowHeight || 1));
      const anchor = entries.findIndex((entry) => entry.id === previous.current[oldIndex]?.id);
      element.scrollTop = anchor < 0 ? element.scrollHeight : element.scrollTop + (anchor - oldIndex) * rowHeight;
    }
    previous.current = entries;
  }, [entries]);

  return (
    <section className="pw-crew-feed" aria-label="Crew activity">
      <div className="pw-crew-feed-actions">
        <button type="button" aria-haspopup="dialog" onClick={() => useTranscriptStore.getState().open()}>
          Open transcript <ArrowUpRight size={12} aria-hidden />
        </button>
      </div>
      {entries.length ? (
        <ol ref={list} className="pw-crew-feed-list pw-scroll" aria-label="Crew activity entries" tabIndex={0}
          onScroll={(event) => { pinned.current = event.currentTarget.scrollTop < 2; }}>
          {entries.map((entry) => {
            const { name, colorVar } = CREW[entry.crew];
            const time = timeFormat.format(entry.at);
            const latency = entry.latencyMs === undefined ? "" : `${Math.round(entry.latencyMs)} ms`;
            const source = entry.kind === "patrol" ? "idle patrol" : entry.kind === "sim" ? "SIMULATION" : "";
            const label = [time, name, source, entry.text, entry.engine, latency].filter(Boolean).join(" · ");
            return (
              <li key={entry.id} data-kind={entry.kind} data-attention={entry.attention} className="pw-crew-feed-entry">
                <button type="button" title={label} aria-haspopup="dialog" aria-label={`View transcript step · ${label}`}
                  onClick={() => useTranscriptStore.getState().open({
                    crewId: entry.eventType ? undefined : entry.crew, runId: entry.runId, at: entry.at,
                    eventType: entry.eventType, entryId: entry.transcriptEntryId, activity: entry,
                  })}>
                  <time className="pw-mono" dateTime={new Date(entry.at).toISOString()}>{time}</time>
                  <span className="pw-crew-feed-dot" style={{ backgroundColor: `var(${entry.attention ? "--pw-attention" : colorVar})` }} aria-hidden />
                  <span className="pw-crew-feed-line" aria-hidden>
                    {source && <span className="pw-crew-feed-patrol">{source}</span>}
                    <span className="pw-crew-feed-message">{entry.text}</span>
                    {entry.engine && <span className="pw-crew-feed-engine pw-mono">{entry.engine}</span>}
                    {latency && <span className="pw-crew-feed-latency pw-mono">{latency}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : <p className="pw-crew-feed-empty">Waiting for crew activity.</p>}
    </section>
  );
}
