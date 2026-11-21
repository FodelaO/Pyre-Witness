/** Draws the Purdue level bands and keeps their labels visible during horizontal scroll. */
import { PURDUE_LEVELS } from "@/twin/types";
import type { Band } from "./layout";

export function LevelBands({ bands, railWidth }: { bands: Band[]; railWidth: number }) {
  return (
    <>
      <div className="pw-purdue-band-layer" aria-hidden="true">
        {bands.map(({ level, y, h }) => (
          <div className="pw-purdue-band" data-dmz={level === 3.5} key={level} style={{ top: y, height: h }} />
        ))}
      </div>
      <ol className="pw-purdue-rail" style={{ width: railWidth }} aria-label="Purdue levels">
        {PURDUE_LEVELS.map(({ level, name, blurb }, index) => (
          <li key={level} data-dmz={level === 3.5} style={{ height: bands[index].h }} title={blurb}>
            <span className="pw-purdue-level">L{level}</span>
            <span className="pw-purdue-name">{name}</span>
            <span className="pw-purdue-blurb">{blurb}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
