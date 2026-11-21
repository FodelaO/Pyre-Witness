/** Schedules visible idle rounds using observations taken from the current twin. */
"use client";

import { useEffect } from "react";
import { formatTelemetry } from "@/floor/telemetryFormat";
import { useRunStore } from "@/pipeline/runStore";
import { evaluatePlacement } from "@/rules/engine";
import { areaCenter, isOutdoors } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset, TelemetryPoint, Twin } from "@/twin/types";
import { endPatrolVisit, startPatrolVisit, useCrewStore } from "./crewStore";
import type { CrewCue } from "./director";
import { CREW, CREW_ORDER, type CrewId } from "./types";

function telemetryText({ tag, value, unit, lo, hi }: TelemetryPoint): string {
  const inBand = lo !== undefined && hi !== undefined && value >= lo && value <= hi;
  return `${tag} ${formatTelemetry(value, unit)}${inBand ? " · in band" : ""}`;
}

export function observePatrol(twin: Twin, crew: CrewId, round: number, at: number): CrewCue | undefined {
  const withinFloor = (asset: Asset) => !isOutdoors(twin, asset.physical.x, asset.physical.y);
  const assets = twin.assets.filter(withinFloor);
  const cue = (text: string, stops: CrewCue["stops"], inspect?: CrewCue["inspect"], engine?: string): CrewCue => ({
    status: "idle", stops, inspect, activity: { crew, at, text, engine, kind: "patrol" },
  });
  const visitAsset = (asset: Asset, text: string, engine?: string) => {
    const { x, y, area } = asset.physical;
    const point = { x, y };
    return cue(text, [{ point, area, beside: true }], point, engine);
  };

  if (crew === "scout") {
    const readings = assets.flatMap((asset) => (asset.process?.telemetry ?? [])
      .filter(({ value }) => Number.isFinite(value)).map((point) => ({ asset, point })));
    const primary = round === 0 ? readings.find(({ point }) => point.tag === "LT-301") : undefined;
    const reading = primary ?? readings[round % readings.length];
    if (reading) return visitAsset(reading.asset, telemetryText(reading.point));
  }
  if (crew === "inspector") {
    const controls = assets.filter(({ physical }) => physical.kind === "hmi" || physical.kind === "plc_cabinet");
    const primary = round === 0 ? controls.find(({ id }) => id === "HMI-F3") : undefined;
    const asset = primary ?? controls[round % controls.length] ?? assets[round % assets.length];
    if (asset) {
      const { findings } = evaluatePlacement(twin, asset);
      const detail = findings.length ? "placement checked" : "no findings";
      return visitAsset(asset, `${asset.id} · ${detail}`, CREW.inspector.engine);
    }
  }
  const areas = twin.areas.filter((area) => area.kind === "process" || area.id === "utilities");
  const area = areas[(round + CREW_ORDER.indexOf(crew)) % areas.length];
  if (!area) return;
  const local = assets.filter(({ physical }) => physical.area === area.id);
  const running = local.filter(({ process }) => process?.running === true).length;
  const count = crew === "chief" && running ? `${running} running` : `${local.length} ${local.length === 1 ? "asset" : "assets"}`;
  return cue(`${area.name} · ${count}`, [{ point: areaCenter(area), area: area.id }]);
}

export function useIdlePatrol(): void {
  useEffect(() => {
    let timer: number | null = null;
    let visitor: CrewId | null = null;
    let turn = 0;
    const allowed = () => {
      const { phase } = useCrewStore.getState();
      return !document.hidden && phase === "idle" && useRunStore.getState().status !== "running";
    };
    const stop = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      visitor = null;
    };
    const schedule = (delay: number) => { timer = window.setTimeout(visit, delay); };

    function visit() {
      timer = null;
      if (!allowed()) return;
      const crew = CREW_ORDER[turn % CREW_ORDER.length];
      const cue = observePatrol(useTwinStore.getState().twin, crew, Math.floor(turn / CREW_ORDER.length), Date.now());
      turn += 1;
      visitor = crew;
      if (cue && startPatrolVisit(cue)) {
        timer = window.setTimeout(() => {
          endPatrolVisit(crew);
          visitor = null;
          schedule(3300);
        }, 5000);
      } else {
        visitor = null;
        schedule(3300);
      }
    }

    function reconcile() {
      if (!allowed()) {
        if (document.hidden && visitor) endPatrolVisit(visitor, true);
        stop();
      } else if (timer === null && visitor === null) {
        schedule(3500);
      }
    }

    const unsubscribe = useCrewStore.subscribe((next, previous) => {
      if (next.phase !== previous.phase) reconcile();
    });
    document.addEventListener("visibilitychange", reconcile);
    reconcile();
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", reconcile);
      if (visitor) endPatrolVisit(visitor, true);
      stop();
    };
  }, []);
}
