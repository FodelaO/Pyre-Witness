/** Areas and Purdue levels to avoid, with the reason for each warning. */
"use client";

import { Ban } from "lucide-react";
import type { NeverPlace as NeverPlacement } from "@/pipeline/types";
import { areaById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { PanelHeading, PurdueBadge, TextPreview } from "./PanelParts";

export function NeverPlace({ places }: { places: NeverPlacement[] }) {
  const twin = useTwinStore((state) => state.twin);
  return (
    <>
      <PanelHeading icon={Ban}>Never here</PanelHeading>
      <ul className="pw-panel-never">
        {places.map((place, index) => {
          const area = place.area ? areaById(twin, place.area) : undefined;
          return (
            <li key={`${place.where}-${index}`}>
              <div><strong>{area?.name ?? place.where}</strong>{place.level != null && <PurdueBadge level={place.level} />}</div>
              {place.why && <TextPreview text={place.why} label="Restriction rationale" />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
