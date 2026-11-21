/** Pinned risk, assessment and watch readouts for the plant. */
"use client";

import { AudioLines, Crosshair, List, Radio } from "lucide-react";
import { lazy, useEffect, useRef, useState } from "react";
import { useRunStore, type RunState } from "@/pipeline/runStore";
import { Slot } from "@/shell/Slot";
import { useTwinStore } from "@/twin/store";
import { AssetInspector } from "./AssetInspector";
import { AttackPathList } from "./AttackPathList";
import { ComplianceChips } from "./ComplianceChips";
import { DeviceCard } from "./DeviceCard";
import { MitigationQueue } from "./MitigationQueue";
import { NeverPlace } from "./NeverPlace";
import { Disclosure, PanelHeading, PanelSection, TextPreview } from "./PanelParts";
import { PanelWorkspace } from "./PanelWorkspace";
import { PlacementAnswer } from "./PlacementAnswer";
import { RiskDial } from "./RiskDial";
import { RiskList } from "./RiskList";
import { RunError, RunProgress } from "./RunProgress";
import { SimulationComparison } from "./SimulationComparison";
import "./panel.css";

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
  watchOpen: boolean;
  onWatchOpen: (open: boolean) => void;
};

export default function SidePanel({ captureOpen, setCaptureEditor, watchOpen, onWatchOpen }: Props) {
  const run = useRunStore();
  const { runId, status, stage, events, gate, error, summary, profile, assessment, selfCheck, placedAssetId } = run;
  const mitigations = useTwinStore((state) => state.mitigations);
  const [dismissedRun, setDismissedRun] = useState<string | null | undefined>(undefined);
  const scroll = useRef<HTMLDivElement>(null);
  const running = status === "running";
  const hasRun = status !== "idle";
  const focused = hasRun && (running || dismissedRun !== runId);
  const thumbnail = focused && profile ? runThumbnail(run) : undefined;
  const checkingRevision = events.findLastIndex((event) => event.type === "revision.done")
    > events.findLastIndex((event) => event.type === "selfcheck.done");
  const checked = checkingRevision ? null : selfCheck;
  const pendingPlacement = running || (status === "error" && (!checked || (!checked.revised && checked.disagreements.length > 0)));

  useEffect(() => { if (runId) scroll.current?.scrollTo({ top: 0 }); }, [runId]);

  function toggleResults() {
    setDismissedRun(focused ? runId : undefined);
    scroll.current?.scrollTo({ top: 0 });
  }

  return (
    <div className="pw-panel" role="region" aria-label="Plant results">
      <RiskDial action={hasRun && !running && !captureOpen && (
        <button className="pw-panel-link pw-panel-run-toggle" type="button" onClick={toggleResults}>
          {focused ? <><Crosshair size={14} aria-hidden />Inspect</> : <><List size={14} aria-hidden />Results</>}
        </button>
      )} />
      <PanelWorkspace captureOpen={captureOpen} setCaptureEditor={setCaptureEditor} readoutsRef={scroll}>
        {focused ? (
          <>
            {summary && (
              <PanelSection>
                <PanelHeading icon={AudioLines} aside={
                  <span className="pw-panel-voice">
                    <Slot name="Chief briefing audio" quiet><SpeakButton text={summary} /></Slot>
                  </span>
                }>Chief briefing</PanelHeading>
                <div className="pw-panel-briefing"><TextPreview text={summary} label="Full briefing" lines={3} /></div>
              </PanelSection>
            )}
            {error && <PanelSection><RunError message={error.message} /></PanelSection>}
            {profile && <PanelSection><DeviceCard profile={profile} thumbnail={thumbnail} /></PanelSection>}
            {assessment && (
              <>
                <PanelSection><PlacementAnswer assessment={assessment} placedAssetId={placedAssetId} pending={pendingPlacement} /></PanelSection>
                <PanelSection><NeverPlace places={assessment.never_place} /></PanelSection>
                <PanelSection><RiskList risks={assessment.risks} />
                  {assessment.compliance.length > 0 && (
                    <Disclosure label="Compliance references"><ComplianceChips items={assessment.compliance} /></Disclosure>
                  )}
                </PanelSection>
                <PanelSection><AttackPathList paths={assessment.attack_paths} selfCheck={checked} /></PanelSection>
              </>
            )}
            {!profile && (running || gate) && (
              <PanelSection><RunProgress {...{ status, stage, events, gate, error }} /></PanelSection>
            )}
          </>
        ) : <PanelSection><AssetInspector /></PanelSection>}
        {mitigations.length > 0 && <PanelSection><MitigationQueue items={mitigations} /></PanelSection>}
        <SimulationComparison />
        {focused && profile && assessment && <Slot name="Fit preview" quiet><FitPreview /></Slot>}
        {focused && profile && (
          <PanelSection><Disclosure label="Analysis details"><RunProgress {...{ status, stage, events, gate, error }} /></Disclosure></PanelSection>
        )}
        <Slot name="Threat watch" quiet><WatchPanel open={watchOpen} onOpenChange={onWatchOpen} /></Slot>
      </PanelWorkspace>
      <div className="pw-panel-feed">
        <Disclosure label={<span><Radio size={15} aria-hidden />Crew activity</span>}>
          <Slot name="Crew activity"><ActivityFeed /></Slot>
        </Disclosure>
      </div>
    </div>
  );
}
