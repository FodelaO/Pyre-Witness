/** Mountable daily threat watch panel for the plant results rail. */
"use client";

import { Radar, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { WATCH_SOURCES } from "./sources";
import type { ThreatSource, WatchStage } from "./types";
import { useWatchStore, watchDay, type WatchRunState } from "./watchStore";
import { WatchRecommendations, WatchThreats } from "./WatchResults";

const stages: Record<WatchStage["name"], string> = {
  feeds: "Reading live feeds", matches: "Matching inventory", triage: "Triaging candidates",
  reassessment: "Reassessing plant risk", rules: "Measuring proposals", managed: "Running Antigravity",
};
const sourceIds = Object.keys(WATCH_SOURCES) as ThreatSource[];

export function WatchRun({ run }: { run: WatchRunState }) {
  const lastRun = run.report && new Date(run.report.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const models = run.stages.filter(({ name, model }) => name !== "rules" && model).map(({ model }) => model);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" aria-label="Threat sources">
        {sourceIds.map((source) => {
          const result = run.sources.find((item) => item.source === source);
          const label = WATCH_SOURCES[source].label;
          return (
            <span key={source} title={result?.error ?? (result ? `${result.ms} ms${result.cached ? " · cached" : ""}` : label)}
              className={`rounded border border-pw-line px-1.5 py-0.5 font-mono text-[10px] ${result?.error ? "text-pw-attention" : "text-pw-dim"}`}>
              {label} {result?.error ? "unavailable" : result?.count ?? "–"}
            </span>
          );
        })}
      </div>
      <div aria-live="polite" className="space-y-1">
        {run.working && <p className="text-pw-dim">{stages[run.working]}…</p>}
        {run.report?.headline && <p>{run.report.headline}</p>}
        {run.message && <p className="text-pw-attention">{run.message}</p>}
        {run.stages.filter(({ state }) => state === "failed").map((stage) => (
          <p className="text-[11px] text-pw-attention" key={stage.name}>{stage.detail}</p>
        ))}
      </div>
      <WatchThreats candidates={run.candidates} report={run.report} />
      {run.report && <WatchRecommendations report={run.report} />}
      {!!run.report?.warnings.length && (
        <details className="text-[11px] text-pw-attention">
          <summary className="cursor-pointer">Run notes · {run.report.warnings.length}</summary>
          <ul className="space-y-1 pt-1">{run.report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </details>
      )}
      {lastRun && (
        <details className="font-mono text-[10px] text-pw-dim">
          <summary className="cursor-pointer">
            Last run {lastRun} · {(run.stages.reduce((sum, stage) => sum + stage.ms, 0) / 1000).toFixed(1)} s
            {models.length > 0 && <span className="block">{models.join(" · ")}</span>}
          </summary>
          <ul className="space-y-1 pt-1">
            {run.stages.map((stage) => <li key={stage.name}>{stage.model ?? stages[stage.name]} · {stage.ms} ms · {stage.state}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function WatchPanel() {
  const run = useWatchStore((state) => state.local);
  const managed = useWatchStore((state) => state.managed);
  const runDaily = useWatchStore((state) => state.runDaily);
  const runNow = useWatchStore((state) => state.runNow);
  useEffect(() => { runDaily(); }, [runDaily]);

  const limited = run.stages.some(({ state }) => state === "failed") || run.sources.some(({ error }) => error);
  const status = run.status === "running" ? "Running" : run.status === "error" ? "Failed"
    : run.status === "idle" ? "Ready" : limited ? "Partial" : "Complete";
  const dot = status === "Complete" ? "bg-pw-ok" : status === "Running" ? "bg-pw-info"
    : status === "Failed" || status === "Partial" ? "bg-pw-attention" : "bg-pw-faint";

  return (
    <section className="min-w-0 space-y-2 border-t border-pw-line px-3 py-3 text-xs text-pw-text" aria-label="Threat watch">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Radar size={15} aria-hidden />Threat watch</h3>
        <button type="button" disabled={run.status === "running"} onClick={() => void runNow()}
          className="flex items-center gap-1 rounded border border-pw-line-strong px-2 py-1 text-[11px] hover:border-pw-info disabled:opacity-50">
          <RefreshCw size={12} aria-hidden />Run now
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-pw-dim">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        <span>{status}</span><time dateTime={watchDay()}>{watchDay()} UTC</time>
      </div>
      <p className="text-[11px] text-pw-dim">assumed BOM (simulated plant)</p>
      <WatchRun run={run} />
      <details className="border-t border-pw-line pt-2">
        <summary className="cursor-pointer text-[11px] text-pw-dim">Antigravity · Google-hosted comparison</summary>
        <div className="mt-2 space-y-2">
          <button type="button" disabled={managed.status === "running"} onClick={() => void runNow("managed")}
            className="rounded border border-pw-line-strong px-2 py-1 text-[11px] hover:border-pw-info disabled:opacity-50">
            Run managed watch
          </button>
          {managed.status !== "idle" && <WatchRun run={managed} />}
        </div>
      </details>
    </section>
  );
}
