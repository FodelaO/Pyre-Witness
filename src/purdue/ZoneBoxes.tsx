/** Draws the IEC 62443 zone outlines and selectable labels. */
import type { Zone } from "./layout";

function ZoneOutline({ zone, active, highlighted }: { zone: Zone; active: boolean; highlighted: boolean }) {
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
      data-highlighted={highlighted}
      data-zone={zone.name}
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
  dense: boolean;
  active: ReadonlySet<string>;
  highlighted: ReadonlySet<string>;
  onSelect: (name: string) => void;
}

export function ZoneBoxes({ zones, dense, active, highlighted, onSelect }: ZoneBoxesProps) {
  return (
    <>
      {zones.map((zone) => <ZoneOutline key={zone.name} zone={zone} active={active.has(zone.name)} highlighted={highlighted.has(zone.name)} />)}
      {zones.map(({ name, x, y, w, head, lower }) => (
        <button
          key={name}
          type="button"
          className="pw-purdue-zone-label"
          data-lower={lower}
          data-highlighted={highlighted.has(name)}
          aria-pressed={active.has(name)}
          aria-label={name}
          title={name}
          onClick={() => onSelect(name)}
          style={{ left: x + 4, top: y + (dense ? 11 : 6), maxWidth: (head?.w ?? w) - 8 }}
        >
          {dense && lower && (head?.w ?? w) < 70 ? name.replace(/^Cell /, "").replace(/^Utilities$/, "Util.") : name}
        </button>
      ))}
    </>
  );
}
