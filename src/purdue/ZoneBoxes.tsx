/** Draws the IEC 62443 zone outlines and selectable labels. */
import type { Zone } from "./layout";

function ZoneOutline({ zone, active }: { zone: Zone; active: boolean }) {
  const { x, y, w, h, head } = zone;
  const right = (head?.w ?? w) - 0.5;
  const bot = h - 0.5;
  const tail = w - 0.5;
  const step = head ? head.bottom - y : bot;
  const r = 7;
  const upper = `M${r} .5 H${right - r} Q${right} .5 ${right} ${r}`;
  const shoulder = head
    ? `V${step - r} Q${right} ${step} ${right - r} ${step} H${tail + r} Q${tail} ${step} ${tail} ${step + r}`
    : "";
  const lower = `V${bot - r} Q${tail} ${bot} ${tail - r} ${bot} H${r} Q.5 ${bot} .5 ${bot - r} V${r} Q.5 .5 ${r} .5 Z`;
  return (
    <svg
      className="pw-purdue-zone-box"
      data-active={active}
      aria-hidden="true"
      width={right + 0.5}
      height={h}
      style={{ left: x, top: y }}
    >
      <path d={`${upper} ${shoulder} ${lower}`} />
    </svg>
  );
}

interface ZoneBoxesProps {
  zones: Zone[];
  active: string | null;
  onSelect: (name: string) => void;
}

export function ZoneBoxes({ zones, active, onSelect }: ZoneBoxesProps) {
  return (
    <>
      {zones.map((zone) => <ZoneOutline key={zone.name} zone={zone} active={zone.name === active} />)}
      {zones.map(({ name, x, y, w, head, lower }) => (
        <button
          key={name}
          type="button"
          className="pw-purdue-zone-label"
          data-lower={lower}
          aria-pressed={name === active}
          title={name}
          onClick={() => onSelect(name)}
          style={{ left: x + 4, top: y + 6, maxWidth: (head?.w ?? w) - 8 }}
        >
          {name}
        </button>
      ))}
    </>
  );
}
