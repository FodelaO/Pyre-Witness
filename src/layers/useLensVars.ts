/** Exposes lens weights as inline variables on the HTML floor wrapper. */
"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { restoreLensMode, useLensStore } from "./lensStore";

export function useLensVars(): CSSProperties {
  const weights = useLensStore((state) => state.weights);
  useEffect(restoreLensMode, []);

  return useMemo(() => ({
    "--lens-material": weights.material,
    "--lens-data": weights.data,
    "--lens-connectors": weights.connectors,
    "--lens-material-events": weights.material === 0 ? "none" : "inherit",
    "--lens-data-events": weights.data === 0 ? "none" : "inherit",
    "--lens-material-hit-stroke": weights.material === 0 ? "none" : "stroke",
    "--lens-material-hit-all": weights.material === 0 ? "none" : "all",
    "--lens-material-visibility": weights.material === 0 ? "hidden" : "inherit",
    "--lens-data-visibility": weights.data === 0 ? "hidden" : "inherit",
  }) as CSSProperties, [weights]);
}
