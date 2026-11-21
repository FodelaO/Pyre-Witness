/** Anchors optional software identity and current risk findings to their twin nodes. */
"use client";

import { memo, useMemo } from "react";
import { useFlagStore } from "@/escalation/flagStore";
import { assetLabel } from "@/floor/assetLabel";
import type { LabelBox } from "@/floor/labelPlacement";
import { useTwinStore } from "@/twin/store";
import type { Area, Twin } from "@/twin/types";
import { useWatchStore } from "@/watch/watchStore";
import { annotationFits, findingBadgeBox, symbolBox, tagBox } from "./annotationGeometry";
import { getDataModel } from "./dataModel";

type Model = ReturnType<typeof getDataModel>;

function fitChip(symbol: LabelBox, w: number, h: number, canvas: Twin["plant"]["canvas"], occupied: readonly LabelBox[]) {
  const right = symbol.x + symbol.w;
  const bottom = symbol.y + symbol.h;
  const center = symbol.x + (symbol.w - w) / 2;
  const candidates = [
    [center, symbol.y - h - 5], [right + 6, symbol.y + 2], [symbol.x - w - 6, symbol.y + 2],
    [center, bottom + 17], [right + 6, bottom - 7], [symbol.x - w - 6, bottom - 7],
  ];
  return candidates.map(([x, y]) => ({
    x: Math.min(canvas.w - w - 6, Math.max(6, x)),
    y: Math.min(canvas.h - h - 6, Math.max(6, y)), w, h,
  })).find((box) => annotationFits(box, canvas, occupied));
}

export function useNodeAnnotations(model: Model, washdown: Area["bounds"] | undefined, fitScale: number,
  scale: number, print: number, entries: readonly LabelBox[]) {
  const findings = useTwinStore((state) => state.risk.findings);
  const localReport = useWatchStore((state) => state.local.status === "finished" ? state.local.report : undefined);
  const managedReport = useWatchStore((state) => state.managed.status === "finished" ? state.managed.report : undefined);
  const nodes = useMemo(() => {
    const reports = [localReport, managedReport];
    return model.assets.map((asset) => {
      const symbol = symbolBox(asset);
      return {
        id: asset.id, name: assetLabel(asset), symbol, tag: tagBox(asset, symbol, washdown, fitScale, scale),
        software: model.softwareOf(asset.id),
        vulnerability: model.vulnerabilityOf(asset.id, findings, reports),
      };
    });
  }, [model, findings, localReport, managedReport, washdown, fitScale, scale]);

  const badges = useMemo(() => {
    const occupied = [...entries, ...nodes.map(({ tag }) => tag)];
    const findingsByPriority = nodes.filter(({ vulnerability }) => vulnerability.count > 0)
      .sort((a, b) => (b.vulnerability.worst ?? 0) - (a.vulnerability.worst ?? 0));
    return findingsByPriority.flatMap(({ id, name, symbol, tag, vulnerability }) => {
      const watch = vulnerability.advisories.length > 0;
      const text = `${vulnerability.count}${vulnerability.worst === null ? "" : ` · S${vulnerability.worst}`}`;
      const w = text.length * 6.4 + 13;
      const preferred = findingBadgeBox(symbol, w);
      const right = Math.max(symbol.x + symbol.w, tag.x + tag.w) + 8;
      const left = Math.min(symbol.x, tag.x) - w * print - 8;
      const center = symbol.x + (symbol.w - w * print) / 2;
      const above = Math.min(tag.y, symbol.y) - preferred.h - 8;
      const below = Math.max(tag.y + tag.h, symbol.y + symbol.h) + preferred.h * (print - 1) + 8;
      const options = [preferred, ...[preferred.y, above, below, above - preferred.h * print]
        .flatMap((y) => [right, left, center].map((x) => ({ ...preferred, x, y })))];
      const painted = ({ x, y, w, h }: LabelBox): LabelBox => ({
        x: x - print, y: y + h - (h + (watch ? 3 : 1)) * print,
        w: (w + (watch ? 5 : 2)) * print, h: (h + (watch ? 4 : 2)) * print,
      });
      const obstacles = [...occupied, ...nodes.filter((node) => node.id !== id).map((node) => node.symbol)];
      // Lower-severity badges give way in a crowded small pane; a severity 5 finding is never hidden.
      const box = options.find((option) => annotationFits(painted(option), model.canvas, obstacles))
        ?? options.find((option) => annotationFits(painted(option), model.canvas, occupied))
        ?? (vulnerability.worst === 5 ? preferred : undefined);
      if (!box) return [];
      const footprint = painted(box);
      occupied.push(footprint);
      const label = [
        name, `${vulnerability.count} finding${vulnerability.count === 1 ? "" : "s"}`,
        vulnerability.worst && `Severity ${vulnerability.worst} of 5`,
        ...vulnerability.findings.map(({ ruleId, title }) => `${ruleId} ${title}`),
        ...vulnerability.advisories,
      ].filter(Boolean).join(" · ");
      return [{ id, severity: vulnerability.worst, watch, box, footprint, text, label }];
    });
  }, [nodes, model.canvas, print, entries]);

  const occupied = useMemo(() => [
    ...entries, ...nodes.flatMap(({ symbol, tag }) => [symbol, tag]), ...badges.map(({ footprint }) => footprint),
  ], [nodes, badges, entries]);
  return { nodes, badges, occupied };
}

export default memo(function NodeAnnotations({ canvas, annotations, showAllSoftware, print = 1 }: {
  canvas: Twin["plant"]["canvas"]; annotations: ReturnType<typeof useNodeAnnotations>; showAllSoftware: boolean;
  print?: number;
}) {
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const selectedId = useTwinStore((state) => state.selectedId);
  const { nodes, badges, occupied } = annotations;
  const flags = useFlagStore((state) => state.flags);

  const chips = useMemo(() => {
    const focus = (id: string) => id === hoveredId || id === selectedId;
    const visible = nodes.filter(({ id, software }) => software && (showAllSoftware || focus(id)));
    visible.sort((a, b) => Number(focus(b.id)) - Number(focus(a.id)));
    const used = [...occupied];
    return visible.flatMap(({ id, name, symbol, software }) => {
      if (!software) return [];
      const details = [software.vendor, software.product, software.version, software.os].filter(Boolean).join(" · ");
      if (!details) return [];
      const short = [software.product ?? software.vendor ?? software.os, software.version].filter(Boolean).join(" ");
      const label = short.length > 30 ? `${short.slice(0, 28)}…` : short;
      const qualifier = software.assumed ? "ASSUMED" : "";
      const width = (label.length + qualifier.length + 2) * 6.5 + 18;
      const box = fitChip(symbol, width * print, 20 * print, canvas, used);
      if (!box) return [];
      used.push(box);
      const title = `${name} · ${details}${software.assumed ? " · assumed (simulated plant)" : ""}`;
      return [{ id, box, width, label, qualifier, title, symbol }];
    });
  }, [nodes, occupied, hoveredId, selectedId, canvas, showAllSoftware, print]);

  return (
    <g className="pw-lens-node-meta" pointerEvents="none">
      {chips.map(({ id, box, width, label, qualifier, title, symbol }) => (
        <g key={id} className="pw-lens-software" role="img" aria-label={title}>
          <title>{title}</title>
          <path className="pw-lens-chip-leader" d={`M${symbol.x + symbol.w / 2} ${symbol.y + symbol.h / 2}L${box.x + box.w / 2} ${box.y + box.h / 2}`} />
          <g transform={`translate(${box.x} ${box.y}) scale(${print})`}>
            <rect width={width} height={20} rx={4} />
            <path d="M6 6h8v8H6z M5 8h1m-1 4h1m8-4h1m-1 4h1 M8 5v1m4-1v1m-4 8v1m4-1v1" className="pw-lens-software-icon" />
            <text x={19} y={13.5}>{label}</text>
            {qualifier && <text x={width - 5} y={13.5} textAnchor="end" className="pw-lens-assumed">{qualifier}</text>}
          </g>
        </g>
      ))}
      {badges.map(({ id, box, severity, watch, text, label }) => (
        <g key={id} className="pw-lens-vuln" role="img" aria-label={label} data-severity={severity ?? "advisory"}
          transform={`translate(${box.x} ${box.y + box.h}) scale(${print}) translate(0 ${-box.h})`}>
          <title>{label}</title>
          <rect width={box.w} height={box.h} rx={5} />
          <text x={box.w / 2} y={12.5} textAnchor="middle">{text}</text>
          {watch && <circle cx={box.w} cy={1} r={3.25} />}
        </g>
      ))}
      {flags.map(({ assetId, reason }) => {
        const node = nodes.find(({ id }) => id === assetId);
        if (!node) return null;
        const { symbol } = node;
        return <g key={assetId} className="pw-lens-escalation-flag" role="img" aria-label={reason}
          transform={`translate(${symbol.x + symbol.w} ${symbol.y}) scale(${print})`}>
          <title>{reason}</title>
          <circle r={8} />
          <text textAnchor="middle" y={4}>!</text>
        </g>;
      })}
    </g>
  );
});
