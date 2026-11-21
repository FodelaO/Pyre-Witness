/** Draws compact speech beside an avatar and keeps it within the floor canvas. */
import type { Point } from "@/twin/geometry";
import type { Speech } from "./crewStore";

function wrap(text: string, columns: number, maxLines: number): string[] {
  const lines: string[] = [];
  let remaining = text.trim().replace(/\s+/g, " ");
  while (remaining.length > columns && lines.length < maxLines - 1) {
    const space = remaining.lastIndexOf(" ", columns);
    const end = space > 0 ? space : columns;
    lines.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining.length > columns) remaining = `${remaining.slice(0, columns - 1).trimEnd()}…`;
  if (remaining) lines.push(remaining);
  return lines;
}

function briefingLines(text: string): string[] {
  const original = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (original.length < 2) return wrap(text, 54, 3);
  return original.slice(0, 3).flatMap((line) => wrap(line, 54, 1));
}

export default function Bubble({ point, canvas, speech }: {
  point: Point;
  canvas: { w: number; h: number };
  speech: Speech;
}) {
  const briefing = speech.kind === "briefing";
  const patrol = speech.kind === "patrol";
  const fontSize = briefing ? 16 : 13;
  const lineHeight = briefing ? 22 : 17;
  const lines = briefing ? briefingLines(speech.text) : wrap(speech.text, 34, 2);
  if (!lines.length) return null;
  const width = Math.max(patrol ? 128 : 91, ...lines.map((line) => line.length * fontSize * 0.62 + 24));
  const height = lines.length * lineHeight + (patrol ? 27 : 15);
  const x = Math.max(8, Math.min(canvas.w - width - 8, point.x - width / 2));
  const above = point.y >= height + 30;
  const y = above ? point.y - 23 - height : Math.min(point.y + 23, canvas.h - height - 8);
  const edge = above ? y + height : y;
  const tailX = Math.max(x + 13, Math.min(x + width - 13, point.x));
  const tailY = above ? point.y - 17 : point.y + 17;

  return (
    <g className="pw-crew-bubble" data-kind={speech.kind} aria-label={patrol ? `idle patrol, ${speech.text}` : speech.text}>
      <rect x={x} y={y} width={width} height={height} rx={briefing ? 9 : 6} />
      <path d={`M ${tailX - 5} ${edge} L ${point.x} ${tailY} L ${tailX + 5} ${edge}`} />
      {patrol && <text className="pw-crew-patrol-label" x={x + 12} y={y + 15}>idle patrol</text>}
      <text className="pw-crew-bubble-copy" x={x + 12} fontSize={fontSize}>
        {lines.map((line, index) => (
          <tspan key={index} x={x + 12} y={y + (patrol ? 32 : fontSize + 6) + index * lineHeight}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}
