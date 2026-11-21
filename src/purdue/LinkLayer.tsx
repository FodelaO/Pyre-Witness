/** Draws twin connections declared with the network medium. */
import type { PurdueLayout } from "./layout";
import { type NetworkWire, pairKey, wirePath, wirePoints } from "./routing";

interface LinkLayerProps {
  layout: PurdueLayout;
  wires: NetworkWire[];
  gated: ReadonlySet<string>;
  focused: ReadonlySet<string>;
}

export function LinkLayer({ layout, wires, gated, focused }: LinkLayerProps) {
  return (
    <svg className="pw-purdue-links" width={layout.width} height={layout.height} aria-hidden="true">
      {wires.map(({ from, to, active }) => {
        const key = pairKey(from, to);
        if (gated.has(key)) return null;
        const start = layout.anchors.get(from);
        const end = layout.anchors.get(to);
        if (!start || !end) return null;
        const points = wirePoints(start, end);
        if (points.length === 0) return null;
        return (
          <path
            key={key}
            d={wirePath(points)}
            data-active={active}
            data-focused={focused.has(from) || focused.has(to)}
          />
        );
      })}
    </svg>
  );
}
