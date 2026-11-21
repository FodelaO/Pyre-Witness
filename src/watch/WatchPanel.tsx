/** Collapsible daily advisory review with source and provider status. */
"use client";

import { ChevronDown, Radar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MitigationQueue } from "@/panel/MitigationQueue";
import { watchStatus } from "@/shell/watchStatus";
import { useTwinStore } from "@/twin/store";
import { WATCH_SOURCES } from "./sources";
import type { ThreatSource, WatchStage } from "./types";
import { useWatchLive } from "./useWatchLive";
import { useWatchStore, type WatchRunState } from "./watchStore";
import { WatchThreats } from "./WatchResults";
import { WatchSignalDesk } from "./WatchSignalDesk";

const stageLabel: Record<WatchStage["name"], string> = {
  feeds: "Reading live feeds", matches: "Matching inventory", triage: "Triaging candidates",
  reassessment: "Reassessing plant risk", rules: "Measuring proposals", managed: "Running Antigravity",
};
const sourceIds = Object.keys(WATCH_SOURCES) as ThreatSource[];
const managedPhase = { started: "Started", running: "Running", done: "Done", failed: "Failed" } as const;
const feedPresentation = {
  pending: { label: "Ready", dot: "Ready" },
  checking: { label: "Checking", dot: "Checking" },
  live: { label: "Live", dot: "Complete" },
  stale: { label: "Stale", dot: "Partial" },
  offline: { label: "Feed offline", dot: "Feed offline" },
} as const;

function CheckedAge({ checkedAt }: { checkedAt: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.max(0, Math.floor((now - checkedAt) / 60_000));
  return <time dateTime={new Date(checkedAt).toISOString()}>{minutes ? `checked ${minutes} min ago` : "checked just now"}</time>;
}

export function WatchRun({ run, managed = false }: { run: WatchRunState; managed?: boolean }) {
  const keyMissing = run.stages.some(({ state, detail }) => state === "failed" && /GEMINI_API_KEY/i.test(detail));
  const modelUnavailable = run.stages.some(({ name, state }) => name !== "feeds" && state === "failed");
  const status = watchStatus(run);
  const report = run.report;
  const reportStages = report?.stages ?? run.stages;
  const elapsedSeconds = (reportStages.reduce((total, stage) => total + stage.ms, 0) / 1000).toFixed(1);
  const mitigations = useTwinStore((state) => state.mitigations);
  const proposals = report?.recommendations.length ? mitigations.filter(({ id, proposedBy }) => proposedBy === "threat-watch"
    && report.recommendations.some((item) => item.id === id)) : [];
  const sandbox = run.managedProgress;
  const sourceResults = sandbox?.feeds;

  return (
    <div className="pw-watch-run">
      {sandbox && (
        <div className="pw-watch-note" aria-live="polite" data-attention={sandbox.phase === "failed" || undefined}>
          <p>Google-hosted Antigravity · {managedPhase[sandbox.phase]} · {(sandbox.ms / 1000).toFixed(1)} s</p>
          {sandbox.environmentId && <p className="pw-mono break-all text-[10px]">Environment {sandbox.environmentId}</p>}
        </div>
      )}
      {managed && <div className="pw-panel-chips" aria-label="Sandbox sources">
        {sourceIds.map((source) => {
          const result = sourceResults?.find((item) => item.source === source);
          const label = WATCH_SOURCES[source].label;
          const failed = result?.status === "failed";
          return (
            <span className="pw-panel-chip pw-mono" key={source} data-tone={failed ? "attention" : undefined}
              title={failed ? label + " offline" : undefined}>
              {label} {failed ? "offline" : result?.count ?? "–"}
            </span>
          );
        })}
      </div>}
      <div aria-live="polite">
        {managed && run.working && (!sandbox || run.working !== "managed") && <p className="pw-watch-note">{stageLabel[run.working]}…</p>}
        {run.status === "error" ? (
          <p className="pw-watch-note" data-attention>{status === "Key missing" ? "Gemini key missing." : "Model review unavailable."}</p>
        ) : keyMissing || modelUnavailable ? (
          <p className="pw-watch-note" data-attention>{keyMissing ? "Gemini key missing." : "Model review unavailable."}</p>
        ) : managed && report?.headline ? <p>{report.headline}</p> : null}
        {run.status === "finished" && run.message && <p className="pw-watch-note" data-attention>{run.message}</p>}
      </div>
      {managed && <WatchThreats candidates={run.candidates} unmatchedNews={run.unmatchedNews} report={report} managed />}
      {proposals.length > 0 && <MitigationQueue items={proposals} label="Recommendations" />}
      {!!report?.warnings.length && (
        <details className="pw-watch-notes">
          <summary>Run notes · {report.warnings.length}</summary>
          <ul>{report.warnings.map((warning, index) => <li key={index}>{warning.split("\n")[0].slice(0, 180)}</li>)}</ul>
        </details>
      )}
      {report && (
        <details className="pw-watch-notes">
          <summary>
            Model review <time dateTime={new Date(report.finishedAt).toISOString()}>{new Date(report.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            {" · "}{elapsedSeconds} s
          </summary>
          <ul>{reportStages.map((stage) => (
            <li key={stage.name}>{stage.model ?? stageLabel[stage.name]} · {stage.ms} ms · {stage.state}</li>
          ))}</ul>
        </details>
      )}
    </div>
  );
}

export default function WatchPanel({ open, reveal = 0, onOpenChange }: { open: boolean; reveal?: number; onOpenChange: (open: boolean) => void }) {
  const review = useWatchStore((state) => state.review);
  const feed = useWatchStore((state) => state.feedStatus);
  const managed = useWatchStore((state) => state.managed);
  const runDaily = useWatchStore((state) => state.runDaily);
  const runNow = useWatchStore((state) => state.runNow);
  const live = useWatchLive();
  const summary = useRef<HTMLElement>(null);
  const lastReveal = useRef(0);

  useEffect(() => {
    runDaily();
  }, [runDaily]);
  useEffect(() => {
    if (!open || reveal === lastReveal.current) return;
    lastReveal.current = reveal;
    summary.current?.scrollIntoView({ block: "nearest" });
  }, [open, reveal]);

  const feedState = feed !== "pending" ? feed : live.checking ? "checking" : live.error ? "offline" : "pending";
  const presentation = feedPresentation[feedState];
  const partial = feedState === "live" && live.snapshot?.check.sources.some(({ error }) => Boolean(error));
  const dot = partial ? "Partial" : presentation.dot;
  return (
    <details id="pw-watch" className="pw-watch pw-panel-disclosure pw-rail-section" data-pane="watch" open={open}
      onToggle={(event) => { if (event.target === event.currentTarget) onOpenChange(event.currentTarget.open); }}>
      <summary ref={summary}>
        <span><Radar size={16} aria-hidden />Threat watch</span>
        <span className="pw-watch-state"><i className="pw-status-dot" data-status={dot} aria-hidden />{presentation.label}
          {review.cached && review.checkedAt !== undefined && <><span aria-hidden>·</span><CheckedAge checkedAt={review.checkedAt} /></>}
        </span>
        <ChevronDown size={14} className="pw-panel-disclosure-caret" aria-hidden />
      </summary>
      <div className="pw-watch-body">
        <WatchSignalDesk live={live} feed={feed} label={presentation.label} report={review.report}
          reviewing={review.status === "running"} onReview={() => void runNow()}>
          <WatchRun run={review} />
          <details className="pw-watch-notes">
            <summary>Antigravity comparison</summary>
            <div className="pw-watch-managed">
              <button type="button" className="pw-panel-button" disabled={managed.status === "running"} onClick={() => void runNow("managed")}>
                Run Google-hosted watch
              </button>
              {managed.status !== "idle" && <WatchRun run={managed} managed />}
            </div>
          </details>
        </WatchSignalDesk>
      </div>
    </details>
  );
}
