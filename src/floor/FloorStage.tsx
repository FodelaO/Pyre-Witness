/** Full-bleed interactive viewport and its fixed drawing controls. */
import { memo, useMemo, type ReactNode } from "react";
import { Crosshair, Expand, Minus, Plus, X } from "lucide-react";
import { areaById, areaCenter, assetById, entryPointById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";
import Blueprint from "./Blueprint";
import { drawingBounds } from "./fit";
import SelectionCard from "./SelectionCard";
import useFloorCamera from "./useFloorCamera";
import useFloorGestures from "./useFloorGestures";
import useFloorPlacement from "./useFloorPlacement";
import ZoneLayer, { ZoneLabels } from "./ZoneLayer";

interface FloorStageProps {
  twin: Twin;
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  schematic: ReactNode;
  children: ReactNode;
  controls: ReactNode;
}

export default memo(function FloorStage({ twin, selectedId, highlighted, schematic, children, controls }: FloorStageProps) {
  const { plant, areas, entryPoints } = twin;
  const viewMode = useTwinStore((state) => state.view);
  const selected = selectedId ? assetById(twin, selectedId) : undefined;
  const selectedArea = areas.find(({ id }) => id === selectedId);
  const area = selected ? areaById(twin, selected.physical.area)?.name : undefined;
  const selectedPoint = useMemo(() => selected?.physical ?? (
    selectedArea ? areaCenter(selectedArea) : entryPointById(twin, selectedId ?? "")
  ), [selected, selectedArea, selectedId, twin]);
  const bounds = useMemo(() => drawingBounds(plant, areas, entryPoints), [plant, areas, entryPoints]);
  const camera = useFloorCamera(plant.canvas, bounds, selected, selectedPoint, selectedId, viewMode);
  const placement = useFloorPlacement();
  const gestures = useFloorGestures(camera, placement);
  const { w, h } = plant.canvas;
  const hint = placement.armed
    ? (placement.notice === "outside" ? "Choose a point inside a marked zone" : "Click a zone to pin a device")
    : placement.notice === "reassess" ? "Device moved. Reassessment failed." : null;

  return (
    <div ref={camera.paneRef} className="pw-plant-floor">
      <div className="pw-floor-caption">
        <span>Simulated plant</span><span aria-hidden="true">:</span> {plant.name}, {plant.line} (fictional)
      </div>
      <div className="pw-floor-zoom" role="group" aria-label="Floor zoom">
        <button type="button" onClick={() => camera.zoomAtCenter(1.3)} aria-label="Zoom in" title="Zoom in"><Plus size={15} /></button>
        <button type="button" onClick={() => camera.zoomAtCenter(1 / 1.3)} aria-label="Zoom out" title="Zoom out"><Minus size={15} /></button>
        <button type="button" onClick={camera.resetFit} aria-label="Fit plant" title="Fit plant"><Expand size={14} /></button>
      </div>
      {hint && (
        <div className="pw-floor-placement-hint">
          {placement.armed && <Crosshair size={14} aria-hidden="true" />}
          <span role="status">{hint}</span>
          <button type="button" onClick={placement.dismiss} title={placement.armed ? "Cancel pin placement" : "Dismiss placement message"}
            aria-label={placement.armed ? "Cancel pin placement" : "Dismiss placement message"}>
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
          <ZoneLayer areas={areas} selectedId={selectedId} highlighted={highlighted} />
          {schematic}
          <ZoneLabels areas={areas} scale={camera.fitPixelsPerUnit} selectedId={selectedId} highlighted={highlighted} />
          {children}
        </g>
      </svg>
      <div ref={camera.tagRef} className="pw-floor-tag-anchor">
        {selected && <SelectionCard asset={selected} area={area ?? selected.physical.area} />}
      </div>
    </div>
  );
});
