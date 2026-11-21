/** Fits fixed-screen-size room names, markings and operating chips into floor geometry. */
import { Droplet, LockKeyhole, TriangleAlert } from "lucide-react";
import type { Area } from "@/twin/types";
import { chooseLabelBox, isClear, type LabelBox } from "./labelPlacement";

const statusLabels = { normal: "Normal", attention: "Attention", alarm: "Alarm" } as const;
const shortNames: Partial<Record<Area["id"], string>> = {
  washdown: "Washdown",
  nh3_hazard: "NH3",
  parking_lot: "Parking lot",
  crew_office: "Crew office",
};
const compactNames: Partial<Record<Area["id"], string>> = {
  blending: "Blending",
  control_room: "Control",
};
const CHAR_WIDTH = 6.25;
const ROW_HEIGHT = 12;
const CHIP_HEIGHT = 13;

function wrapName(name: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of name.split(" ")) {
    const combined = [lines.at(-1), word].filter(Boolean).join(" ");
    if (lines.length && combined.length * CHAR_WIDTH <= width) lines[lines.length - 1] = combined;
    else lines.push(word);
  }
  return lines;
}

interface ZoneLabelProps {
  area: Area;
  obstacles: LabelBox[];
  scale: number;
  selected: boolean;
  highlighted: boolean;
}

export default function ZoneLabel({ area, obstacles, scale, selected, highlighted }: ZoneLabelProps) {
  const { bounds, attrs } = area;
  const ammonia = attrs.hazard === "NH3";
  const overlay = area.kind === "context" && (ammonia || attrs.washdown);
  const Marker = attrs.washdown && overlay ? Droplet : attrs.hazard && !ammonia ? TriangleAlert : attrs.restricted ? LockKeyhole : null;
  const markWidth = Marker ? 13 : 0;
  const pad = 6 / scale;
  const left = bounds.x + pad;
  const right = bounds.x + bounds.w - pad;
  const top = bounds.y + (overlay ? 2 : -2) / scale;
  const nameWidthLimit = Math.max(14, (right - left) * scale - markWidth);
  const fullName = shortNames[area.id] ?? area.name;
  const nameText = fullName.length * CHAR_WIDTH <= nameWidthLimit ? fullName : compactNames[area.id] ?? fullName;
  const lines = wrapName(nameText, nameWidthLimit);
  const nameHeight = lines.length * ROW_HEIGHT + 1;
  const nameWidth = Math.min(nameWidthLimit, Math.max(...lines.map((line) => line.length * CHAR_WIDTH))) + markWidth + (ammonia ? 8 : 0);
  const bottom = bounds.y + bounds.h - pad - nameHeight / scale;
  const nameAt = (x: number, y: number): LabelBox => ({ x, y, w: nameWidth / scale, h: nameHeight / scale });
  const near = overlay ? bottom : top;
  const far = overlay ? top : bottom;
  const name = chooseLabelBox(nameAt(left, near), [
    nameAt(right - nameWidth / scale, near),
    ...(overlay ? [] : [nameAt(left, top - 5 / scale), nameAt(right - nameWidth / scale, top - 5 / scale)]),
    nameAt(left, far),
    nameAt(right - nameWidth / scale, far),
  ], obstacles);

  const note = area.statusNote ?? statusLabels[area.status];
  const abnormal = area.status !== "normal";
  // A chip earns its ink: an abnormal state, or an operating note. A bare "Normal" is noise.
  const informative = abnormal || Boolean(area.statusNote);
  const naturalWidth = note.length * 5.4 + 16;
  const chipWidth = Math.max(20, Math.min(naturalWidth, (right - left) * scale));
  const chipAt = (x: number, y: number, width = chipWidth): LabelBox => ({
    x, y, w: width / scale, h: CHIP_HEIGHT / scale,
  });
  const sideX = name.x + name.w + 5 / scale;
  const sideWidth = Math.min(chipWidth, (right - sideX) * scale);
  const besideName = sideWidth >= chipWidth * 0.8 ? [chipAt(sideX, name.y, sideWidth)] : [];
  const cornerX = right - chipWidth / scale;
  const chipOptions = [
    ...besideName,
    chipAt(Math.min(name.x, cornerX), name.y + name.h + 2 / scale),
    // The far corner only when it clears the room name; a chip never sits on the title.
    ...(cornerX >= sideX ? [chipAt(cornerX, top)] : []),
    // Mid-room and floor positions cross pipes and entry labels: only an abnormal state may take them.
    ...(abnormal ? [
      chipAt(left, bounds.y + bounds.h / 2),
      chipAt(cornerX, bounds.y + bounds.h / 2),
      chipAt(left, bounds.y + bounds.h - pad - CHIP_HEIGHT / scale),
    ] : []),
  ].filter((box) => box.y + box.h <= bounds.y + bounds.h - pad + 0.01);
  const chipBlockers = [name, ...obstacles];
  const clearChip = chipOptions.find((box) => isClear(box, chipBlockers));
  const chip = !informative || !chipOptions.length || (overlay && !abnormal) ? undefined
    : clearChip ?? (abnormal ? chooseLabelBox(chipOptions[0], chipOptions.slice(1), chipBlockers) : undefined);
  const renderedChipWidth = chip ? chip.w * scale : 0;

  return (
    <g
      className="pw-floor-zone-label"
      data-floor-target={area.id}
      data-highlighted={highlighted || undefined}
      role="button"
      tabIndex={0}
      aria-label={`${area.name} · ${note}`}
      aria-pressed={selected}
    >
      <title>{area.name} · {note}</title>
      <g transform={`translate(${name.x} ${name.y})`}>
        <g className="pw-floor-screen-label">
          <rect className="pw-floor-zone-label-back" x={-3} y={-1} width={nameWidth + 6} height={nameHeight + 2} rx={2} />
          {Marker && <Marker width={10} height={10} y={0.5} strokeWidth={1.6} className="pw-floor-zone-mark" />}
          {ammonia && <rect className="pw-floor-ammonia-mark" x={markWidth} y={-1} width={nameWidth - markWidth} height={nameHeight + 2} rx={3} />}
          {lines.map((line, index) => (
            <text
              key={index}
              x={markWidth + (ammonia ? 4 : 0)}
              y={9 + index * ROW_HEIGHT}
              textLength={line.length * CHAR_WIDTH > nameWidthLimit ? nameWidthLimit : undefined}
              lengthAdjust="spacingAndGlyphs"
              className="pw-floor-zone-name"
              data-ammonia={ammonia || undefined}
            >
              {line}
            </text>
          ))}
        </g>
      </g>
      {chip && (
        <g transform={`translate(${chip.x} ${chip.y})`} className="pw-floor-zone-chip" data-status={area.status}>
          <g className="pw-floor-screen-label">
            <rect width={renderedChipWidth} height={CHIP_HEIGHT} rx={3} />
            <circle cx={6} cy={6.5} r={1.45} />
            <text x={11} y={9.6} textLength={naturalWidth > renderedChipWidth + 0.01 ? renderedChipWidth - 15 : undefined} lengthAdjust="spacingAndGlyphs">
              {note}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
