/** Pinned risk, assessment and watch readouts for the plant. */
"use client";

import { AudioLines, Crosshair, ImagePlus, List, Radio } from "lucide-react";
import { lazy, useEffect, useRef, useState } from "react";
import { useLensStore } from "@/layers/lensStore";
import ModelerPanel from "@/modeler/ModelerPanel";
import { useModelerStore } from "@/modeler/modelerStore";
import SourcesStrip from "@/modeler/SourcesStrip";
import { useRunStore, type RunState } from "@/pipeline/runStore";
import { Slot } from "@/shell/Slot";
import { useTwinStore } from "@/twin/store";
import { AssetInspector } from "./AssetInspector";
import { DeviceCard } from "./DeviceCard";
import { Disclosure, PanelHeading, PanelSection, TextPreview } from "./PanelParts";
import { PanelWorkspace } from "./PanelWorkspace";
import { RailUpdates } from "./RailUpdates";
import { RiskDial } from "./RiskDial";
import { RunAnswers } from "./RunAnswers";
import { placementChecks } from "./runEvidence";
import { RunError, RunProgress } from "./RunProgress";
import { SimulationComparison } from "./SimulationComparison";
import { OptionalTodos } from "./TodoSection";
import "./fitPreviewPanel.css";
import "./rightPane.css";

const ActivityFeed = lazy(() => import("@/crew/ActivityFeed"));
const FitPreview = lazy(() => import(/* turbopackOptional: true */ "@/fit/FitPreview"));
const SpeakButton = lazy(() => import(/* turbopackOptional: true */ "@/voice/SpeakButton"));
const WatchPanel = lazy(() => import("@/watch/WatchPanel"));

function runThumbnail(run: RunState) {
  const photo = run.captureThumbnail;
  if (photo?.dataBase64 && /^image\/(jpeg|png|webp)$/i.test(photo.mimeType)) {
    return "data:" + photo.mimeType + ";base64," + photo.dataBase64;
  }
  const source = run.events.findLast((event) => event.type === "link.fetched")?.snapshot.imageUrl;
  if (!source) return undefined;
  try {
    const url = new URL(source);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

type Props = {
  captureOpen: boolean;
  setCaptureEditor: (editor: HTMLDivElement | null) => void;
  modelerOpen: boolean;
  onModelerOpen: (open: boolean) => void;
  previewModel: boolean;
  watchOpen: boolean;
  watchReveal: number;
  onWatchOpen: (open: boolean) => void;
};

export default function SidePanel({ captureOpen, setCaptureEditor, modelerOpen, onModelerOpen, previewModel, watchOpen, watchReveal, onWatchOpen }: Props) {
  const mode = useLensStore((state) => state.mode);
  const run = useRunStore();
  const { runId, status, stage, events, gate, error, summary, profile, assessment, placedAssetId } = run;
  const selectedId = useTwinStore((state) => state.selectedId);
  const [dismissedRun, setDismissedRun] = useState<string | null | undefined>(undefined);
  const results = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const running = status === "running";
  const hasRun = status !== "idle";
  const focused = hasRun && (running || dismissedRun !== runId);
  const thumbnail = focused && profile ? runThumbnail(run) : undefined;
  const checks = placementChecks(events);
  const pendingPlacement = running || !checks.recommendation;

  useEffect(() => {
    if (focused && !captureOpen && runId) results.current?.scrollIntoView({ block: "start" });
  }, [captureOpen, focused, runId]);
  useEffect(() => {
    if (selectedId && !captureOpen && (!focused || mode === "data")) inspector.current?.scrollIntoView({ block: "nearest" });
  }, [captureOpen, focused, mode, selectedId]);
  useEffect(() => {
    const modeler = useModelerStore.getState();
    if (!previewModel && modeler.previewId) modeler.preview(null);
  }, [previewModel]);

  function toggleResults() {
    setDismissedRun(focused ? runId : undefined);
    if (focused) inspector.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="pw-panel" role="region" aria-label="Plant results">
      <RiskDial action={hasRun && !running && !captureOpen && (
        <button className="pw-panel-link pw-panel-run-toggle" type="button" onClick={toggleResults}>
          {focused ? <><Crosshair size={14} aria-hidden />Inspect</> : <><List size={14} aria-hidden />Results</>}
        </button>
      )} />
      <PanelWorkspace captureOpen={captureOpen} setCaptureEditor={setCaptureEditor}>
        <Slot name="To-do" quiet><OptionalTodos /></Slot>
        <Slot name="Threat watch" quiet><WatchPanel open={watchOpen} reveal={watchReveal} onOpenChange={onWatchOpen} /></Slot>
        <Slot name="Updates" quiet><RailUpdates /></Slot>
        <section className="pw-panel-section pw-rail-section" data-pane="asset" ref={inspector}><AssetInspector mode={mode} /></section>
        <div className="pw-panel-modeler" hidden={mode === "data"}>
          <Slot name="Twin modeler">
            <ModelerPanel open={modelerOpen} onOpenChange={onModelerOpen}><SourcesStrip /></ModelerPanel>
          </Slot>
        </div>
        {focused && (
          <div ref={results}>
            {error && <PanelSection><RunError message={error.message} /></PanelSection>}
            {(running || (!profile && gate)) && (
              <PanelSection><RunProgress {...{ status, stage, events, gate, error }} /></PanelSection>
            )}
            {profile && <PanelSection><DeviceCard profile={profile} thumbnail={thumbnail} mode={mode} /></PanelSection>}
            <RunAnswers {...{ mode, assessment, placedAssetId, ...checks }} objectClass={profile?.object_class} pending={pendingPlacement} />
            {summary && mode === "both" && (
              <PanelSection>
                <PanelHeading icon={AudioLines} aside={
                  <span className="pw-panel-voice">
                    <Slot name="Chief briefing audio" quiet><SpeakButton text={summary} /></Slot>
                  </span>
                }>Chief briefing <span className="pw-panel-muted">· AI guidance</span></PanelHeading>
                <div className="pw-panel-briefing"><TextPreview text={summary} label="Full briefing" lines={3} /></div>
              </PanelSection>
            )}
          </div>
        )}
        <SimulationComparison />
        {focused && profile && assessment && !running && checks.recommendation?.passed !== false && mode !== "data" && (
          <Disclosure className="pw-panel-fit-tools" label={<span><ImagePlus size={14} aria-hidden />Fit preview</span>}>
            <Slot name="Fit preview" quiet><FitPreview /></Slot>
          </Disclosure>
        )}
        {focused && profile && !running && (
          <PanelSection><Disclosure label="Analysis details"><RunProgress {...{ status, stage, events, gate, error }} /></Disclosure></PanelSection>
        )}
      </PanelWorkspace>
      <div className="pw-panel-feed">
        <Disclosure label={<span><Radio size={15} aria-hidden />Crew activity</span>}>
          <Slot name="Crew activity"><ActivityFeed /></Slot>
        </Disclosure>
      </div>
    </div>
  );
}
