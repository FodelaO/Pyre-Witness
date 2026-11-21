/** Deterministic single-event loss and annualized exposure for the simulated plant. */
import type { Asset, RiskReport, Twin } from "@/twin/types";
import { allocateLoss, damageTargets } from "./allocations";
import { consequenceEconomics, penaltyBenchmark, plantEconomics, type Assumption, type ThreePoint } from "./economics";
import { frequencyInputs } from "./frequency";
import { formatFormulaUsd, roundHours, roundUsd } from "./format";
import { PERT_LAMBDA, pertMean, pertSampler, seededRandom } from "./pert";
import { scenarioFromFinding, scenarioFromPath } from "./scenarios";
import type { LossAssumption, LossEstimate, LossOtherLine, LossScenario } from "./types";
import { assetValuation, lineNameplate, productAtRisk, valuationAssumptions } from "./valuation";

export { formatUsd } from "./format";

const DRAWS = 10_000;
const ZERO: ThreePoint = [0, 0, 0];
type Component = LossEstimate["components"][number];

/**
 * Outage length, product lost and response effort all grow with the severity of the same event.
 * With this probability a draw uses one shared severity quantile for the three (rank correlation
 * 0.7, marginals unchanged); otherwise they are independent. Repair and liability stay independent.
 */
export const SEVERITY_CORRELATION = 0.7;
const SEVERITY_LINKED: ReadonlySet<Component["key"]> = new Set(["downtime", "product", "recovery"]);

function scale([low, mode, high]: ThreePoint, factor: number): ThreePoint {
  return [low * factor, mode * factor, high * factor];
}

function component(
  key: Component["key"], label: string, [low, mode, high]: ThreePoint, formula: string,
): Component {
  return { key, label, low, mode, high, mean: 0, formula };
}

function assumption(label: string, input: Assumption<number | ThreePoint | string>): LossAssumption {
  return { label, ...input };
}

function lossInputs(twin: Twin, asset: Asset, scenario: LossScenario) {
  const value = assetValuation(twin, asset);
  const p = plantEconomics;
  const c = consequenceEconomics[scenario.consequence];
  const downtimeDependency = scenario.simulation?.throughputLoss
    ?? (scenario.simulation?.stopped === false ? 0 : scenario.consequence === "ammoniaRelease" ? 1 : value.dependency);
  const damagedInstalled = damageTargets(twin, asset, scenario.simulation?.damagedAssetIds)
    .reduce((sum, target) => sum + assetValuation(twin, target).replacement, 0);
  const atRisk = productAtRisk(twin, asset, scenario.consequence);
  const knownProduct = scenario.simulation?.productLitres;
  const [lowBatches, modeBatches, highBatches] = p.recallBatches.value;
  const product = scenario.consequence === "productRecall" && knownProduct === undefined
    ? [lowBatches, modeBatches, highBatches].map((batches) => productAtRisk(twin, asset, scenario.consequence, batches))
    : undefined;
  const quantity = knownProduct === undefined ? atRisk : Math.max(0, knownProduct) / p.bottleLitres.value;
  const fractions = c.productFraction.value;
  const losses: ThreePoint = knownProduct !== undefined ? [quantity, quantity, quantity] : product
    ? [product[0] * fractions[0], product[1] * fractions[1], product[2] * fractions[2]]
    : scale(fractions, quantity);

  const components = [
    component("downtime", "Production downtime",
      scale(c.downtimeHours.value, value.throughputPerHour * downtimeDependency),
      "Hours stopped × contribution per line hour × dependency"),
    component("replacement", "Repair or replacement",
      scenario.simulation?.noDamage ? ZERO : scale(c.damageFactor.value, damagedInstalled),
      "Installed replacement × damage fraction"),
    component("product", "Product loss", scale(losses, p.unitCost.value),
      knownProduct === undefined ? "Bottles at risk × fraction held or scrapped × unit cost"
        : "Simulated volume held or scrapped ÷ bottle volume × unit cost"),
    component("recovery", "Response and recovery", scale(c.responseHours.value, p.blendedResponseRate.value),
      "Response hours × blended OT labour rate"),
    component("regulatory", "Regulatory and liability", c.regulatoryLiability.value,
      "Scenario estimate for third-party claims and regulatory costs"),
  ];
  const assumptions = [
    assumption("Line nameplate", { ...p.nameplateBph, value: lineNameplate(twin) }),
    assumption("Overall equipment effectiveness", p.oee),
    assumption("Contribution margin", p.contributionMargin),
    ...valuationAssumptions(asset).map(({ label, value }) => assumption(label, value)),
    ...(components[0].high > 0 ? [assumption("Downtime hours", c.downtimeHours)] : []),
    ...(scenario.simulation?.throughputLoss !== undefined ? [assumption("Simulated throughput loss fraction", {
      value: scenario.simulation.throughputLoss, unit: "line fraction", basis: "assumed (simulated plant)",
    })] : []),
    ...(components[1].high > 0 ? [assumption("Damage fraction", c.damageFactor)] : []),
    ...(components[2].high > 0 ? [
      assumption("Bottles at risk", {
        value: product ? [product[0], product[1], product[2]] : quantity,
        unit: "bottles",
        basis: "assumed (simulated plant)",
      }),
      assumption("Bottling batch", p.bottlingBatch),
      ...(product ? [assumption("Recall batches", p.recallBatches)] : []),
      assumption("Volume per bottle", p.bottleLitres),
      ...(knownProduct === undefined ? [assumption("Product at risk fraction", c.productFraction)] : []),
      assumption("Product unit cost", p.unitCost),
    ] : []),
    assumption("Response hours", c.responseHours),
    assumption("Blended response rate", p.blendedResponseRate),
    ...(components[4].high > 0 ? [assumption("Regulatory and liability range", c.regulatoryLiability)] : []),
    ...(scenario.consequence === "ammoniaRelease" ? [assumption("U.S. OSHA cap (reference only)", penaltyBenchmark)] : []),
    ...(components.filter(({ key, high }) => SEVERITY_LINKED.has(key) && high > 0).length > 1
      ? [assumption("Outage, product and response rank correlation", {
        value: SEVERITY_CORRELATION, unit: "correlation fraction", basis: "assumed (simulated plant)",
      })] : []),
  ];
  return { value, components, assumptions, downtimeDependency };
}

function otherLines(components: Component[]): LossOtherLine[] {
  const recovery = components.find(({ key }) => key === "recovery")!;
  const regulatory = components.find(({ key }) => key === "regulatory")!;
  const rate = plantEconomics.blendedResponseRate.value;
  const hours = roundHours(recovery.mean / rate);
  const shownRate = roundUsd(rate);
  const displayAmount = roundUsd(hours * shownRate);
  const lines: LossOtherLine[] = [{
    key: "recovery", label: recovery.label, amount: recovery.mean, displayAmount,
    formula: `${hours} person-h × ${formatFormulaUsd(shownRate)}/h ≈ ${formatFormulaUsd(displayAmount)}`,
  }];
  if (regulatory.high > 0) {
    const [low, mode, high] = [regulatory.low, regulatory.mode, regulatory.high].map(roundUsd);
    const displayAmount = roundUsd(pertMean([low, mode, high]));
    lines.push({
      key: "regulatory", label: regulatory.label, amount: regulatory.mean, displayAmount,
      formula: `(${formatFormulaUsd(low)} + ${PERT_LAMBDA} × ${formatFormulaUsd(mode)} + ${formatFormulaUsd(high)}) ÷ ${PERT_LAMBDA + 2} ≈ ${formatFormulaUsd(displayAmount)}`,
    });
  }
  return lines;
}

function assetIdentity(asset: Asset): LossEstimate["asset"] {
  return { id: asset.id, tag: asset.id, name: asset.name, kind: asset.physical.kind };
}

const estimates = new WeakMap<Twin, WeakMap<LossScenario, LossEstimate>>();

export function estimateLoss(twin: Twin, scenario: LossScenario): LossEstimate {
  let cache = estimates.get(twin);
  if (!cache) {
    cache = new WeakMap();
    estimates.set(twin, cache);
  }
  const cached = cache.get(scenario);
  if (cached) return cached;

  const asset = twin.assets.find(({ id }) => id === scenario.assetId);
  if (!asset) throw new Error(`Missing asset for economic scenario: ${scenario.assetId}`);
  const { value, components, assumptions, downtimeDependency } = lossInputs(twin, asset, scenario);
  const frequency = frequencyInputs(twin, asset, scenario);
  const random = seededRandom(scenario.id);
  const outcomes = new Float64Array(DRAWS);
  const componentTotals = new Float64Array(components.length);
  const points = components.map(({ low, mode, high }): ThreePoint => [low, mode, high]);
  const linked = components.map(({ key }) => SEVERITY_LINKED.has(key));
  const fixed = points.map(([low, , high]) => low === high);
  const samplers = points.map(pertSampler);

  for (let i = 0; i < DRAWS; i++) {
    const together = random() < SEVERITY_CORRELATION;
    const severity = random();
    let loss = 0;
    for (let j = 0; j < points.length; j++) {
      const amount = fixed[j] ? points[j][0] : samplers[j](together && linked[j] ? severity : random());
      componentTotals[j] += amount;
      loss += amount;
    }
    outcomes[i] = loss;
  }

  components.forEach((part, index) => { part.mean = componentTotals[index] / DRAWS; });
  const lossIfManifests = components.reduce((total, { mean }) => total + mean, 0);
  const secondary = components.find(({ key }) => key === "regulatory")!.mean;
  // Frequency inputs are independent of magnitude, so their exact PERT means carry no sampling noise.
  const tef = pertMean(frequency.tef);
  const vulnerability = Math.min(1, Math.max(0, pertMean(frequency.vulnerability)));
  const lef = tef * vulnerability;
  outcomes.sort();
  const quantile = (q: number) => outcomes[Math.round((DRAWS - 1) * q)];
  const items = allocateLoss(twin, scenario, components, {
    downtimeDependency, throughputPerHour: value.throughputPerHour, unitCost: plantEconomics.unitCost.value,
  });
  const routeAssets = new Map(twin.assets.map((routeAsset) => [routeAsset.id, routeAsset]));
  const estimate: LossEstimate = {
    scenarioId: scenario.id,
    consequence: scenario.consequence,
    asset: assetIdentity(asset),
    trigger: scenario.trigger,
    lossIfManifests,
    primaryLoss: lossIfManifests - secondary,
    secondaryLoss: secondary,
    p10: quantile(0.1),
    p50: quantile(0.5),
    p90: quantile(0.9),
    frequency: {
      tef, vulnerability, lef, drivers: frequency.drivers,
      path: {
        entryLabel: frequency.path.entryLabel, basis: frequency.path.basis,
        assets: frequency.path.assetIds.flatMap((id) => {
          const routeAsset = routeAssets.get(id);
          return routeAsset ? [assetIdentity(routeAsset)] : [];
        }),
      },
    },
    annualised: lef * lossIfManifests,
    assetValue: value,
    components,
    items,
    otherLines: otherLines(components),
    assumptions: [...assumptions, ...frequency.assumptions],
  };
  cache.set(scenario, estimate);
  return estimate;
}

export interface PlantExposure {
  totalAnnualised: number;
  topScenarios: LossEstimate[];
}

const exposures = new WeakMap<Twin, WeakMap<RiskReport, PlantExposure>>();

export function plantExposure(twin: Twin, risk: RiskReport): PlantExposure {
  let cache = exposures.get(twin);
  if (!cache) {
    cache = new WeakMap();
    exposures.set(twin, cache);
  }
  const cached = cache.get(risk);
  if (cached) return cached;

  const highestByFailure = new Map<string, LossEstimate>();
  const assets = new Set(twin.assets.map(({ id }) => id));
  const scenarios = [
    ...risk.findings.filter(({ assetId }) => assets.has(assetId))
      .map((finding) => scenarioFromFinding(twin, finding)),
    ...risk.paths.filter(({ target }) => assets.has(target))
      .map((path) => scenarioFromPath(twin, path)),
  ];
  for (const scenario of scenarios) {
    const estimate = estimateLoss(twin, scenario);
    const key = JSON.stringify([scenario.assetId, scenario.consequence]);
    if (estimate.annualised > (highestByFailure.get(key)?.annualised ?? -1)) {
      highestByFailure.set(key, estimate);
    }
  }

  const ranked = [...highestByFailure.values()].sort((a, b) => b.annualised - a.annualised);
  const exposure = {
    totalAnnualised: ranked.reduce((total, { annualised }) => total + annualised, 0),
    topScenarios: ranked.slice(0, 5),
  };
  cache.set(risk, exposure);
  return exposure;
}
