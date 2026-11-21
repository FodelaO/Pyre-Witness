/** Mounts the office and moving crew inside the plant floor's SVG. */
"use client";

import { useTwinStore } from "@/twin/store";
import { areaById } from "@/twin/geometry";
import Avatar from "./Avatar";
import CrewOffice from "./CrewOffice";
import { useCrewConnection, useCrewStore } from "./crewStore";
import { useIdlePatrol } from "./patrol";
import { CREW, CREW_ORDER } from "./types";
import "./crew.css";

export default function CrewLayer() {
  useCrewConnection();
  useIdlePatrol();
  const plant = useTwinStore((state) => state.twin.plant);
  const office = useTwinStore((state) => areaById(state.twin, "crew_office"));
  const avatars = useCrewStore((state) => state.avatars);
  return (
    <g className="pw-crew-layer" aria-label="AI crew" pointerEvents="none">
      <CrewOffice room={office} building={plant.building} />
      {CREW_ORDER.map((id) => <Avatar key={id} member={CREW[id]} avatar={avatars[id]} canvas={plant.canvas} />)}
    </g>
  );
}
