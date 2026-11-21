/** Mounts the on-demand fit comparison for the current analysis in the results panel. */
"use client";

import { Info, PanelsTopLeft } from "lucide-react";
import { useId, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRunStore } from "@/pipeline/runStore";
import { assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { FitTile } from "./FitTile";
import { fitOptions } from "./placements";
import "./fit.css";

export default function FitPreview() {
  const { status, runId, profile, assessment, selfCheck, placedAssetId, image } = useRunStore(useShallow((run) => ({
    status: run.status,
    runId: run.runId,
    profile: run.profile,
    assessment: run.assessment,
    selfCheck: run.selfCheck,
    placedAssetId: run.placedAssetId,
    image: run.captureThumbnail ?? undefined,
  })));
  const { twin, risk } = useTwinStore(useShallow((state) => ({ twin: state.twin, risk: state.risk })));
  const heading = useId();
  const tooltip = useId();
  const options = useMemo(() => {
    if (!profile || !assessment) return [];
    const placed = placedAssetId ? assetById(twin, placedAssetId) : undefined;
    return fitOptions(twin, placed, assessment, risk, selfCheck);
  }, [profile, assessment, placedAssetId, twin, risk, selfCheck]);

  if (!profile || !options.length) return null;
  return (
    <section className="pw-fit" aria-labelledby={heading}>
      <header className="pw-fit-heading">
        <h2 id={heading}><PanelsTopLeft size={14} aria-hidden />Fit preview</h2>
        <span className="pw-fit-help" tabIndex={0} aria-label="About fit preview" aria-describedby={tooltip}>
          <Info size={15} aria-hidden />
          <span id={tooltip} role="tooltip">
            These illustrations use {image ? "the capture photo" : "the observed device profile"} as a reference.
            Placement decisions come from the reasoning model and the rules engine.
          </span>
        </span>
      </header>
      <div className="pw-fit-tiles">
        {options.map(({ variant, placement, scene, findings }) => (
          <FitTile
            key={JSON.stringify([runId, variant, placement, scene, Boolean(image)])}
            request={{ profile, image, variant, placement, scene }}
            areaName={scene.areaName}
            findings={findings}
            pendingAnalysis={status === "running"}
          />
        ))}
      </div>
    </section>
  );
}
