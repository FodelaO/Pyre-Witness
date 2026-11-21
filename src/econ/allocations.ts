/** Attributes each sampled loss component to equipment without re-counting the line or its product. */
import type { Asset, Twin } from "@/twin/types";
import { plantEconomics } from "./economics";
import { formatFormulaUsd, roundHours, roundUsd } from "./format";
import type { LossComponent, LossScenario } from "./types";
import { affectedProduction, assetValuation, connectedProductVessels, heldProductLitres } from "./valuation";

export interface AssetLossRole {
  key: LossComponent["key"];
  label: string;
  amount: number;
  displayAmount: number;
  formula: string;
  hours?: number;
  dependency?: number;
  share?: number;
  shareCount?: number;
  factor?: number;
  quantity?: number;
  litres?: number;
  rate?: number;
}

export interface AssetLossAllocation {
  asset: { id: string; tag: string; name: string; kind: Asset["physical"]["kind"] };
  origin: boolean;
  installedReplacement: number;
  total: number;
  roles: AssetLossRole[];
}

interface AllocationInputs {
  downtimeDependency: number;
  throughputPerHour: number;
  unitCost: number;
  damagedAssetIds?: readonly string[];
  stoppedAssetIds?: readonly string[];
  productAssetIds?: readonly string[];
}

export function displayDowntime(hours: number, rate: number, dependency: number) {
  const shownHours = roundHours(hours);
  const shownRate = roundUsd(rate);
  const percent = Math.round(dependency * 100);
  const amount = roundUsd(shownHours * shownRate * percent / 100);
  return {
    amount,
    label: dependency < 1 ? "Throughput reduced" : "Line stopped",
    formula: `${shownHours} h × ${formatFormulaUsd(shownRate)}/h${percent === 100 ? "" : ` × ${percent}%`} ≈ ${formatFormulaUsd(amount)}`,
  };
}

function assetsById(twin: Twin, ids: readonly string[]): Asset[] {
  const wanted = new Set(ids);
  return twin.assets.filter(({ id }) => wanted.has(id));
}

function splitAmount(values: number[], total: number, visit: (index: number, amount: number, share: number) => void) {
  const weight = values.reduce((sum, value) => sum + value, 0);
  let assigned = 0;
  values.forEach((value, index) => {
    const share = value / weight;
    const amount = index === values.length - 1 ? total - assigned : total * share;
    visit(index, amount, share);
    assigned += amount;
  });
}

export function damageTargets(twin: Twin, origin: Asset, ids: readonly string[] = []): Asset[] {
  const damaged = assetsById(twin, ids);
  return damaged.length ? damaged : [origin];
}

export function allocateLoss(
  twin: Twin, scenario: LossScenario, components: readonly LossComponent[], inputs: AllocationInputs,
): AssetLossAllocation[] {
  const origin = twin.assets.find(({ id }) => id === scenario.assetId);
  if (!origin) return [];
  const rows = new Map<string, AssetLossAllocation>();
  const replacement = (asset: Asset) => assetValuation(twin, asset).replacement;
  function row(asset: Asset): AssetLossAllocation {
    const prior = rows.get(asset.id);
    if (prior) return prior;
    const result: AssetLossAllocation = {
      asset: { id: asset.id, tag: asset.id, name: asset.name, kind: asset.physical.kind },
      origin: asset.id === scenario.assetId,
      installedReplacement: replacement(asset),
      total: 0,
      roles: [],
    };
    rows.set(asset.id, result);
    return result;
  }

  function add(asset: Asset, role: AssetLossRole) {
    const allocation = row(asset);
    allocation.roles.push(role);
    allocation.total += role.amount;
  }

  row(origin);
  const stoppedIds = inputs.stoppedAssetIds ?? scenario.simulation?.stoppedAssetIds ?? [];
  const damageIds = inputs.damagedAssetIds ?? scenario.simulation?.damagedAssetIds ?? [];
  const productIds = inputs.productAssetIds ?? scenario.simulation?.productAssetIds ?? [];
  const hasDowntime = components.some(({ key, mean }) => key === "downtime" && mean > 0);
  const evacuationStop = scenario.consequence === "ammoniaRelease" && inputs.downtimeDependency === 1;
  const affected = hasDowntime ? affectedProduction(twin, origin, stoppedIds, evacuationStop) : assetsById(twin, stoppedIds);
  for (const part of components) {
    const { key, mean } = part;
    if (key === "recovery" || key === "regulatory") continue;
    if (key === "downtime" && !hasDowntime) {
      // A standby machine can keep the line producing while a known equipment stop is serviced.
      for (const asset of affected) add(asset, {
        key, label: "Equipment stopped", amount: 0, displayAmount: 0, formula: "$0 line margin lost",
      });
      continue;
    }
    if (mean <= 0) continue;

    switch (key) {
      case "downtime": {
        const assets = affected.length ? affected : [origin];
        const { downtimeDependency: dependency, throughputPerHour: rate } = inputs;
        const hours = mean / (rate * dependency);
        const pool = displayDowntime(hours, rate, dependency);
        // This is one line, with one margin stream. Per-equipment shares attribute the shared loss.
        splitAmount(assets.map(() => 1), mean, (index, amount, share) => {
          const displayAmount = roundUsd(pool.amount * share);
          add(assets[index], {
            key, label: dependency < 1 ? "Throughput reduced" : "Production stopped",
            amount, displayAmount, hours, dependency, share, shareCount: assets.length, rate,
            formula: `1/${assets.length} · ${formatFormulaUsd(displayAmount)}`,
          });
        });
        break;
      }
      case "replacement": {
        const assets = damageTargets(twin, origin, damageIds);
        const installed = assets.map((asset) => row(asset).installedReplacement);
        splitAmount(installed, mean, (index, amount) => {
          const cost = installed[index];
          const factor = amount / cost;
          const percent = Math.round(factor * 100);
          const shownCost = roundUsd(cost);
          const displayAmount = roundUsd(shownCost * percent / 100);
          add(assets[index], {
            key, label: "Damage / repair", amount, displayAmount, factor,
            formula: `${formatFormulaUsd(shownCost)} installed × ${percent}% damage ≈ ${formatFormulaUsd(displayAmount)}`,
          });
        });
        break;
      }
      case "product": {
        const rate = inputs.unitCost;
        const bottles = mean / rate;
        const volume = plantEconomics.bottleLitres.value;
        const named = assetsById(twin, productIds);
        const isRecall = scenario.consequence === "productRecall";
        const graphVessels = !isRecall && !named.length ? connectedProductVessels(twin, [origin, ...affected]) : [];
        const vessels = isRecall ? [] : (named.length ? named : graphVessels).filter((asset) => heldProductLitres(asset) > 0);
        const capacities = vessels.map((asset) => heldProductLitres(asset) / volume);
        const heldBottles = Math.min(bottles, capacities.reduce((sum, value) => sum + value, 0));

        function bookProduct(asset: Asset, amount: number, label: string) {
          const quantityBottles = amount / rate;
          const litres = quantityBottles * volume;
          const shownBottles = Math.round(quantityBottles);
          const shownRate = roundUsd(rate);
          const displayAmount = roundUsd(shownBottles * shownRate);
          add(asset, {
            key, label: `${label} · ${Math.round(litres).toLocaleString("en-US")} L`,
            amount, displayAmount, quantity: quantityBottles, litres, rate,
            formula: `${shownBottles.toLocaleString("en-US")} bottles × ${formatFormulaUsd(shownRate)}/bottle ≈ ${formatFormulaUsd(displayAmount)}`,
          });
        }

        const vesselLoss = heldBottles * rate;
        if (heldBottles > 0) splitAmount(capacities, vesselLoss, (index, amount) =>
          bookProduct(vessels[index], amount, "Batch held"));
        const remainder = mean - vesselLoss;
        if (remainder > 0) {
          const holder = isRecall ? origin : named.find((asset) => !vessels.includes(asset))
            ?? affected.find(({ physical }) => physical.kind === "rotary_filler") ?? origin;
          bookProduct(holder, remainder, isRecall ? "Affected recall lots" : "Line product held");
        }
        break;
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.asset.id.localeCompare(b.asset.id));
}
