/** Full-bleed interactive viewport and its fixed drawing controls. */
import { memo, type ReactNode } from "react";
import { Crosshair, Expand, Minus, Plus, X } from "lucide-react";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";
import Blueprint from "./Blueprint";
import { FIT, zoomBetween } from "./camera";
import SelectionCard from "./SelectionCard";
import useFloorCamera from "./useFloorCamera";
import useFloorGestures from "./useFloorGestures";
import useFloorPlacement from "./useFloorPlacement";

interface FloorStageProps {
  plant: Twin["plant"];
  children: ReactNode;
  controls: ReactNode;
}

export default memo(function FloorStage({ plant, children, controls }: FloorStageProps) {
  const selected = useTwinStore((state) => state.selectedId ? assetById(state.twin, state.selectedId) : undefined);
  const area = useTwinStore((state) => selected ? areaById(state.twin, selected.physical.area)?.name : undefined);
  const camera = useFloorCamera(plant.canvas, selected);
  const placement = useFloorPlacement();
  const gestures = useFloorGestures(camera, placement);
  const { w, h } = plant.canvas;
  const hint = placement.armed
    ? (placement.notice === "outside" ? "Choose a point inside a marked zone" : "Click a zone to pin a device")
    : placement.notice === "reassess" ? "Device moved. Reassessment failed." : null;

  function zoomBy(factor: number) {
    const center = { x: w / 2, y: h / 2 };
    camera.setCamera(zoomBetween(camera.pose.current, center, center, factor), true);
  }

  return (
    <div className="pw-plant-floor">
      <div className="pw-floor-caption">
        <span>Simulated plant</span><span aria-hidden="true">:</span> {plant.name}, {plant.line} (fictional)
      </div>
      <div className="pw-floor-zoom" role="group" aria-label="Floor zoom">
        <button type="button" onClick={() => zoomBy(1.3)} aria-label="Zoom in" title="Zoom in"><Plus size={15} /></button>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out" title="Zoom out"><Minus size={15} /></button>
        <button type="button" onClick={() => camera.setCamera(FIT, true)} aria-label="Fit plant" title="Fit plant"><Expand size={14} /></button>
      </div>
      {hint && (
        <div className="pw-floor-placement-hint">
          {placement.armed && <Crosshair size={14} aria-hidden="true" />}
          <span role="status">{hint}</span>
          <button type="button" onClick={placement.dismiss} aria-label={placement.armed ? "Cancel pin placement" : "Dismiss"}>
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}
      {controls}
      <svg
        ref={camera.svgRef}
        className="pw-floor-svg"
        data-armed={placement.armed || undefined}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Interactive plant schematic"
        {...gestures}
      >
        <g ref={camera.worldRef} className="pw-floor-world">
          <Blueprint plant={plant} />
          {children}
        </g>
      </svg>
      <div ref={camera.tagRef} className="pw-floor-tag-anchor">
        {selected && <SelectionCard asset={selected} area={area ?? selected.physical.area} />}
      </div>
    </div>
  );
});
