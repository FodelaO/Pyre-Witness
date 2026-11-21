/** Presents live feed health and plant-linked advisories in the Data panel. */
"use client";

import { ArrowUpRight, ChevronDown, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";
import { missingWatchDrills } from "./drills";
import type { WatchFeedStatus } from "./feedStatus";
import { LIVE_SOURCE_LABELS, liveItemKey, type LiveItem, type LiveSourceResult } from "./liveTypes";
import { rankWatchItems, type WatchRelevance } from "./relevance";
import type { WatchReport } from "./types";
import type { useWatchLive } from "./useWatchLive";
import { WatchAlertCard, WatchAlertIcon, WatchTypeLabel } from "./WatchAlertCard";
import { useWatchLiveEstimate } from "./WatchLiveLoss";
import { WatchResolutionStatus } from "./WatchResolutionStatus";
import { classifyVuln } from "./vulnType";
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
  const asset = twin.assets.find(({ id }) => id === primary);
  const estimate = useWatchLiveEstimate(twin, row);
  const { show, clear } = highlight;
  useEffect(() => () => clear(key), [clear, key]);

  return (
    <li className="pw-signal-row" data-watch-source={item.source} data-relevance={row.score} data-signal-asset={primary}
      onPointerEnter={() => { if (primary) show(key, assetIds); }}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) clear(key); }}
      onFocus={() => { if (primary) show(key, assetIds); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) clear(key);
      }}>
      <WatchAlertCard title={item.title} type={classifyVuln(item)} asset={asset} estimate={estimate} comparable={recall}
        tone={row.knownExploited || (row.cvss ?? 0) >= 9 ? "alert" : "warn"}
        resolution={primary && <WatchResolutionStatus itemKey={key} />}>
        <div className="pw-signal-row-meta">
          <span>{LIVE_SOURCE_LABELS[item.source]}</span><span aria-hidden>·</span><time dateTime={item.published}>{age}</time>
          {item.source === "cisa-ics" && /^ICS[AM]/.test(item.id) && <span>· {item.id}</span>}
          {isNew && <span className="pw-signal-new">new</span>}
          {triage && <span className="pw-signal-triage">Decisions triage · {triage}</span>}
        </div>
        <a className="pw-panel-link" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}<ArrowUpRight size={12} aria-hidden />
        </a>
        {recall && primary && <div className="pw-signal-recall-note">Sector recall · modeled comparable event</div>}
        {recall && item.firm && <p>{item.firm}</p>}
        {item.summary && <p>{item.summary}</p>}
        {(assetIds.length > 0 || reasons.length > 0) && <div className="pw-signal-chips" aria-label="Match evidence and assets">
          {assetIds.map((id, index) => {
            const label = (!recall && index === 0 ? reasons[0] : id) ?? id;
            const linked = twin.assets.find((entry) => entry.id === id);
            return <button key={id} type="button" className="pw-signal-chip" data-watch-select={id} title={`${label} · ${linked?.name ?? id}`}
              onClick={() => select(id)}>{label}</button>;
          })}
          {reasons.slice(recall || !primary ? 0 : 1).map((reason) => <span className="pw-signal-chip" key={reason}>{reason}</span>)}
        </div>}
      </WatchAlertCard>
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
            <WatchTypeLabel type={classifyVuln(item)} />
          </li>
        ))}
      </ul>
    </details>
  );
}

export function WatchSignalDesk({ live, feed, label, report, reviewing, onReview, children }: {
  live: ReturnType<typeof useWatchLive>;
  feed: WatchFeedStatus;
  label: string;
  report?: WatchReport;
  reviewing: boolean;
  onReview: () => void;
  children?: ReactNode;
}) {
  const { snapshot, checking, error, nextAt, checkNow } = live;
  const highlight = useRowHighlight();
  const twin = useEconomicTwin();
  const check = feed === "pending" ? undefined : snapshot?.check;
  const checks = check?.sources;
  const rows = useMemo(() => check ? rankWatchItems(check.items, twin, check.checkedAt, report?.candidates) : [], [check, report?.candidates, twin]);
  const drills = useMemo(() => check ? missingWatchDrills(check.items, twin) : [], [check, twin]);
  const matched = rows.filter(({ assetIds }) => assetIds.length);
  const shownTypes = new Set(matched.map(({ item }) => classifyVuln(item)));
  // Keep one real representative visible when a type has news but no plant match.
  const sector: WatchRelevance[] = [];
  const other: WatchRelevance[] = [];
  for (const row of rows) {
    if (row.assetIds.length) continue;
    const type = classifyVuln(row.item);
    if (type === "advisory" || shownTypes.has(type)) {
      other.push(row);
      continue;
    }
    shownTypes.add(type);
    sector.push(row);
  }
  const headline = report?.stages.some(({ name, state }) => name === "reassessment" && state === "done") ? report.headline : undefined;
  const checked = check && (feed === "stale" ? shortClock : clock).format(check.checkedAt);
  const sourceCount = check && feed !== "stale" ? ` · ${check.sources.length} sources` : "";
  const title = `${label}${checked ? ` · checked ${checked}${sourceCount}` : ""}`;

  return (
    <section className="pw-signal-desk" aria-label="Plant intelligence" aria-busy={checking}>
      <div className="pw-signal-header">
        <div className="pw-signal-live" aria-live="polite" title={title}>
          Simulated plant inventory
        </div>
        <button type="button" className="pw-panel-button pw-signal-run" disabled={checking} onClick={() => { void checkNow(); onReview(); }}>
          <RefreshCw size={12} aria-hidden />Run now
        </button>
      </div>
      {error && <div className="pw-signal-basis" role="status">{error}</div>}
      {(matched.length > 0 || sector.length > 0 || drills.length > 0) && <ul className="pw-signal-list" aria-label="Advisories and drills">
        {[...matched, ...sector].map((row) => <SignalRow key={liveItemKey(row.item)} row={row} twin={twin} highlight={highlight}
          isNew={snapshot?.added.has(liveItemKey(row.item)) ?? false} />)}
        {drills.map(({ type, title, asset, estimate }) => (
          <li key={type} className="pw-signal-row">
            <WatchAlertCard title={title} type={type} asset={asset} estimate={estimate} drill
              resolution={<WatchResolutionStatus itemKey={`drill:${type}`} />}>
              <p>{title}</p>
              <p>Simulated scenario · estimated loss per event</p>
            </WatchAlertCard>
          </li>
        ))}
      </ul>}
      {check && feed === "live" && !matched.length && <div className="pw-signal-empty">
        {!check.sources.some(({ error }) => Boolean(error)) && <WatchAlertIcon tone="ok" />}
        No current matches for this plant.
      </div>}
      <details className="pw-watch-notes pw-signal-evidence">
        <summary>See more</summary>
        <div>
          <div className="pw-signal-basis">{title} · matched by rule</div>
          <div className="pw-signal-subhead">
            <div className="pw-signal-sources" aria-label="Source health">
              {sources.map((source) => <FeedIndicator key={source} source={source} result={checks?.find((entry) => entry.source === source)} />)}
            </div>
            {nextAt && <span>Next <time dateTime={new Date(nextAt).toISOString()}>{clock.format(nextAt)}</time></span>}
          </div>
          {(headline || reviewing) && <div className="pw-signal-chief" aria-live="polite">
            <strong>Chief</strong> · {headline ?? "Reviewing advisories…"}
          </div>}
          <OtherItems rows={other} added={snapshot?.added} />
          {children}
        </div>
      </details>
    </section>
  );
}
