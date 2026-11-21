/** Prices individual live detections and completed tabletop outcomes from the shared economics. */
import { estimateLoss } from "@/econ/model";
import { startingConfiguration } from "@/econ/mountsSimulationSnapshot";
import { scenarioFromFinding, scenarioFromSimulation } from "@/econ/scenarios";
import { runScenario } from "@/sim/engine";
import { useSimStore } from "@/sim/simStore";
import type { SimRun } from "@/sim/types";
import { applyEffects } from "@/twin/effects";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore, type TwinState } from "@/twin/store";
import type { Asset, RiskReport, Twin } from "@/twin/types";
import type { EscalationCause } from "./types";

const findingsByReport = new WeakMap<RiskReport, EscalationCause[]>();
const outcomes = new WeakMap<SimRun, {
  mitigations: TwinState["mitigations"];
  risk: RiskReport;
  cause: EscalationCause | null;
}>();
const runKeys = new WeakMap<SimRun, number>();
let runNumber = 0;

function identity(twin: Twin, asset?: Asset) {
  return {
    assetId: asset?.id ?? null,
    assetName: asset?.name ?? null,
    assetKind: asset?.physical.kind ?? null,
    room: asset ? areaById(twin, asset.physical.area)?.name ?? null : null,
  };
}

function findingCauses({ twin, risk, baselineScore }: TwinState): EscalationCause[] {
  const cached = findingsByReport.get(risk);
  if (cached) return cached;

  const causes = risk.findings.toSorted((a, b) => b.severity - a.severity).flatMap<EscalationCause>((finding) => {
    const asset = assetById(twin, finding.assetId);
    if (!asset) return [];
    const estimate = estimateLoss(twin, scenarioFromFinding(twin, finding));
    return [{
      key: `finding:${finding.assetId}:${finding.ruleId}`,
      kind: "finding",
      title: finding.title,
      ruleId: finding.ruleId,
      ...identity(twin, asset),
      loss: estimate.lossIfManifests,
      score: risk.score,
      baseline: baselineScore,
    }];
  });
  findingsByReport.set(risk, causes);
  return causes;
}

function simulationCause(run: SimRun, state: TwinState): EscalationCause | null {
  const cached = outcomes.get(run);
  if (cached?.mitigations === state.mitigations && cached.risk === state.risk) return cached.cause;

  const start = startingConfiguration(run) ?? { twin: state.twin, applied: [] };
  const applied = state.mitigations.filter((item) => item.status === "applied");
  const startingIds = new Set(start.applied.map(({ id }) => id));
  const newControls = applied.filter((item) => !startingIds.has(item.id));
  const effects = newControls.flatMap(({ effects }) => effects).filter(({ type }) => type !== "note");
  const projected = effects.length ? applyEffects(start.twin, effects) : start.twin;
  const checkedRun = effects.length ? runScenario(run.id, projected, { appliedEffects: applied.flatMap((item) => item.effects) }) : run;
  const scenario = scenarioFromSimulation(projected, checkedRun);
  const asset = scenario ? assetById(projected, scenario.assetId) : undefined;

  let id = runKeys.get(run);
  if (id === undefined) {
    id = ++runNumber;
    runKeys.set(run, id);
  }
  const cause: EscalationCause | null = scenario && asset && assetById(state.twin, asset.id) ? {
    key: `simulation:${run.id}:${id}`,
    kind: "simulation",
    title: scenario.trigger.label,
    ...identity(projected, asset),
    loss: estimateLoss(projected, scenario).lossIfManifests,
    score: state.risk.score,
    baseline: state.baselineScore,
  } : null;

  outcomes.set(run, { mitigations: state.mitigations, risk: state.risk, cause });
  return cause;
}

export function readCauses(preferredAsset: string | null): EscalationCause[] {
  const state = useTwinStore.getState();
  const findings = findingCauses(state);
  const top = findings.find((finding) => finding.assetId === preferredAsset) ?? findings[0];
  const risk: EscalationCause = {
    key: "plant-risk",
    kind: "risk",
    ...(top ? {
      assetId: top.assetId, assetName: top.assetName, assetKind: top.assetKind,
      room: top.room, loss: top.loss, title: top.title, ruleId: top.ruleId,
    } : {
      ...identity(state.twin), loss: null, title: "Plant risk threshold crossed",
    }),
    score: state.risk.score,
    baseline: state.baselineScore,
  };
  const sim = useSimStore.getState();
  const simulation = sim.mode === "finished" && sim.run ? simulationCause(sim.run, state) : null;
  const ranked = findings.toSorted((a, b) =>
    Number(b.assetId === preferredAsset) - Number(a.assetId === preferredAsset) || (b.loss ?? 0) - (a.loss ?? 0));
  return [...(simulation ? [simulation] : []), ...ranked, risk];
}
