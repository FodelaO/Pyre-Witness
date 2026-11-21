/** Replays resolved stages on the plant and publishes alerts and human-review proposals. */
import { create } from "zustand";
import { useTwinStore } from "@/twin/store";
import type { Twin } from "@/twin/types";
import { projectScenarioMitigations, runScenario } from "./engine";
import { applyMonitorStatus, readMonitors } from "./monitors";
import { applySimEffects, restoreProjection, type Projection } from "./overlay";
import { createProcessState, type ProcessState } from "./process/model";
import { tickProcess } from "./process/tick";
import type { ScenarioId, SimAlert, SimAssetEffect, SimEffects, SimRun, SimStage } from "./types";

export interface SimState {
  activeScenario: ScenarioId | null;
  run: SimRun | null;
  currentStage: number;
  alerts: SimAlert[];
  outcome: string | null;
  mode: "idle" | "playing" | "paused" | "finished";
  elapsed: number;
  speed: 1 | 4;
  visual: SimEffects["visual"];
  start: (scenarioId: ScenarioId) => void;
  togglePlayback: () => void;
  setSpeed: (speed: 1 | 4) => void;
  advance: (realSeconds: number) => void;
  tickPlant: () => void;
  reset: () => void;
}

const idle = {
  activeScenario: null, run: null, currentStage: -1, elapsed: 0,
  mode: "idle" as const, outcome: null, visual: undefined,
};

function stageAlerts(stages: SimStage[]): SimAlert[] {
  return stages.flatMap((stage, index) => {
    const statuses = Object.values(stage.effects?.assets ?? {}).map((asset) => asset.status);
    const areaStatuses = Object.values(stage.effects?.areas ?? {});
    const hasAlarm = [...statuses, ...areaStatuses].includes("alarm") || statuses.includes("offline");
    const hasAttention = [...statuses, ...areaStatuses].includes("attention");
    if (!hasAlarm && !hasAttention) return [];
    return [{
      id: `simulation-${index}`, title: stage.title, where: stage.where,
      severity: hasAlarm ? "alarm" : "attention", source: "simulation",
    }];
  });
}

function applyStageTrips(twin: Twin, stages: SimStage[]): Twin {
  const assets: Record<string, SimAssetEffect> = {};
  for (const { effects } of stages) {
    for (const [id, { running, status }] of Object.entries(effects?.assets ?? {})) {
      const prior = assets[id];
      if (!prior && running === undefined && status !== "offline") continue;
      assets[id] = { running: running ?? prior?.running, status: status ?? prior?.status };
    }
  }
  return Object.keys(assets).length ? applySimEffects(twin, { assets }) : twin;
}

export const useSimStore = create<SimState>((set, get) => {
  let monitorProjection: Projection | null = null;
  let scenarioProjection: Projection | null = null;
  let trialPlantProjection: Projection | null = null;
  let process: ProcessState | undefined;
  let trialProcess: ProcessState | undefined;

  const restoreTrial = (twin: Twin) => restoreProjection(restoreProjection(twin, scenarioProjection), trialPlantProjection);

  function paintStages(twin: Twin, stages: SimStage[]) {
    let changed = twin;
    let visual: SimEffects["visual"];
    for (const { effects } of stages) {
      if (!effects) continue;
      changed = applySimEffects(changed, effects);
      if (effects.visual) visual = effects.visual;
    }
    const alerts = readMonitors(changed);
    const painted = applyMonitorStatus(changed, alerts);
    scenarioProjection = { before: twin, painted };
    return { painted, alerts: [...alerts, ...stageAlerts(stages)], visual };
  }

  const clearScenarioProjection = () => {
    const { twin, patchTwinQuiet } = useTwinStore.getState();
    const restored = restoreTrial(twin);
    scenarioProjection = null;
    trialPlantProjection = null;
    trialProcess = undefined;
    if (restored !== twin) patchTwinQuiet(() => restored);
  };

  return {
    ...idle,
    alerts: [],
    speed: 1,
    start(scenarioId) {
      clearScenarioProjection();
      const { twin } = useTwinStore.getState();
      const run = runScenario(scenarioId, twin);
      set({ ...idle, activeScenario: scenarioId, run, mode: "playing", alerts: readMonitors(twin) });
      get().advance(0);
    },
    togglePlayback() {
      const { mode, activeScenario } = get();
      if (mode === "playing") set({ mode: "paused" });
      if (mode === "paused") set({ mode: "playing" });
      if (mode === "finished" && activeScenario) get().start(activeScenario);
    },
    setSpeed(speed) { set({ speed }); },
    advance(realSeconds) {
      const state = get();
      if (state.mode !== "playing" || !state.run || !Number.isFinite(realSeconds) || realSeconds < 0) return;
      const lastTime = state.run.stages.at(-1)?.t ?? 0;
      const elapsed = Math.min(lastTime, state.elapsed + realSeconds * state.speed);
      const currentStage = state.run.stages.findLastIndex(({ t }) => t <= elapsed);
      const finished = elapsed >= lastTime;
      const next: Partial<SimState> = { elapsed, currentStage };
      if (currentStage !== state.currentStage) {
        const { twin, patchTwinQuiet } = useTwinStore.getState();
        const before = restoreProjection(twin, scenarioProjection);
        const stages = state.run.stages.slice(0, currentStage + 1);
        const { painted, alerts, visual } = paintStages(before, stages);
        if (painted !== twin) patchTwinQuiet(() => painted);
        next.alerts = alerts;
        next.visual = visual;
      }
      if (finished) {
        next.mode = "finished";
        next.outcome = state.run.consequence.summary;
      }
      set(next);
      if (finished) {
        const { twin, mitigations, proposeMitigations } = useTwinStore.getState();
        const baseline = restoreTrial(twin);
        const pending = new Set(mitigations.filter(({ status }) => status === "proposed")
          .map(({ effects }) => JSON.stringify(effects)));
        const proposals = projectScenarioMitigations(state.run.id, baseline)
          .filter(({ effects }) => !pending.has(JSON.stringify(effects)));
        if (proposals.length) proposeMitigations(proposals);
      }
    },
    tickPlant() {
      const { run, currentStage } = get();
      const { twin, patchTwinQuiet } = useTwinStore.getState();
      if (run) {
        const beforeTick = restoreProjection(twin, scenarioProjection);
        const beforeRun = restoreProjection(beforeTick, trialPlantProjection);
        const stages = run.stages.slice(0, currentStage + 1);
        const controlled = applyStageTrips(beforeTick, stages);
        const tick = tickProcess(controlled, trialProcess ?? process ?? createProcessState(controlled));
        trialProcess = tick.state;
        const updated = restoreProjection(tick.twin, { before: beforeTick, painted: controlled });
        trialPlantProjection = { before: beforeRun, painted: updated };
        const { painted, alerts } = paintStages(updated, stages);
        if (painted !== twin) patchTwinQuiet(() => painted);
        if (alerts.length || get().alerts.length) set({ alerts });
        return;
      }
      const baseline = restoreProjection(twin, monitorProjection);
      const tick = tickProcess(baseline, process ?? createProcessState(baseline));
      process = tick.state;
      const alerts = readMonitors(tick.twin);
      const painted = applyMonitorStatus(tick.twin, alerts);
      monitorProjection = { before: tick.twin, painted };
      if (painted !== twin) patchTwinQuiet(() => painted);
      if (alerts.length || get().alerts.length) set({ alerts });
    },
    reset() {
      clearScenarioProjection();
      set({ ...idle, alerts: readMonitors(useTwinStore.getState().twin) });
    },
  };
});
