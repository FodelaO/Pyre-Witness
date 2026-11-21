/** Prices individual live detections and completed tabletop outcomes from the shared economics. */
import { displayedEventLoss } from "@/econ/displayLedger";
import { estimateLoss } from "@/econ/model";
import { startingConfiguration } from "@/econ/mountsSimulationSnapshot";
import { scenarioFromFinding, scenarioFromSimulation } from "@/econ/scenarios";
import { useRunStore, type RunState } from "@/pipeline/runStore";
import { runScenario } from "@/sim/engine";
import { useSimStore } from "@/sim/simStore";
import type { SimRun } from "@/sim/types";
import { applyEffects } from "@/twin/effects";
import { areaById, assetById } from "@/twin/geometry";
import { useTwinStore, type TwinState } from "@/twin/store";
import type { Asset, RiskReport, Twin } from "@/twin/types";
import { placedDeviceLoss } from "./placedDeviceLoss";
import { gatewayRehearsal } from "./testScenario";
import { testScenarioCause } from "./testScenarioEvidence";
import type { EscalationCause } from "./types";

const findingsByReport = new WeakMap<RiskReport, EscalationCause[]>();
let pricedCapture: { risk: RiskReport; events: RunState["events"]; assessment: RunState["assessment"]; cause: EscalationCause | null } | undefined;
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
      // The figure the asset inspector prints beside this finding.
      loss: displayedEventLoss(estimate),
      score: risk.score,
      baseline: baselineScore,
    }];
  });
  findingsByReport.set(risk, causes);
  return causes;
}

/** The captured device carries one figure: the results panel's per-event loss for where it sits. */
function captureCause(state: TwinState, run: RunState): EscalationCause | null {
  if (run.status === "running" || !run.placedAssetId) return null;
  if (pricedCapture && pricedCapture.risk === state.risk && pricedCapture.events === run.events
    && pricedCapture.assessment === run.assessment) return pricedCapture.cause;

  const priced = placedDeviceLoss(state.twin, run);
  const trigger = priced?.estimate?.trigger;
  const cause: EscalationCause | null = priced ? {
    key: `capture:${priced.asset.id}`,
    kind: "finding",
    title: trigger?.label ?? "Captured device placement",
    ...(trigger?.kind === "rule" ? { ruleId: trigger.id } : {}),
    ...identity(state.twin, priced.asset),
    loss: priced.loss,
    lossIfMoved: priced.lossIfMoved ?? priced.loss,
    score: state.risk.score,
    baseline: state.baselineScore,
  } : null;
  pricedCapture = { risk: state.risk, events: run.events, assessment: run.assessment, cause };
  return cause;
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
    loss: displayedEventLoss(estimateLoss(projected, scenario)),
    score: state.risk.score,
    baseline: state.baselineScore,
  } : null;

  outcomes.set(run, { mitigations: state.mitigations, risk: state.risk, cause });
  return cause;
}

export function readCauses(preferredAsset: string | null): EscalationCause[] {
  const state = useTwinStore.getState();
  const run = useRunStore.getState();
  const capture = captureCause(state, run);
  // Finding-level figures stay out for the captured device: none while its run prices it, then the panel's.
  const pricedId = capture?.assetId ?? (run.status === "running" ? run.placedAssetId : null);
  const test = testScenarioCause(state);
  const testTiers = test ? ([
    { id: "PT-401", level: 1, loss: 8_000 },
    { id: "HMI-F3", level: 2, loss: 125_000 },
  ] as const).flatMap(({ id, level, loss }): EscalationCause[] => {
    const asset = assetById(state.twin, id);
    return asset ? [{
      key: "test-scenario:" + id, kind: "finding", test: true, testLevel: level,
      ...identity(state.twin, asset), title: "TEST SCENARIO · Simulated asset exposure",
      loss, score: state.risk.score, baseline: state.baselineScore,
    }] : [];
  }) : [];
  const rehearsalId = state.twin.assets.find(gatewayRehearsal)?.id;
  const everyFinding = findingCauses(state).filter(({ assetId }) => assetId !== rehearsalId);
  const findings = everyFinding.filter(({ assetId }) => assetId !== pricedId);
  const own = capture?.assetId === preferredAsset ? capture : everyFinding.find((finding) => finding.assetId === preferredAsset);
  const top = own ? (own !== capture && own.assetId === pricedId ? { ...own, loss: null } : own) : findings[0];
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
  return [...(test ? [test, ...testTiers] : []), ...(simulation ? [simulation] : []), ...(capture ? [capture] : []), ...ranked, risk];
}
