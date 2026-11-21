/** Areas and Purdue levels to avoid, with the reason for each warning. */
"use client";

import { Ban } from "lucide-react";
import type { LensMode } from "@/layers/lensStore";
import type { NeverPlace as NeverPlacement } from "@/pipeline/types";
import { areaById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { prioritizeLens } from "./panelLens";
import { PanelHeading, PurdueBadge, TextPreview } from "./PanelParts";

export function NeverPlace({ places, mode }: { places: NeverPlacement[]; mode: LensMode }) {
  const twin = useTwinStore((state) => state.twin);
  const select = useTwinStore((state) => state.select);
  const orderedPlaces = prioritizeLens(mode, places, (lens, { area, level }) => lens === "material" ? area !== null : level !== null);
  return (
    <>
      <PanelHeading icon={Ban}>Never here</PanelHeading>
      {!orderedPlaces.length && <p className="pw-panel-muted">No extra placement restrictions reported.</p>}
      <ul className="pw-panel-never">
        {orderedPlaces.map((place, index) => {
          const area = place.area ? areaById(twin, place.area) : undefined;
          return (
            <li key={`${place.where}-${index}`}>
              <div>
                {area ? <button type="button" className="pw-panel-link" onClick={() => select(area.id)}>{area.name}</button> : <strong>{place.where}</strong>}
                {place.level != null && <PurdueBadge level={place.level} />}
              </div>
              {place.why && <TextPreview text={place.why} label="Restriction rationale" />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
