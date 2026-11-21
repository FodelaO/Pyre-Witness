/** Compact accessible media filters for the plant piping. */
import { memo } from "react";
import { MEDIA, type Medium } from "@/twin/types";

const entries: readonly { label: string; media: readonly Medium[] }[] = [
  { label: MEDIA.water.label, media: ["water"] },
  { label: MEDIA.syrup.label, media: ["syrup"] },
  { label: MEDIA.product.label, media: ["product"] },
  { label: MEDIA.co2.label, media: ["co2"] },
  { label: "Glycol / NH3", media: ["glycol", "ammonia"] },
  { label: MEDIA.cip.label, media: ["cip"] },
  { label: MEDIA.network.label, media: ["network"] },
];

interface LegendProps {
  hidden: ReadonlySet<Medium>;
  onToggle: (media: readonly Medium[]) => void;
}

export default memo(function Legend({ hidden, onToggle }: LegendProps) {
  return (
    <div className="pw-floor-legend" role="group" aria-label="Pipe and cable visibility">
      <div className="pw-floor-legend-heading">Media</div>
      <div className="pw-floor-legend-items">
        {entries.map(({ label, media }) => (
          <button key={label} type="button" aria-pressed={!hidden.has(media[0])} onClick={() => onToggle(media)}>
            <svg viewBox="0 0 22 10" width="22" height="10" aria-hidden="true">
              {media.map((medium, index) => (
                <path
                  key={medium}
                  d={`M${index === 0 ? 2 : 13} 5H${media.length === 1 || index === 1 ? 20 : 10}`}
                  stroke={`var(${MEDIA[medium].cssVar})`}
                  strokeWidth={medium === "network" ? 1.25 : 2.25}
                  strokeDasharray={medium === "network" ? "3 3" : undefined}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
});
