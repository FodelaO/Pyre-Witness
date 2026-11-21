/** Composes the plant schematic from the live twin and binds its controls. */
"use client";

import { useCallback, useState } from "react";
import CrewLayer from "@/crew/CrewLayer";
import SimLayer from "@/sim/SimLayer";
import { useTwinStore } from "@/twin/store";
import type { Medium } from "@/twin/types";
import AssetLayer from "./AssetLayer";
import AttackPathLayer from "./AttackPathLayer";
import DropPin from "./DropPin";
import EntryPoints from "./EntryPoints";
import FloorStage from "./FloorStage";
import Legend from "./Legend";
import PipeLayer from "./PipeLayer";
import ZoneLayer from "./ZoneLayer";
import "./floor.css";

export default function PlantFloor() {
  const twin = useTwinStore((state) => state.twin);
  const [hidden, setHidden] = useState<ReadonlySet<Medium>>(() => new Set());

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
    <FloorStage plant={twin.plant} controls={<Legend hidden={hidden} onToggle={toggleMedium} />}>
      <ZoneLayer areas={twin.areas} />
      <PipeLayer assets={twin.assets} hidden={hidden} />
      <EntryPoints points={twin.entryPoints} />
      <AssetLayer assets={twin.assets} />
      <SimLayer />
      <AttackPathLayer twin={twin} />
      <CrewLayer />
      <DropPin />
    </FloorStage>
  );
}
