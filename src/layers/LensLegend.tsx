/** Compact swatches for the currently committed pipeline lens. */
"use client";

import { useLensStore, type LensMode } from "./lensStore";

const SWATCHES: Record<LensMode, readonly (readonly [string, string])[]> = {
  material: [["material", "Process flow"], ["washdown", "Washdown"], ["hazard", "NH₃ hazard"]],
  both: [["material", "Material flow"], ["data", "Data flow"], ["signal", "ISA signal"], ["finding", "Finding"]],
  data: [["data", "Data flow"], ["zone", "Zone / gate"], ["finding", "Finding"]],
};

export default function LensLegend() {
  const mode = useLensStore((state) => state.mode);
  return (
    <ul className="lens-legend" aria-label="Lens legend">
      {SWATCHES[mode].map(([swatch, text]) => (
        <li key={swatch}><span aria-hidden="true" data-swatch={swatch} />{text}</li>
      ))}
      {mode !== "material" && <li className="lens-legend-note">Software assumed (simulated plant)</li>}
    </ul>
  );
}
