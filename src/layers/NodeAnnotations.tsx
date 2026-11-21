/** Anchors optional software identity and current risk findings to their twin nodes. */
"use client";

import { memo, useMemo } from "react";
import { assetLabel } from "@/floor/assetLabel";
import { useTwinStore } from "@/twin/store";
import type { Area, Twin } from "@/twin/types";
import { useWatchStore } from "@/watch/watchStore";
import { annotationFits, findingBadgeBox, symbolBox, tagBox } from "./annotationGeometry";
import { getDataModel } from "./dataModel";

type Model = ReturnType<typeof getDataModel>;
type Box = { x: number; y: number; w: number; h: number };

function overlap(a: Box, b: Box): number {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w + 3) - Math.max(a.x, b.x - 3)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h + 3) - Math.max(a.y, b.y - 3));
}

function fitChip(symbol: Box, width: number, canvas: Twin["plant"]["canvas"], occupied: readonly Box[]): Box {
  const right = symbol.x + symbol.w;
  const bottom = symbol.y + symbol.h;
  const center = symbol.x + (symbol.w - width) / 2;
  const candidates = [
    [center, symbol.y - 25], [right + 6, symbol.y + 2], [symbol.x - width - 6, symbol.y + 2],
    [center, bottom + 17], [right + 6, bottom - 7], [symbol.x - width - 6, bottom - 7],
  ];
  let best: Box | undefined;
  let bestScore = Infinity;
  for (const [x, y] of candidates) {
    const chip = { x: Math.min(canvas.w - width - 5, Math.max(5, x)), y: Math.min(canvas.h - 25, Math.max(5, y)), w: width, h: 20 };
    const score = occupied.reduce((total, obstacle) => total + overlap(chip, obstacle), 0);
    if (score === 0) return chip;
    if (score < bestScore) {
      best = chip;
      bestScore = score;
    }
  }
  return best ?? { x: center, y: bottom + 17, w: width, h: 20 };
}

export function useNodeAnnotations(model: Model, washdown: Area["bounds"] | undefined, fitScale: number, scale: number) {
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
    const occupied = nodes.map(({ tag }) => tag);
    return nodes.flatMap(({ id, name, symbol, tag, vulnerability }) => {
      if (!vulnerability.count) return [];
      const text = `${vulnerability.count}${vulnerability.worst === null ? "" : ` · S${vulnerability.worst}`}`;
      const w = text.length * 6.4 + 13;
      const preferred = findingBadgeBox(symbol, w);
      const right = Math.max(symbol.x + symbol.w, tag.x + tag.w) + 8;
      const left = Math.min(symbol.x, tag.x) - w - 8;
      const options = [preferred, { ...preferred, x: right }, { ...preferred, x: right, y: symbol.y + 6 },
        { ...preferred, x: left }, { ...preferred, y: symbol.y - 26 },
        { ...preferred, x: symbol.x + (symbol.w - w) / 2, y: symbol.y - 38 }];
      const obstacles = [...occupied, ...nodes.filter((node) => node.id !== id).map((node) => node.symbol)];
      const box = options.find((option) => annotationFits(option, model.canvas, obstacles))
        ?? options.find((option) => annotationFits(option, model.canvas, [tag])) ?? preferred;
      occupied.push(box);
      const label = [
        name, `${vulnerability.count} finding${vulnerability.count === 1 ? "" : "s"}`,
        vulnerability.worst && `Severity ${vulnerability.worst} of 5`,
        ...vulnerability.findings.map(({ ruleId, title }) => `${ruleId} ${title}`),
        ...vulnerability.advisories,
      ].filter(Boolean).join(" · ");
      return [{ id, severity: vulnerability.worst, watch: vulnerability.advisories.length > 0, box, text, label }];
    });
  }, [nodes, model.canvas]);

  const occupied = useMemo(() => [...nodes.flatMap(({ symbol, tag }) => [symbol, tag]), ...badges.map(({ box }) => box)], [nodes, badges]);
  return { nodes, badges, occupied };
}

export default memo(function NodeAnnotations({ canvas, annotations, showAllSoftware, print = 1 }: {
  canvas: Twin["plant"]["canvas"]; annotations: ReturnType<typeof useNodeAnnotations>; showAllSoftware: boolean;
  /** Enlargement of finding badges about their lower-left corner, away from the symbol and its tag. */
  print?: number;
}) {
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const selectedId = useTwinStore((state) => state.selectedId);
  const { nodes, badges, occupied } = annotations;

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
      const box = fitChip(symbol, width, canvas, used);
      used.push(box);
      const title = `${name} · ${details}${software.assumed ? " · assumed (simulated plant)" : ""}`;
      return [{ id, box, label, qualifier, title, symbol }];
    });
  }, [nodes, occupied, hoveredId, selectedId, canvas, showAllSoftware]);

  return (
    <g className="pw-lens-node-meta" pointerEvents="none">
      {chips.map(({ id, box, label, qualifier, title, symbol }) => (
        <g key={id} className="pw-lens-software" role="img" aria-label={title}>
          <title>{title}</title>
          <path className="pw-lens-chip-leader" d={`M${symbol.x + symbol.w / 2} ${symbol.y + symbol.h / 2}L${box.x + box.w / 2} ${box.y + box.h / 2}`} />
          <g transform={`translate(${box.x} ${box.y})`}>
            <rect width={box.w} height={box.h} rx={4} />
            <path d="M6 6h8v8H6z M5 8h1m-1 4h1m8-4h1m-1 4h1 M8 5v1m4-1v1m-4 8v1m4-1v1" className="pw-lens-software-icon" />
            <text x={19} y={13.5}>{label}</text>
            {qualifier && <text x={box.w - 5} y={13.5} textAnchor="end" className="pw-lens-assumed">{qualifier}</text>}
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
    </g>
  );
});
