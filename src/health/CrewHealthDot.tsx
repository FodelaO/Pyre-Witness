/** Renders the assigned engine's health on a crew readout or portrait. */
"use client";

import type { CrewId } from "@/crew/types";
import { crewEngineHealth } from "./crewHealth";
import { initialServices } from "./services";
import { useHealth } from "./useHealth";
import "./services.css";

export function useCrewHealth(id: CrewId) {
  const services = useHealth((state) => state.snapshot?.services);
  return crewEngineHealth(id, services ?? initialServices);
}

export function CrewHealthDot({ health, portrait = false }: {
  health: ReturnType<typeof crewEngineHealth>;
  portrait?: boolean;
}) {
  return <span className="pw-health-dot pw-health-crew-dot" data-portrait={portrait || undefined}
    data-status={health.tone} title={health.label} aria-hidden />;
}
