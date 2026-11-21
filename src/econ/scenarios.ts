/** Converts observed detections and tabletop outcomes into economic scenarios. */
import type { ComplianceItem } from "@/pipeline/types";
import { createContext } from "@/rules/context";
import type { SimConsequence, SimRun, SimScenarioId } from "@/sim/types";
import type { Asset, AttackPath, RuleFinding, Twin } from "@/twin/types";
import type { ThreatItem } from "@/watch/types";
import { plantEconomics, type Consequence } from "./economics";
import type { LossScenario, LossTrigger } from "./types";
import { lineDependency } from "./valuation";

function availabilityLoss(twin: Twin, asset: Asset | undefined): Consequence {
  return asset && lineDependency(twin, asset) > 0 ? "processStop" : "device";
}

function ammoniaSafety(twin: Twin, asset: Asset | undefined): boolean {
  if (!asset?.safetyCritical) return false;
  const context = createContext(twin);
  return context.areasFor(asset).some((area) => area.attrs.hazard === "NH3")
    || asset.process?.medium === "ammonia"
    || asset.physical.connections.some(({ medium, active }) => medium === "ammonia" && active !== false);
}

function consequenceFromEvidence(twin: Twin, asset: Asset | undefined, text: string): Consequence {
  // A hold at the plant carries inventory loss. Escaped contaminated product
  // introduces the distinct off-site recall/liability scenario.
  const contaminated = /\b(?:contaminated|unsafe|adulterated)\s+(?:product|beverages?|batches?)\b/i.test(text)
    && !/\bno\s+(?:contaminated|unsafe|adulterated)\s+(?:product|beverages?|batches?)\b/i.test(text);
  const distributed = /\b(?:shipped|distributed|sold|reached consumers?|left the plant)\b/i.test(text)
    && !/\b(?:not|never|no|prevented from)\s+(?:(?:been|being)\s+)?(?:ship(?:ped)?|distribut(?:e|ed)|s(?:ell|old)|reach(?:ed)? consumers?|(?:leave|left) the plant)\b/i.test(text);
  if (contaminated && distributed) return "productRecall";
  const release = /\b(?:release|leak|evacuati\w*|safety function)\b/i.test(text)
    && !/\b(?:no|prevent(?:ed|s)?)\s+(?:(?:ammonia|nh3)\s+)?(?:release|leak|evacuati\w*)\b/i.test(text)
    && !/\b(?:release|leak)\s+(?:is|was|can be)\s+prevented\b/i.test(text);
  if (ammoniaSafety(twin, asset) && release) return "ammoniaRelease";
  if (contaminated || /\b(?:batch|product)\s+(?:quarantine|hold|held)|\bforeign.material\b/i.test(text)) return "productHold";
  return availabilityLoss(twin, asset);
}

function makeScenario(assetId: string, trigger: LossTrigger, consequence: Consequence): LossScenario {
  return { id: JSON.stringify([trigger.kind, trigger.id, assetId]), assetId, trigger, consequence };
}

export function scenarioFromFinding(twin: Twin, finding: RuleFinding): LossScenario {
  const asset = createContext(twin).assetById.get(finding.assetId);
  const trigger: LossTrigger = { kind: "rule", id: finding.ruleId, label: finding.title };
  if (finding.ruleId === "CRED-01") trigger.evidence = "credential";
  else if (finding.ruleId === "MGMT-01" || finding.ruleId === "TRANS-01") trigger.evidence = "unmanaged";
  else if (finding.kind === "compliance") trigger.evidence = "compliance";
  // A detection about one access mechanism is priced on that mechanism's route, when the twin has one.
  if (finding.ruleId === "RF-01") trigger.exposure = ["rf"];
  else if (finding.ruleId === "USB-01" || finding.ruleId === "TRANS-01") trigger.exposure = ["removable", "visitor"];
  else if (finding.ruleId === "PHYS-01") trigger.exposure = ["visitor", "removable"];

  let consequence = consequenceFromEvidence(twin, asset, `${finding.title} ${finding.detail}`);
  if (finding.ruleId === "SAFE-01" && ammoniaSafety(twin, asset)) consequence = "ammoniaRelease";
  if (finding.ruleId === "FOOD-02" || finding.ruleId === "WASH-01") {
    const context = createContext(twin);
    const nearProduct = asset && context.areasFor(asset).some((area) => area.attrs.foodContact);
    if (nearProduct && consequence !== "productRecall") consequence = "productHold";
  }
  return makeScenario(finding.assetId, trigger, consequence);
}

export function scenarioFromPath(twin: Twin, path: AttackPath): LossScenario {
  const asset = createContext(twin).assetById.get(path.target);
  const trigger: LossTrigger = { kind: "path", id: path.id, label: path.title };
  if (path.ruleIds?.includes("CRED-01")) trigger.evidence = "credential";
  else if (path.ruleIds?.includes("MGMT-01") || path.ruleIds?.includes("TRANS-01")) trigger.evidence = "unmanaged";
  const consequence = consequenceFromEvidence(twin, asset, path.impact);
  return { ...makeScenario(path.target, trigger, consequence), path };
}

type ScoredThreatItem = ThreatItem & { cvss?: number; cvssScore?: number };

function cvssScore(item: ScoredThreatItem): number | undefined {
  const fields = [item.cvss, item.cvssScore];
  const text = `${item.title} ${item.summary}`;
  for (const match of text.matchAll(/\bCVSS(?:\s*[-:]?\s*(?:v(?:ersion)?\s*)?(?:2(?:\.0)?|3(?:\.[01])?|4(?:\.0)?))?(?:\s+(?:base\s+)?score)?\s*[:=]?\s*(?:(?:of|is)\s+)?(10(?:\.0+)?|[0-9](?:\.\d+)?)(?![\d.])/gi)) {
    // A version by itself carries no base score.
    if (/^CVSS\s+(?:2(?:\.0)?|3(?:\.[01])?|4(?:\.0)?)$/i.test(match[0])) continue;
    fields.push(Number(match[1]));
  }
  const verified = fields.filter((value): value is number => typeof value === "number"
    && Number.isFinite(value) && value >= 0 && value <= 10);
  return verified.length ? Math.max(...verified) : undefined;
}

export function scenarioFromWatch(twin: Twin, item: ScoredThreatItem, assetId: string): LossScenario {
  const asset = createContext(twin).assetById.get(assetId);
  const trigger: LossTrigger = { kind: "watch", id: `${item.source}:${item.id}`, label: item.title };
  if (item.source === "cisa-kev") trigger.knownExploited = true;
  const cvss = cvssScore(item);
  if (cvss !== undefined) trigger.cvss = cvss;
  return makeScenario(assetId, trigger, availabilityLoss(twin, asset));
}

export function scenarioFromCompliance(twin: Twin, gap: ComplianceItem, assetId: string): LossScenario {
  const asset = createContext(twin).assetById.get(assetId);
  const label = [gap.framework, gap.clause].filter(Boolean).join(" · ");
  const trigger: LossTrigger = { kind: "compliance", id: label, label, evidence: "compliance" };
  return makeScenario(assetId, trigger, consequenceFromEvidence(twin, asset, gap.note));
}

// The named asset is the physical locus already modeled by each exercise.
const EXERCISES: Record<SimScenarioId, { label: string; assetId: string }> = {
  ammonia: { label: "Ammonia Release", assetId: "C-1" },
  carbonation: { label: "CO₂ Upset", assetId: "CC-301" },
  chiller: { label: "Chiller Trip", assetId: "C-1" },
  cip: { label: "CIP Crossover", assetId: "V-311" },
  ransomware: { label: "Site Ransomware", assetId: "IT-WS1" },
  wireless: { label: "Rogue Wireless", assetId: "PLC-F3" },
};

function nonnegativeMetric(value: number | string | boolean | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function scenarioFromSimulation(twin: Twin, run: SimRun, outcome: SimConsequence = run.consequence): LossScenario | undefined {
  const exercise = EXERCISES[run.id];
  const context = createContext(twin);
  const { metrics } = outcome;
  const observedStages = outcome === run.consequence
    ? run.stages.filter((stage) => stage.outcome === "advanced") : [];
  let assetId = exercise.assetId;
  let consequence: Consequence = "device";
  const simulation: NonNullable<LossScenario["simulation"]> = { stopped: false, productLitres: 0, noDamage: true };

  switch (run.id) {
    case "ammonia":
      if (metrics.evacuation === true) {
        consequence = "ammoniaRelease";
        simulation.stopped = true;
        simulation.throughputLoss = 1;
        simulation.noDamage = false;
      }
      break;
    case "cip":
    case "carbonation":
      simulation.stopped = metrics.lineStopped === true;
      simulation.productLitres = run.id === "cip" ? nonnegativeMetric(metrics.contaminatedM3) * 1000
        : nonnegativeMetric(metrics.heldL);
      if (simulation.stopped || simulation.productLitres > 0) consequence = "productHold";
      if (simulation.stopped) simulation.throughputLoss = 1;
      break;
    case "chiller":
      simulation.stopped = metrics.lineStopped === true;
      simulation.noDamage = false;
      if (simulation.stopped) {
        consequence = "processStop";
        simulation.throughputLoss = 1;
      }
      break;
    case "ransomware": {
      simulation.stopped = nonnegativeMetric(metrics.areasStopped) > 0;
      const stoppedControllers = observedStages.filter((stage) => stage.technique === "T0827")
        .map((stage) => stage.where[0]).filter((id) => context.assetById.has(id));
      if (simulation.stopped) {
        consequence = "processStop";
        assetId = stoppedControllers.includes("PLC-F3") ? "PLC-F3" : stoppedControllers[0] ?? "PLC-F3";
      } else if (metrics.lostView === true) {
        assetId = "SCADA-03";
      }
      simulation.noDamage = !run.stages[0]?.effects?.assets;
      break;
    }
    case "wireless": {
      const flow = context.assetById.get("FT-403")?.process?.telemetry?.find((point) => point.tag === "FT-403");
      const affected = /\breached\b/i.test(outcome.summary);
      if (affected && flow && flow.value > 0 && typeof metrics.fillerRateBph === "number") {
        const baseline = flow.value * 1000 / plantEconomics.bottleLitres.value;
        simulation.throughputLoss = Math.max(0, Math.min(1, 1 - nonnegativeMetric(metrics.fillerRateBph) / baseline));
        if (simulation.throughputLoss > 0) consequence = "processStop";
      }
      break;
    }
  }

  const stopped = observedStages.flatMap((stage) => Object.entries(stage.effects?.assets ?? {})
    .filter(([id, effect]) => context.assetById.has(id) && (effect.running === false || effect.status === "offline"))
    .map(([id]) => id));
  if (stopped.length) simulation.stoppedAssetIds = [...new Set(stopped)];
  if (simulation.productLitres && observedStages.length) {
    const product = observedStages.flatMap((stage) => stage.where).filter((id) => {
      const asset = context.assetById.get(id);
      const kind = asset?.physical.kind;
      return kind === "rotary_filler" || (asset?.process?.medium === "product"
        && (kind === "vertical_tank" || kind === "agitated_tank" || kind === "carbo_cooler"));
    });
    if (product.length) simulation.productAssetIds = [...new Set(product)];
  }

  if (!context.assetById.has(assetId)) return undefined;
  const trigger: LossTrigger = { kind: "simulation", id: run.id, label: exercise.label };
  return { ...makeScenario(assetId, trigger, consequence), simulation };
}
