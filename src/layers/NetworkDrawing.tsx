/** Draws IEC 62443 zones, declared cabling and directional data flow on the floor. */
"use client";

import { memo, useMemo, type CSSProperties } from "react";
import { assetLabel } from "@/floor/assetLabel";
import { isClear, type LabelBox } from "@/floor/labelPlacement";
import { distance, type Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Area, Twin } from "@/twin/types";
import { annotationFits, networkLabelObstacles } from "./annotationGeometry";
import { getDataModel } from "./dataModel";
import { linePath, longestLeg, routeLength } from "./dataDrawing";
import type { ZoneHull } from "./dataTopology";

type LensModel = ReturnType<typeof getDataModel>;
type Flow = LensModel["dataFlows"][number];

const priority: Record<Flow["kind"], number> = {
  cloud: 0, remote: 1, enterprise: 2, historian: 3, supervisory: 4, control: 5, signal: 6,
};

function zoneStyle(name: string): string {
  if (name === "Enterprise" || name === "Internet / Cloud") return "enterprise";
  if (name === "OT DMZ") return "dmz";
  if (name === "Site operations") return "operations";
  return "cell";
}

function zoneLabel({ name, points }: ZoneHull, canvas: Twin["plant"]["canvas"], occupied: readonly LabelBox[], print: number): LabelBox | undefined {
  const top = Math.min(...points.map(({ y }) => y));
  const bottom = Math.max(...points.map(({ y }) => y));
  const left = Math.min(...points.map(({ x }) => x));
  const right = Math.max(...points.map(({ x }) => x));
  const topEdge = points.filter(({ y }) => y <= top + 5).map(({ x }) => x);
  const center = (Math.min(...topEdge) + Math.max(...topEdge)) / 2;
  const w = (name.length * 8 + 8) * print;
  const h = 16 * print;
  const x = [center - w / 2, (left + right - w) / 2, left, right - w];
  const y = [top - h - 6, bottom + 6, top - h - 24, bottom + 24, top + 6, bottom - h - 6];
  const sides = [right + 8, left - w - 8];
  const locations = [
    ...y.flatMap((y) => x.map((x) => ({ x, y, w, h }))),
    ...[top - h - 6, top + 6, (top + bottom - h) / 2, bottom + 6]
      .flatMap((y) => sides.map((x) => ({ x, y, w, h }))),
  ];
  const placed = locations.find((box) => annotationFits(box, canvas, occupied));
  if (placed || zoneStyle(name) === "cell") return placed;

  // Narrow zones can need the first opening just beyond the hull.
  const nearby = { x: left - w, y: top - 3 * h, w: right - left + 2 * w, h: bottom - top + 6 * h };
  const blockers = occupied.filter((box) => !isClear(nearby, [box], 4));
  const columns = [...x, ...sides, ...blockers.flatMap((box) => [box.x - w - 4, box.x + box.w + 4])]
    .filter((x) => x >= nearby.x && x + w <= nearby.x + nearby.w)
    .sort((a, b) => Math.abs(a - x[0]) - Math.abs(b - x[0]));
  const rows = [...y, ...blockers.flatMap((box) => [box.y - h - 4, box.y + box.h + 4])]
    .filter((y) => y >= nearby.y && y + h <= nearby.y + nearby.h)
    .sort((a, b) => Math.abs(a - y[0]) - Math.abs(b - y[0]));
  for (const y of rows) {
    const box = columns.map((x) => ({ x, y, w, h })).find((box) => annotationFits(box, canvas, blockers));
    if (box) return box;
  }
}

function chipPositions(flows: readonly Flow[], gates: readonly Point[], canvas: Twin["plant"]["canvas"], occupied: readonly LabelBox[], print: number, limit = 8) {
  const boxes = [...occupied, ...gates.map(({ x, y }) => ({ x: x - 12, y: y - 12, w: 24, h: 24 }))];
  const protocols = new Set<string>();
  const chips = [];
  for (const flow of [...flows].sort((a, b) => priority[a.kind] - priority[b.kind])) {
    if (chips.length >= limit) break;
    if (protocols.has(flow.protocol)) continue;
    const { start, end, length } = longestLeg(flow.route);
    if (length < 53) continue;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const positionsOnLeg = [0.52, 0.33, 0.71, 0.17, 0.85].map((ratio) => ({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    }));
    const label = flow.protocol.length > 22 ? `${flow.protocol.slice(0, 20)}…` : flow.protocol;
    const width = Math.max(39, label.length * 6.8 + 15);
    const vertical = Math.abs(Math.sin(angle)) > 0.65;
    const candidates = positionsOnLeg.flatMap((anchor) => [-1, 1].map((side) => {
      const w = width * print;
      const x = anchor.x + (vertical ? (w / 2 + 6) * side : 0);
      const y = anchor.y + (vertical ? 0 : (9 * print + 4) * side);
      return { anchor, labelAnchor: { x, y }, box: { x: x - w / 2, y: y - 9 * print, w, h: 17 * print } };
    }));
    const candidate = candidates.find(({ anchor, box }) => annotationFits(box, canvas, boxes)
      && gates.every((gate) => distance(anchor, gate) > 20));
    if (!candidate) continue;
    boxes.push(candidate.box);
    protocols.add(flow.protocol);
    chips.push({ id: flow.id, ...candidate, angle: angle * 180 / Math.PI, label, width });
  }
  return chips;
}

export default memo(function NetworkDrawing({ model, showLabels, combined, rooms, scale, marks, print = 1 }: {
  model: LensModel; showLabels: boolean; combined: boolean; rooms: readonly Area[]; scale: number; marks: readonly LabelBox[];
  /** Enlargement of lettering about its own anchor, see printScale. */
  print?: number;
}) {
  const highlights = useTwinStore((state) => state.highlightIds);
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const selectedId = useTwinStore((state) => state.selectedId);
  const focused = useMemo(() => new Set(highlights), [highlights]);
  const { zones, cables, flows, gates, chips, occupied, labels } = useMemo(() => {
    const occupied = networkLabelObstacles(combined ? rooms : [], scale, marks);
    const zones = model.zoneHulls.filter(({ points }) => points.length >= 3)
      .sort((a, b) => Number(zoneStyle(a.name) === "cell") - Number(zoneStyle(b.name) === "cell")).map((zone) => {
      const label = zoneLabel(zone, model.canvas, occupied, print);
      if (label) occupied.push(label);
      return { ...zone, tier: zoneStyle(zone.name), path: `${linePath(zone.points)} Z`, label };
    });
    const cables = model.networkLinks.map((link) => ({ ...link, path: linePath(link.route) }));
    const flows = model.dataFlows.filter((flow) => flow.route.length >= 2).map((flow) => ({
      ...flow, path: linePath(flow.route), length: routeLength(flow.route),
    })).filter(({ length }) => length > 0);
    const crossings = [...model.networkLinks, ...model.dataFlows].flatMap((line) => line.crossings);
    const gates = [...new Map(crossings.map((gate) => [gate.conduitId, gate])).values()];
    const chips = chipPositions(flows, gates, model.canvas, occupied, print);
    const labels = new Map(model.assets.map((asset) => [asset.id, assetLabel(asset)]));
    return { zones, cables, flows, gates, chips, occupied, labels };
  }, [model, combined, rooms, scale, marks, print]);

  function activeFlow({ from, to }: Flow) {
    return (focused.has(from) && focused.has(to)) || from === hoveredId || to === hoveredId ||
      from === selectedId || to === selectedId;
  }

  const focusId = hoveredId ?? selectedId;
  const focusedZone = hoveredId ? model.assets.find(({ id }) => id === hoveredId)?.network.area : undefined;
  const focusFlows = focusId ? flows.filter(activeFlow) : [];
  const visibleChips = showLabels ? chips : chipPositions(focusFlows, gates, model.canvas, occupied, print, 2);

  return (
    <g className="pw-lens-network" pointerEvents="none" aria-label="Twin network zones, cabling and modeled traffic">
      <g className="pw-lens-zones">
        {zones.filter(({ name }) => showLabels || name === focusedZone).map(({ id, name, path, label, tier }) => (
          <g key={id} data-tier={tier} data-network-zone={name}>
            <title>{name} · IEC 62443 network zone</title>
            <path d={path} className="pw-lens-zone" />
            {label && (
              <g transform={`translate(${label.x + label.w / 2} ${label.y + label.h / 2}) scale(${print})`}>
                <text className="pw-lens-zone-label" y={3.5} textAnchor="middle">{name}</text>
              </g>
            )}
          </g>
        ))}
      </g>
      <g className="pw-lens-cables">
        {cables.map(({ id, from, to, path, label, active }) => (
          <path key={id} d={path} className="pw-lens-cable" data-disabled={!active || undefined}
            data-active={(focused.has(from) && focused.has(to)) || undefined}>
            {label && <title>{label}</title>}
          </path>
        ))}
      </g>
      <g className="pw-lens-traffic">
        {flows.map((flow, index) => {
          const { id, from, to, kind, medium, path, protocol, length } = flow;
          const active = activeFlow(flow);
          const packet = Math.min(18, (6 / length) * 100);
          const gap = Math.max(4, Math.min(100, (154 / length) * 100));
          const animation = {
            "--packet-period": packet + gap,
            "--packet-duration": `${Math.min(5.5, Math.max(1.7, length / 70))}s`,
            "--packet-delay": `${-(index % 11) * 0.31}s`,
          } as CSSProperties;
          return (
            <g key={id} data-kind={kind} data-medium={medium} data-active={active || undefined}>
              <title>{`${labels.get(from) ?? from} → ${labels.get(to) ?? to} · ${protocol}${medium === "external" ? " · schematic external link" : ""}`}</title>
              {(medium !== "network" || active) && <path d={path} className="pw-lens-flow-route" />}
              <path className="pw-lens-packet" d={path} pathLength={100} style={animation}
                strokeDasharray={`${packet} ${gap}`} />
            </g>
          );
        })}
      </g>
      <g className="pw-lens-protocols">
        {chips.map(({ id, anchor, angle }) => (
          <path key={id} className="pw-lens-direction" d="M-4 -3 4 0 -4 3Z"
            transform={`translate(${anchor.x} ${anchor.y}) rotate(${angle})`} />
        ))}
        {visibleChips.map(({ id, labelAnchor, label, width }) => {
          return (
            <g key={id} className="pw-lens-protocol" transform={`translate(${labelAnchor.x} ${labelAnchor.y}) scale(${print})`}>
              <rect x={-width / 2} y={-9} width={width} height={17} rx={3} />
              <title>{label}</title>
              <text textAnchor="middle" y={3}>{label}</text>
            </g>
          );
        })}
      </g>
      <g className="pw-lens-gates">
        {gates.filter(({ conduitId }) => showLabels || focusFlows.some(({ crossings }) => crossings.some((gate) => gate.conduitId === conduitId)))
          .map(({ conduitId, name, enforced, x, y }) => (
          <g key={conduitId} className="pw-lens-gate" data-open={!enforced || undefined} transform={`translate(${x} ${y})`}>
            <title>{name} · {enforced ? "Enforced" : "Unenforced"}</title>
            <circle r={10.5} />
            <path d={enforced ? "M-6 -5V5 M6 -5V5 M-6 0H6" : "M-6 -5V5 M6 -5V5 M-6 0 -1 -5 M6 0 1 5"} />
          </g>
        ))}
      </g>
    </g>
  );
});
