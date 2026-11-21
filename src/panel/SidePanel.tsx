/** Results rail for the active analysis, mitigation decisions and selected assets. */
"use client";

import { AudioLines, List, Volume2, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ActivityFeed from "@/crew/ActivityFeed";
import { useRunStore, type RunState } from "@/pipeline/runStore";
import type { CaptureImage } from "@/pipeline/types";
import { useTwinStore } from "@/twin/store";
import { AssetInspector } from "./AssetInspector";
import { AttackPathList } from "./AttackPathList";
import { ComplianceChips } from "./ComplianceChips";
import { DeviceCard } from "./DeviceCard";
import { MitigationQueue } from "./MitigationQueue";
import { NeverPlace } from "./NeverPlace";
import { Disclosure, PanelHeading, PanelSection, TextPreview } from "./PanelParts";
import { PlacementAnswer } from "./PlacementAnswer";
import { RiskDial } from "./RiskDial";
import { RiskList } from "./RiskList";
import { RunProgress } from "./RunProgress";
import "./panel.css";

function productThumbnail(source: string | null | undefined) {
  if (!source) return undefined;
  try {
    const url = new URL(source);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

function runThumbnail(run: RunState & { captureThumbnail?: CaptureImage | null }) {
  const photo = run.captureThumbnail;
  if (photo?.dataBase64 && /^image\/(jpeg|png|webp)$/i.test(photo.mimeType)) {
    return `data:${photo.mimeType};base64,${photo.dataBase64}`;
  }
  return productThumbnail(run.events.findLast((event) => event.type === "link.fetched")?.snapshot.imageUrl);
}

export default function SidePanel() {
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
    <div className="pw-panel pw-scroll" ref={scroll} role="region" aria-label="Plant results" tabIndex={0}>
      <RiskDial action={hasRun && !running && (
        <button className="pw-panel-link pw-panel-run-toggle" type="button" onClick={toggleResults}>
          {focused ? <><X size={13} aria-hidden />Hide results</> : <><List size={13} aria-hidden />Show results</>}
        </button>
      )} />
      <AnimatePresence initial={false}>
        {focused && summary && (
          <PanelSection key="briefing">
            <PanelHeading icon={AudioLines} aside={
              <button type="button" className="pw-panel-icon-button" disabled aria-label="Play Chief briefing" title="Voice unavailable">
                <Volume2 size={15} aria-hidden />
              </button>
            }>Chief briefing</PanelHeading>
            <div className="pw-panel-briefing"><TextPreview text={summary} label="Full briefing" lines={3} /></div>
          </PanelSection>
        )}
        {focused && <PanelSection key="progress"><RunProgress {...{ status, stage, events, gate, error }} /></PanelSection>}
        {focused && profile && <PanelSection key="device"><DeviceCard profile={profile} thumbnail={thumbnail} /></PanelSection>}
        {focused && assessment && (
          <PanelSection key="placement"><PlacementAnswer assessment={assessment} placedAssetId={placedAssetId} pending={pendingPlacement} /></PanelSection>
        )}
        {focused && !!assessment?.never_place.length && <PanelSection key="never"><NeverPlace places={assessment.never_place} /></PanelSection>}
        {focused && !!assessment?.risks.length && <PanelSection key="risks"><RiskList risks={assessment.risks} /></PanelSection>}
        {focused && (!!assessment?.attack_paths.length || checked) && (
          <PanelSection key="paths"><AttackPathList paths={assessment?.attack_paths ?? []} selfCheck={checked} /></PanelSection>
        )}
        {focused && !!assessment?.compliance.length && <PanelSection key="compliance"><ComplianceChips items={assessment.compliance} /></PanelSection>}
        {mitigations.length > 0 && <PanelSection key="mitigations"><MitigationQueue items={mitigations} /></PanelSection>}
        {!focused && <PanelSection key="inspector"><AssetInspector /></PanelSection>}
      </AnimatePresence>
      <div className="pw-panel-feed">
        <Disclosure label={<span><List size={14} aria-hidden />Crew activity</span>}><ActivityFeed /></Disclosure>
      </div>
    </div>
  );
}
