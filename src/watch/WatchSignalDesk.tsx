/** Presents live feed health and plant-linked advisories in the Data panel. */
"use client";

import { ArrowUpRight, ChevronDown, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";
import { LIVE_SOURCE_LABELS, liveItemKey, type LiveItem, type LiveSourceResult } from "./liveTypes";
import { rankWatchItems, type WatchRelevance } from "./relevance";
import type { WatchReport } from "./types";
import { useWatchLive } from "./useWatchLive";
import { WatchLiveLoss } from "./WatchLiveLoss";
import { useWatchStore } from "./watchStore";
import "./watchSignals.css";

const sources = Object.keys(LIVE_SOURCE_LABELS) as LiveItem["source"][];
const shortLabel: Record<LiveItem["source"], string> = { "cisa-kev": "KEV", "cisa-ics": "ICS", "ncsc-news": "NCSC", "openfda": "FDA" };
const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const shortClock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function FeedIndicator({ source, result }: { source: LiveItem["source"]; result?: LiveSourceResult }) {
  const status = result?.error ? "failed" : result && result.ms >= 2500 ? "slow" : result ? "ok" : "pending";
  const timing = result?.cached ? "server cache" : result ? `${(result.ms / 1000).toFixed(1)} s` : "awaiting check";
  const description = result?.error ?? (result ? `${result.count} items · ${timing}` : timing);
  const label = `${LIVE_SOURCE_LABELS[source]} · ${status} · ${description}`;
  return <span className="pw-signal-source" title={label} tabIndex={0} aria-label={label}>
    <i data-state={status} aria-hidden />{shortLabel[source]}
  </span>;
}

function useRowHighlight() {
  const active = useRef<{ key: string; ids: string[] }>(undefined);
  const clear = useCallback((key?: string) => {
    const owner = active.current;
    if (!owner || (key && owner.key !== key)) return;
    const { highlightIds, setHighlight } = useTwinStore.getState();
    if (highlightIds === owner.ids) setHighlight([]);
    active.current = undefined;
  }, []);
  const show = (key: string, ids: string[]) => {
    const { highlightIds, setHighlight } = useTwinStore.getState();
    if (highlightIds === ids) return;
    active.current = { key, ids };
    setHighlight(ids);
  };
  useEffect(() => () => clear(), [clear]);
  return { show, clear };
}

function SignalRow({ row, isNew, twin, highlight }: {
  row: WatchRelevance;
  isNew: boolean;
  twin: Twin;
  highlight: ReturnType<typeof useRowHighlight>;
}) {
  const { item, assetIds, age, reasons, triage } = row;
  const recall = item.source === "openfda";
  const primary = assetIds[0];
  const key = liveItemKey(item);
  const select = (id: string) => useTwinStore.getState().select(id);
  const rowTitle = recall ? `${item.title} · ${item.firm} · ${item.summary}` : item.title;
  const { show, clear } = highlight;
  useEffect(() => () => clear(key), [clear, key]);

  return (
    <li className="pw-signal-row" data-watch-source={item.source} data-relevance={row.score} data-signal-asset={primary}
      onPointerEnter={() => show(key, assetIds)}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) clear(key); }}
      onFocus={() => show(key, assetIds)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) clear(key);
      }}
      onClick={() => select(primary)}>
      <div className="pw-signal-row-meta">
        <span>{LIVE_SOURCE_LABELS[item.source]}</span><span aria-hidden>·</span><time dateTime={item.published}>{age}</time>
        {item.source === "cisa-ics" && /^ICS[AM]/.test(item.id) && <span>· {item.id}</span>}
        {isNew && <span className="pw-signal-new">new</span>}
        {triage && <span className="pw-signal-triage" title={`Decisions triage · ${triage}`}>Decisions triage</span>}
      </div>
      <a className="pw-signal-title" href={item.url} target="_blank" rel="noopener noreferrer" title={rowTitle}>
        <span>{item.title}</span><ArrowUpRight size={12} aria-hidden />
      </a>
      {recall && <div className="pw-signal-recall-note">Sector recall · what the same failure would cost here</div>}
      <div className="pw-signal-chips" aria-label="Match evidence and assets">
        {assetIds.map((id, index) => {
          const label = !recall && index === 0 ? reasons[0] : id;
          const asset = twin.assets.find((entry) => entry.id === id);
          return <button key={id} type="button" className="pw-signal-chip" data-watch-select={id} title={`${label} · ${asset?.name ?? id}`}
            onClick={(event) => { event.stopPropagation(); select(id); }}>{label}</button>;
        })}
        {reasons.slice(recall ? 0 : 1).map((reason) => <span className="pw-signal-chip" key={reason}>{reason}</span>)}
      </div>
      <WatchLiveLoss row={row} twin={twin} />
    </li>
  );
}

function OtherItems({ rows, added }: { rows: WatchRelevance[]; added: Set<string> | undefined }) {
  if (!rows.length) return null;
  return (
    <details className="pw-signal-other">
      <summary><ChevronDown size={12} aria-hidden />{rows.length} other {rows.length === 1 ? "item" : "items"} today · not relevant to this plant</summary>
      <ul>
        {rows.map(({ item, age, triage }) => (
          <li key={liveItemKey(item)} data-watch-source={item.source}>
            <div className="pw-signal-row-meta">{LIVE_SOURCE_LABELS[item.source]} · {age}
              {added?.has(liveItemKey(item)) && <span className="pw-signal-new">new</span>}
              {triage === "excluded" && <span>Decisions excluded</span>}
            </div>
            <a className="pw-signal-title" href={item.url} target="_blank" rel="noopener noreferrer" title={item.title}>
              <span>{item.title}</span><ArrowUpRight size={12} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function WatchSignalDesk({ report, reviewing, onReview }: {
  report?: WatchReport;
  reviewing: boolean;
  onReview: () => void;
}) {
  const { snapshot, checking, error, nextAt, checkNow } = useWatchLive();
  const feed = useWatchStore((state) => state.feedStatus);
  const highlight = useRowHighlight();
  const twin = useEconomicTwin();
  const check = snapshot?.check;
  const checks = check?.sources;
  const rows = useMemo(() => check ? rankWatchItems(check.items, twin, check.checkedAt, report?.candidates) : [], [check, report?.candidates, twin]);
  const matched = rows.filter(({ assetIds }) => assetIds.length);
  const other = rows.filter(({ assetIds }) => !assetIds.length);
  const headline = report?.stages.some(({ name, state }) => name === "reassessment" && state === "done") ? report.headline : undefined;
  const label = { pending: "Awaiting check", live: "Live", stale: "Stale", offline: "Feed offline" }[feed];

  return (
    <section className="pw-signal-desk" aria-label="Plant intelligence" aria-busy={checking}>
      <div className="pw-signal-header">
        <div className="pw-signal-live" aria-live="polite">
          {check ? <>
            <strong>{label}</strong> · checked <time dateTime={new Date(check.checkedAt).toISOString()}>{(feed === "stale" ? shortClock : clock).format(check.checkedAt)}</time>
            {feed !== "stale" && <> · {checks?.length} sources</>}
          </> : error ?? <>Checking {sources.length} sources…</>}
        </div>
        <button type="button" className="pw-panel-button pw-signal-run" disabled={checking} onClick={() => { void checkNow(); onReview(); }}>
          <RefreshCw size={12} aria-hidden />Run now
        </button>
      </div>
      <div className="pw-signal-subhead">
        <div className="pw-signal-sources" aria-label="Source health">
          {sources.map((source) => <FeedIndicator key={source} source={source} result={checks?.find((entry) => entry.source === source)} />)}
        </div>
        {nextAt && <span>Next <time dateTime={new Date(nextAt).toISOString()}>{clock.format(nextAt)}</time></span>}
      </div>
      {check && error && <div className="pw-signal-basis" role="status">{error}</div>}
      <div className="pw-signal-basis">Inventory assumed (simulated plant) · matched by rule</div>
      {(headline || reviewing) && <div className="pw-signal-chief" title={headline} aria-live="polite">
        <strong>Chief</strong> · {headline ?? "Reviewing advisories…"}
      </div>}
      {matched.length > 0 && <ul className="pw-signal-list" aria-label="Matched to this plant">
        {matched.map((row) => <SignalRow key={liveItemKey(row.item)} row={row} twin={twin} highlight={highlight}
          isNew={snapshot?.added.has(liveItemKey(row.item)) ?? false} />)}
      </ul>}
      {check && feed === "live" && !matched.length && <div className="pw-signal-empty">No current matches for this plant.</div>}
      <OtherItems rows={other} added={snapshot?.added} />
    </section>
  );
}
