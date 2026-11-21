/** Composes the network underlay and node annotations inside the floor's zoomed SVG group. */
"use client";

import { memo, useMemo } from "react";
import { Antenna, Cloud, Wrench } from "lucide-react";
import type { LabelBox } from "@/floor/labelPlacement";
import { useTwinStore } from "@/twin/store";
import type { EntryPoint, Twin } from "@/twin/types";
import { annotationFits } from "./annotationGeometry";
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

function placeEntryLabels(entries: readonly EntryPoint[], canvas: Twin["plant"]["canvas"], print: number) {
  const occupied = entries.filter(({ kind }) => digitalKind(kind))
    .map(({ x, y }) => ({ x: x - 15, y: y - 15, w: 30, h: 30 }));
  const labels = new Map<string, LabelBox>();
  for (const entry of entries) {
    if (!digitalKind(entry.kind)) continue;
    const w = (entryLabels[entry.kind].length * 7 + 5) * print;
    const h = 16 * print;
    const x = entry.x - w / 2;
    const y = entry.y + 19;
    const candidates = [[x, y], [x - w * 0.32, y], [x + w * 0.32, y], [x, y + h + 4]];
    const box = candidates.map(([x, y]) => ({ x, y, w, h })).find((box) => annotationFits(box, canvas, occupied));
    if (!box) continue;
    labels.set(entry.id, box);
    occupied.push(box);
  }
  return { labels, occupied };
}

const DigitalEntries = memo(function DigitalEntries({ entries, labels, interactive, showLabels, print, onSelect }: {
  entries: readonly EntryPoint[];
  labels: ReadonlyMap<string, LabelBox>;
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
        const label = labels.get(entry.id);
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
            {label && (showLabels || entry.id === hoveredId || entry.id === selectedId) && (
              <g transform={`translate(${label.x + label.w / 2 - entry.x} ${label.y - entry.y}) scale(${print})`}>
                <text y={12} textAnchor="middle">{entryLabels[entry.kind]}</text>
              </g>
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
  pixelsPerUnit?: number;
  pass?: "all" | "underlay" | "annotations";
  /** Standalone activation. The integrated floor delegates by data-floor-target. */
  onEntrySelect?: (id: string) => void;
}

export default memo(function DataLayer({ zoom = 1, fitScale = 0.7, pixelsPerUnit = fitScale * zoom, pass = "all", onEntrySelect }: DataLayerProps) {
  const model = useTwinStore((state) => getDataModel(state.twin));
  const rooms = useTwinStore((state) => state.twin.areas);
  const weight = useLensStore((state) => state.weights.data);
  const mode = useLensStore((state) => state.mode);
  const zoomed = zoom >= 1.5;
  const showLabels = mode === "data" || zoomed;
  const washdown = rooms.find(({ kind, attrs }) => kind === "context" && attrs.washdown)?.bounds;
  const print = printScale(pixelsPerUnit);
  const entries = useMemo(() => placeEntryLabels(model.entryPoints, model.canvas, print), [model.entryPoints, model.canvas, print]);
  const annotations = useNodeAnnotations(model, washdown, fitScale, pixelsPerUnit, print, entries.occupied);
  return (
    <g className="pw-lens-data" style={{ opacity: weight }} data-visible={weight > 0 || undefined}
      aria-hidden={weight === 0 || undefined} pointerEvents="none">
      {pass !== "annotations" && <NetworkDrawing model={model} showLabels={showLabels} combined={mode === "both"} rooms={rooms}
        scale={pixelsPerUnit} marks={annotations.occupied} print={print} />}
      {pass !== "underlay" && <>
        <NodeAnnotations canvas={model.canvas} annotations={annotations} showAllSoftware={zoomed} print={print} />
        <DigitalEntries entries={model.entryPoints} labels={entries.labels}
          interactive={weight > 0.5} showLabels={showLabels} print={print} onSelect={onEntrySelect} />
      </>}
    </g>
  );
});
