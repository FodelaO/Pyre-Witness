/** Composes the network underlay and node annotations inside the floor's zoomed SVG group. */
"use client";

import { memo } from "react";
import { Antenna, Cloud, Wrench } from "lucide-react";
import { useTwinStore } from "@/twin/store";
import type { EntryPoint } from "@/twin/types";
import { getDataModel } from "./dataModel";
import NetworkDrawing from "./NetworkDrawing";
import NodeAnnotations, { useNodeAnnotations } from "./NodeAnnotations";
import { useLensStore } from "./lensStore";
import { printScale } from "./printScale";

const entryIcons = { internet: Cloud, remote: Wrench, rf: Antenna };
const entryLabels = { internet: "Internet", remote: "Vendor remote", rf: "Nearby RF" };

type DigitalKind = keyof typeof entryIcons;

function digitalKind(kind: EntryPoint["kind"]): kind is DigitalKind {
  return kind === "internet" || kind === "remote" || kind === "rf";
}

const DigitalEntries = memo(function DigitalEntries({ entries, interactive, showLabels, print, onSelect }: {
  entries: readonly EntryPoint[];
  interactive: boolean;
  showLabels: boolean;
  print: number;
  onSelect?: (id: string) => void;
}) {
  const selectedId = useTwinStore((state) => state.selectedId);
  const hoveredId = useTwinStore((state) => state.hoveredId);
  return (
    <g className="pw-lens-digital-entries" aria-label="Digital entry points">
      {entries.map((entry) => {
        if (!digitalKind(entry.kind)) return null;
        const Icon = entryIcons[entry.kind];
        return (
          <g key={entry.id} className="pw-lens-digital-entry" transform={`translate(${entry.x} ${entry.y})`}
            data-floor-target={entry.id} data-interactive={interactive || undefined} role="button"
            aria-pressed={entry.id === selectedId} aria-label={entry.name} tabIndex={interactive ? 0 : undefined}
            onClick={onSelect ? () => onSelect(entry.id) : undefined}
            onKeyDown={onSelect ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onSelect(entry.id);
            } : undefined}>
            <title>{entry.name}</title>
            <circle r={14} />
            <Icon x={-8} y={-8} width={16} height={16} strokeWidth={1.7} aria-hidden="true" />
            {(showLabels || entry.id === hoveredId || entry.id === selectedId) && (
              <g transform={`translate(0 16) scale(${print})`}><text y={12} textAnchor="middle">{entryLabels[entry.kind]}</text></g>
            )}
          </g>
        );
      })}
    </g>
  );
});

interface DataLayerProps {
  /** Magnification relative to the fitted view. */
  zoom?: number;
  fitScale?: number;
  pass?: "all" | "underlay" | "annotations";
  /** Standalone activation. The integrated floor delegates by data-floor-target. */
  onEntrySelect?: (id: string) => void;
}

export default memo(function DataLayer({ zoom = 1, fitScale = 0.7, pass = "all", onEntrySelect }: DataLayerProps) {
  const model = useTwinStore((state) => getDataModel(state.twin));
  const rooms = useTwinStore((state) => state.twin.areas);
  const weight = useLensStore((state) => state.weights.data);
  const mode = useLensStore((state) => state.mode);
  const zoomed = zoom >= 1.5;
  const showLabels = mode === "data" || zoomed;
  const washdown = rooms.find(({ kind, attrs }) => kind === "context" && attrs.washdown)?.bounds;
  const annotations = useNodeAnnotations(model, washdown, fitScale, fitScale * zoom);
  const print = printScale(fitScale * zoom);
  return (
    <g className="pw-lens-data" style={{ opacity: weight }} data-visible={weight > 0 || undefined}
      aria-hidden={weight === 0 || undefined} pointerEvents="none">
      {pass !== "annotations" && <NetworkDrawing model={model} showLabels={showLabels} combined={mode === "both"} rooms={rooms}
        scale={fitScale * zoom} marks={annotations.occupied} print={print} />}
      {pass !== "underlay" && <>
        <NodeAnnotations canvas={model.canvas} annotations={annotations} showAllSoftware={zoomed} print={print} />
        <DigitalEntries entries={model.entryPoints} interactive={weight > 0.5} showLabels={showLabels} print={print} onSelect={onEntrySelect} />
      </>}
    </g>
  );
});
