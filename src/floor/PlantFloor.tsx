/** Composes the plant schematic from the live twin and binds its controls. */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useTwinStore } from "@/twin/store";
import type { Medium } from "@/twin/types";
import FloorStage from "./FloorStage";
import Legend from "./Legend";
import { useTwinFocus } from "./twinFocus";

export default function PlantFloor({ previewModel }: { previewModel: boolean }) {
  const twin = useTwinStore((state) => state.twin);
  const { selectedId, highlighted, direct, focused } = useTwinFocus(twin);
  const [hidden, setHidden] = useState<ReadonlySet<Medium>>(() => new Set());
  const materialHidden = useMemo(() => new Set<Medium>([...hidden, "network"]), [hidden]);

  const toggleMedium = useCallback((media: readonly Medium[]) => {
    setHidden((previous) => {
      const next = new Set(previous);
      const show = next.has(media[0]);
      for (const medium of media) {
        if (show) next.delete(medium);
        else next.add(medium);
      }
      return next;
    });
  }, []);

  return (
    <FloorStage twin={twin} selectedId={selectedId} highlighted={highlighted} direct={direct} focused={focused} previewModel={previewModel}
      materialHidden={materialHidden} controls={<Legend hidden={hidden} onToggle={toggleMedium} />} />
  );
}
