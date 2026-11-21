/** Compact accessible media filters for the plant piping. */
import { memo } from "react";
import LensLegend from "@/layers/LensLegend";
import { useLensStore } from "@/layers/lensStore";
import { MEDIA, type Medium } from "@/twin/types";

const entries: readonly { label: string; media: readonly Medium[] }[] = [
  { label: MEDIA.water.label, media: ["water"] },
  { label: MEDIA.syrup.label, media: ["syrup"] },
  { label: "Product", media: ["product"] },
  { label: "CO₂", media: ["co2"] },
  { label: "Glycol / NH₃", media: ["glycol", "ammonia"] },
  { label: "CIP", media: ["cip"] },
];

interface LegendProps {
  hidden: ReadonlySet<Medium>;
  onToggle: (media: readonly Medium[]) => void;
}

export default memo(function Legend({ hidden, onToggle }: LegendProps) {
  const showMaterial = useLensStore((state) => state.mode !== "data");
  return (
    <div className="pw-floor-legend">
      <div className="pw-floor-legend-card">
        <LensLegend />
        {showMaterial && <div className="pw-floor-legend-items" role="group" aria-label="Pipe media visibility">
          {entries.map(({ label, media }) => (
            <button key={label} type="button" title={media.map((medium) => MEDIA[medium].label).join(" / ")}
              aria-pressed={!hidden.has(media[0])} onClick={() => onToggle(media)}>
              <svg viewBox="0 0 22 10" width="22" height="10" aria-hidden="true">
                {media.map((medium, index) => (
                  <path
                    key={medium}
                    d={`M${index === 0 ? 2 : 13} 5H${media.length === 1 || index === 1 ? 20 : 10}`}
                    stroke={`var(${MEDIA[medium].cssVar})`}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              {label}
            </button>
          ))}
        </div>}
      </div>
    </div>
  );
});
