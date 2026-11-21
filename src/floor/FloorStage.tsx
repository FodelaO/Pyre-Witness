/** Full-bleed interactive viewport and its fixed drawing controls. */
import { memo, useMemo, type ReactNode } from "react";
import { Crosshair, Expand, Minus, Plus, X } from "lucide-react";
import CrewLayer from "@/crew/CrewLayer";
import ConnectorLayer from "@/layers/ConnectorLayer";
import DataLayer from "@/layers/DataLayer";
import { isDigitalEntry } from "@/layers/lensClassification";
import { useLensStore } from "@/layers/lensStore";
import { useLensVars } from "@/layers/useLensVars";
import GhostLayer from "@/modeler/GhostLayer";
import SimLayer from "@/sim/SimLayer";
import { areaById, areaCenter, assetById, entryPointById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Medium, Twin } from "@/twin/types";
import AssetLayer from "./AssetLayer";
import AttackPathLayer from "./AttackPathLayer";
import Blueprint from "./Blueprint";
import DropPin from "./DropPin";
import EntryPoints from "./EntryPoints";
import { drawingBounds } from "./fit";
import PipeLayer from "./PipeLayer";
import SelectionCard from "./SelectionCard";
import useFloorCamera from "./useFloorCamera";
import useFloorGestures from "./useFloorGestures";
import { useFloorNavigation } from "./useFloorNavigation";
import useFloorPlacement from "./useFloorPlacement";
import ZoneLayer, { ZoneLabels } from "./ZoneLayer";

interface FloorStageProps {
  twin: Twin;
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  direct: ReadonlySet<string>;
  focused: ReadonlySet<string>;
  previewModel: boolean;
  materialHidden: ReadonlySet<Medium>;
  controls: ReactNode;
}

export default memo(function FloorStage({ twin, selectedId, highlighted, direct, focused, previewModel, materialHidden, controls }: FloorStageProps) {
  const { plant, areas, assets, entryPoints } = twin;
  const lens = useLensStore((state) => state.mode);
  const lensVars = useLensVars();
  const viewMode = useTwinStore((state) => state.view);
  const selected = selectedId ? assetById(twin, selectedId) : undefined;
  const selectedArea = areas.find(({ id }) => id === selectedId);
  const washdown = areas.find(({ kind, attrs }) => kind === "context" && attrs.washdown)?.bounds;
  const area = selected ? areaById(twin, selected.physical.area)?.name : undefined;
  const selectedPoint = useMemo(() => selected?.physical ?? (
    selectedArea ? areaCenter(selectedArea) : entryPointById(twin, selectedId ?? "")
  ), [selected, selectedArea, selectedId, twin]);
  const bounds = useMemo(() => drawingBounds(plant, areas, entryPoints), [plant, areas, entryPoints]);
  const physicalEntries = useMemo(() => entryPoints.filter((entry) => !isDigitalEntry(entry)), [entryPoints]);
  const camera = useFloorCamera(plant.canvas, bounds, selected, selectedPoint, selectedId, viewMode);
  const lensZoom = camera.lensDetail ? 1.5 : 1;
  const placement = useFloorPlacement();
  const gestures = useFloorGestures(camera, placement);
  useFloorNavigation(camera.svgRef, lens);
  const { w, h } = plant.canvas;
  const hint = placement.armed
    ? (placement.notice === "outside" ? "Choose a point inside a marked zone" : "Click a zone to pin a device")
    : placement.notice === "reassess" ? "Device moved. Reassessment failed." : null;

  return (
    <div ref={camera.paneRef} className="pw-plant-floor" data-view={viewMode} data-lens={lens} data-lens-detail={camera.lensDetail || undefined} style={lensVars}>
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
        aria-label="Interactive plant schematic. Arrow keys navigate. Enter selects."
        {...gestures}
      >
        <g ref={camera.worldRef} className="pw-floor-world">
          <Blueprint plant={plant} />
          <g className="lens-material-only"><ZoneLayer areas={areas} selectedId={selectedId} highlighted={highlighted} /></g>
          <g className="lens-material-only"><PipeLayer assets={assets} hidden={materialHidden} /></g>
          <DataLayer pass="underlay" zoom={lensZoom} fitScale={camera.fitPixelsPerUnit} pixelsPerUnit={camera.pixelsPerUnit} />
          <ConnectorLayer publishInData={viewMode === "split"} />
          <g className="lens-material-only"><EntryPoints points={physicalEntries} selectedId={selectedId} highlighted={highlighted} rightEdge={bounds.x + bounds.w} /></g>
          <AssetLayer assets={assets} selectedId={selectedId} highlighted={highlighted} direct={direct} washdown={washdown}
            instrumentDetail={camera.instrumentDetail} fitScale={camera.fitPixelsPerUnit} pixelsPerUnit={camera.pixelsPerUnit} lens={lens} />
          {previewModel && <GhostLayer />}
          <g className="lens-material-only">
            <ZoneLabels areas={areas} scale={camera.fitPixelsPerUnit} selectedId={selectedId} highlighted={highlighted} />
          </g>
          <g className="lens-data-only"><AttackPathLayer twin={twin} focused={focused} scale={camera.pixelsPerUnit} lens={lens} /></g>
          <DataLayer pass="annotations" zoom={lensZoom} fitScale={camera.fitPixelsPerUnit} pixelsPerUnit={camera.pixelsPerUnit} />
          <SimLayer />
          <CrewLayer />
          <DropPin />
        </g>
      </svg>
      <div ref={camera.tagRef} className="pw-floor-tag-anchor">
        {selected && <SelectionCard asset={selected} area={area ?? selected.physical.area} showMaterial={lens !== "data"} />}
      </div>
    </div>
  );
});
