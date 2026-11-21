/** Collapsible daily advisory review with source and provider status. */
"use client";

import { ChevronDown, Radar, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { watchStatus } from "@/shell/watchStatus";
import { WATCH_SOURCES } from "./sources";
import type { ThreatSource, WatchStage } from "./types";
import { useWatchStore, watchDay, type WatchRunState } from "./watchStore";
import { WatchThreats } from "./WatchResults";

const stageLabel: Record<WatchStage["name"], string> = {
  feeds: "Reading live feeds", matches: "Matching inventory", triage: "Triaging candidates",
  reassessment: "Reassessing plant risk", rules: "Measuring proposals", managed: "Running Antigravity",
};
const sourceIds = Object.keys(WATCH_SOURCES) as ThreatSource[];

export function WatchRun({ run }: { run: WatchRunState }) {
  const keyMissing = run.stages.some(({ state, detail }) => state === "failed" && /GEMINI_API_KEY/i.test(detail));
  const modelUnavailable = run.stages.some(({ name, state }) => name !== "feeds" && state === "failed");
  const status = watchStatus(run);
  const elapsedSeconds = (run.stages.reduce((total, stage) => total + stage.ms, 0) / 1000).toFixed(1);
  const report = run.report;

  return (
    <div className="pw-watch-run">
      <div className="pw-panel-chips" aria-label="Threat sources">
        {sourceIds.map((source) => {
          const result = run.sources.find((item) => item.source === source);
          const label = WATCH_SOURCES[source].label;
          return (
            <span className="pw-panel-chip pw-mono" key={source} data-tone={result?.error ? "attention" : undefined}
              title={result?.error ? label + " offline" : undefined}>
              {label} {result?.error ? "offline" : result?.count ?? "–"}
            </span>
          );
        })}
      </div>
      <div aria-live="polite">
        {run.working && <p className="pw-watch-note">{stageLabel[run.working]}…</p>}
        {run.status === "error" ? (
          <p className="pw-watch-note" data-attention>{status === "Key missing" ? "Gemini key missing." : "Feed offline."}</p>
        ) : keyMissing || modelUnavailable ? (
          <p className="pw-watch-note" data-attention>{keyMissing ? "Gemini key missing." : "Model review unavailable."}</p>
        ) : report?.headline ? <p>{report.headline}</p> : null}
      </div>
      <WatchThreats candidates={run.candidates} report={report} />
      {!!report?.warnings.length && (
        <details className="pw-watch-notes">
          <summary>Run notes · {report.warnings.length}</summary>
          <ul>{report.warnings.map((warning, index) => <li key={index}>{warning.split("\n")[0].slice(0, 180)}</li>)}</ul>
        </details>
      )}
      {report && (
        <details className="pw-watch-notes">
          <summary>
            Last check <time dateTime={new Date(report.finishedAt).toISOString()}>{new Date(report.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            {" · "}{elapsedSeconds} s
          </summary>
          <ul>{run.stages.map((stage) => (
            <li key={stage.name}>{stage.model ?? stageLabel[stage.name]} · {stage.ms} ms · {stage.state}</li>
          ))}</ul>
        </details>
      )}
    </div>
  );
}

export default function WatchPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const run = useWatchStore((state) => state.local);
  const managed = useWatchStore((state) => state.managed);
  const runDaily = useWatchStore((state) => state.runDaily);
  const runNow = useWatchStore((state) => state.runNow);
  const summary = useRef<HTMLElement>(null);

  useEffect(() => { runDaily(); }, [runDaily]);
  useEffect(() => {
    if (open) summary.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const status = watchStatus(run);
  return (
    <details id="pw-watch" className="pw-watch pw-panel-disclosure" open={open}
      onToggle={(event) => { if (event.target === event.currentTarget) onOpenChange(event.currentTarget.open); }}>
      <summary ref={summary}>
        <span><Radar size={16} aria-hidden />Threat watch</span>
        <span className="pw-watch-state"><i className="pw-status-dot" data-status={status} aria-hidden />{status}</span>
        <ChevronDown size={14} className="pw-panel-disclosure-caret" aria-hidden />
      </summary>
      <div className="pw-watch-body">
        <div className="pw-watch-meta">
          <span>Assumed inventory · simulated plant</span>
          <button type="button" className="pw-panel-button" disabled={run.status === "running"} onClick={() => void runNow()}>
            <RefreshCw size={13} aria-hidden />Run now
          </button>
        </div>
        <WatchRun run={run} />
        <details className="pw-watch-notes">
          <summary>Antigravity comparison</summary>
          <div className="pw-watch-managed">
            <button type="button" className="pw-panel-button" disabled={managed.status === "running"} onClick={() => void runNow("managed")}>
              Run Google-hosted watch
            </button>
            {managed.status !== "idle" && <WatchRun run={managed} />}
          </div>
        </details>
        <time className="pw-mono pw-watch-date" dateTime={watchDay()}>{watchDay()} UTC</time>
      </div>
    </details>
  );
}
