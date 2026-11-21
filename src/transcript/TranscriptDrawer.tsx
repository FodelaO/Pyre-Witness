/** Opens the current session transcript as an accessible, searchable keyboard drawer. */
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ClipboardList, Download, Search, X } from "lucide-react";
import { CREW_ORDER } from "@/crew/types";
import { connectTranscriptAdapters } from "./featureAdapters";
import { downloadTranscript } from "./transcriptExport";
import { isPipelineRun, useTranscriptStore, type OpenTranscript, type TranscriptCrew, type TranscriptRun } from "./transcriptStore";
import { activityFallback, CREW_LABEL, includesSearch, locateStep, SOURCE_LABEL, timeline, timestamp } from "./transcriptSteps";
import TranscriptStepCard from "./TranscriptStepCard";
import "./transcript.css";

const CREW_FILTERS = ["gate", ...CREW_ORDER, "system"] as const;

function useTranscriptHotkey() {
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (!["t", "T"].includes(event.key)) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable
        || target.closest("input,select,textarea,[role=textbox]"))) return;
      const state = useTranscriptStore.getState();
      if (state.isOpen || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      state.open();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
}

function keyboardRows(event: KeyboardEvent<HTMLDivElement>) {
  if (!(event.target instanceof HTMLElement) || !event.target.hasAttribute("data-step-id")) return;
  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-step-id]"));
  const index = rows.indexOf(event.target);
  const next = ({
    ArrowDown: Math.min(rows.length - 1, index + 1), ArrowUp: Math.max(0, index - 1),
    Home: 0, End: rows.length - 1,
  } as Record<string, number>)[event.key];
  if (next === undefined) return;
  event.preventDefault();
  rows[next]?.focus();
}

export function TranscriptHistory({ runs, target }: { runs: readonly TranscriptRun[]; target: OpenTranscript }) {
  const orderedRuns = useMemo(() => [...runs].sort((a, b) =>
    Number(isPipelineRun(b)) - Number(isPipelineRun(a)) || b.startedAt - a.startedAt), [runs]);
  const [runId, setRunId] = useState(() => {
    const requested = target.runId ?? target.activity?.runId;
    if (requested || target.activity) return orderedRuns.find((run) => run.id === requested)?.id ?? "";
    return orderedRuns.find(isPipelineRun)?.id ?? "";
  });
  const [crewId, setCrewId] = useState<TranscriptCrew | "">(target.crewId ?? "");
  const [search, setSearch] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const positioned = useRef(false);
  const downloadMenu = useRef<HTMLDetailsElement>(null);
  const indexedRuns = useMemo(() => orderedRuns.map((run) => ({ run, steps: timeline(run) })), [orderedRuns]);
  const focusedStep = useMemo(() => locateStep(indexedRuns.filter(({ run }) => !target.runId || run.id === target.runId)
    .flatMap(({ steps }) => steps), target), [indexedRuns, target]);
  const query = search.trim().toLocaleLowerCase();
  const showing = indexedRuns
    .filter(({ run }) => !runId || run.id === runId)
    .map(({ run, steps }) => ({ run, steps: steps.filter((step) =>
      (!crewId || crewId === step.crew) && (!query || includesSearch(step, query))) }))
    .filter(({ steps }) => steps.length > 0);
  const linkedActivity = !query && !focusedStep && (!runId || runId === target.activity?.runId) && (!crewId || crewId === target.activity?.crew)
    ? activityFallback(target) : undefined;
  const visibleCount = showing.reduce((total, { steps }) => total + steps.length, linkedActivity ? 1 : 0);

  useEffect(() => {
    const container = scroll.current;
    if (!container || positioned.current) return;
    const key = focusedStep?.id ?? linkedActivity?.id;
    const row = key && [...container.querySelectorAll<HTMLElement>("[data-step-id]")].find((item) => item.dataset.stepId === key);
    if (row) {
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: "center" });
      positioned.current = true;
    }
  }, [focusedStep, linkedActivity]);

  return (
    <>
      <header className="pw-transcript-header">
        <div className="pw-transcript-title">
          <ClipboardList size={22} aria-hidden="true" />
          <div><h2 id="pw-transcript-title" tabIndex={-1}>Run transcript</h2>
            <p>{runs.length} {runs.length === 1 ? "run" : "runs"} · {visibleCount} {visibleCount === 1 ? "step" : "steps"} shown
              {runId && <button type="button" className="pw-transcript-all-runs"
                onClick={() => { setRunId(""); scroll.current?.scrollTo({ top: 0 }); }}>All runs</button>}
            </p>
          </div>
        </div>
        <div className="pw-transcript-header-actions">
          <details className="pw-transcript-download" ref={downloadMenu}>
            <summary className="pw-transcript-action"><Download size={15} aria-hidden="true" /> <span>Download transcript</span>
              <ChevronDown size={13} aria-hidden="true" />
            </summary>
            <div>
              {(["json", "md"] as const).map((format) => <button type="button" disabled={runs.length === 0} key={format}
                onClick={() => {
                  downloadTranscript(runs, format);
                  if (downloadMenu.current) downloadMenu.current.open = false;
                }}>{format === "json" ? "JSON" : "Markdown"}</button>)}
            </div>
          </details>
          <button className="pw-transcript-action pw-transcript-close" type="button" aria-label="Close transcript"
            title="Close transcript (Esc)" onClick={() => useTranscriptStore.getState().close()}>
            <X size={19} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="pw-transcript-toolbar" aria-label="Filter transcript">
        <label className="pw-transcript-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" aria-label="Search transcript" placeholder="Search transcript" value={search}
            onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className="pw-transcript-select">
          <span>Run</span>
          <select value={runId} onChange={(event) => { setRunId(event.target.value); scroll.current?.scrollTo({ top: 0 }); }}>
            <option value="">All runs</option>
            {orderedRuns.map((run) => <option key={run.id} value={run.id}>
              {SOURCE_LABEL[run.source]} · {run.label} · {timestamp(run.startedAt).slice(0, 8)}
            </option>)}
          </select>
        </label>
        <label className="pw-transcript-select">
          <span>Crew</span>
          <select value={crewId} onChange={(event) => { setCrewId(event.target.value as TranscriptCrew | ""); scroll.current?.scrollTo({ top: 0 }); }}>
            <option value="">All crew</option>
            {CREW_FILTERS.map((crew) => <option value={crew} key={crew}>{CREW_LABEL[crew]}</option>)}
          </select>
        </label>
      </div>
      <div className="pw-transcript-timeline" ref={scroll} onKeyDown={keyboardRows}>
        {!visibleCount && <div className="pw-transcript-empty">
          <ClipboardList size={30} aria-hidden="true" />
          <p>{runs.length ? "No steps match these filters." : "Run a capture to start the session transcript."}</p>
        </div>}
        {linkedActivity && <TranscriptStepCard step={linkedActivity} highlighted />}
        {showing.map(({ run, steps }) => <section key={run.id} data-run-group={run.id} className="pw-transcript-run">
          <div className="pw-transcript-run-header">
            <div><p>{SOURCE_LABEL[run.source]} · {timestamp(run.startedAt)}</p><h3>{run.label}</h3></div>
            <span className="pw-transcript-run-status" data-status={run.status}>{run.status}</span>
          </div>
          {steps.map((step) => <TranscriptStepCard step={step} key={step.id} highlighted={step.id === focusedStep?.id} />)}
        </section>)}
      </div>
    </>
  );
}

export default function TranscriptDrawer() {
  const isOpen = useTranscriptStore((state) => state.isOpen);
  const target = useTranscriptStore((state) => state.target);
  const runs = useTranscriptStore((state) => state.runs);
  const openVersion = useTranscriptStore((state) => state.openVersion);
  const dialog = useRef<HTMLDialogElement>(null);
  useTranscriptHotkey();
  useEffect(connectTranscriptAdapters, []);

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    if (isOpen && !panel.open) {
      panel.showModal();
      panel.querySelector<HTMLElement>("#pw-transcript-title")?.focus({ preventScroll: true });
    }
    if (!isOpen && panel.open) panel.close();
  }, [isOpen]);

  return (
    <dialog className="pw-transcript-drawer" ref={dialog} aria-labelledby="pw-transcript-title"
      onCancel={(event) => { event.preventDefault(); useTranscriptStore.getState().close(); }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        // Search inputs handle Escape natively before a dialog receives a cancel event.
        event.preventDefault();
        event.stopPropagation();
        useTranscriptStore.getState().close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) useTranscriptStore.getState().close();
      }}>
      {isOpen && <div className="pw-transcript-sheet"><TranscriptHistory key={openVersion} runs={runs} target={target} /></div>}
    </dialog>
  );
}
