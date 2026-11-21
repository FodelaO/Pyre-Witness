/** A bounded mass ledger for water treatment, syrup, blending, filling and CO₂ supply. */
import type { Asset, Medium } from "@/twin/types";
import { clamp, connected, NOMINAL, noise, online, tankCapacityKg, tankMasses, TANK_IDS } from "./model";
import type { ProcessState, TankId, TankMasses } from "./model";

const SIMPLE_SYRUP_KGH = NOMINAL.syrupWaterKgh + NOMINAL.sugarKgh;
const SYRUP_MASS_FRACTION = NOMINAL.syrupKgh / NOMINAL.blendKgh;
const CONCENTRATE_MASS_FRACTION = NOMINAL.concentrateKgh / NOMINAL.syrupKgh;
const BATCH_WATER_FRACTION = NOMINAL.syrupWaterKgh / SIMPLE_SYRUP_KGH;
const PRODUCT_KG_M3 = NOMINAL.blendKgh / NOMINAL.fillerM3h;
const CO2_KG_PER_STANDARD_M3 = 1.977;

export interface ProcessBalance {
  initialKg: number;
  finalKg: number;
  externalInKg: number;
  externalOutKg: number;
  residualKg: number;
  roFeedKg: number;
  roPermeateKg: number;
  roRejectKg: number;
  treatedToBlendKg: number;
  treatedToSyrupKg: number;
  rinseKg: number;
  simpleSyrupKg: number;
  concentrateDoseKg: number;
  syrupToBlendKg: number;
  blendInKg: number;
  beverageKg: number;
  bottles: number;
  dissolvedCo2Kg: number;
  purgeCo2Kg: number;
  rawWaterInKg: number;
  concentrateInKg: number;
}

function fillLatch(level: number, start: number, stop: number, refilling: boolean): boolean {
  return refilling ? level < stop : level <= start;
}

export function balanceFlows(assets: ReadonlyMap<string, Asset>, previous: ProcessState, dtSeconds: number) {
  const elapsedSeconds = previous.elapsedSeconds + dtSeconds;
  const hours = dtSeconds / 3600;
  const mass = tankMasses(assets);
  const initialKg = total(mass);
  const capacity = (id: TankId) => tankCapacityKg(assets, id);
  const room = (id: TankId) => Math.max(0, capacity(id) - mass[id]);
  const stock = (id: TankId) => Math.max(0, mass[id]);
  const level = (id: TankId) => 100 * mass[id] / (capacity(id) || 1);
  const has = (from: string, to: string, medium: Medium) => connected(assets, from, to, medium);

  // Draw finished product before accepting upstream transfers, making room in each vessel.
  const canFill = has("BL-301", "CC-301", "product") && has("CC-301", "P-301", "product")
    && has("P-301", "FIL-3", "product");
  const beverageKg = canFill ? Math.min(NOMINAL.blendKgh * hours, stock("BL-301")) : 0;
  const beverageM3 = beverageKg / PRODUCT_KG_M3;
  mass["BL-301"] -= beverageKg;

  const canDistributeWater = has("TK-102", "P-102", "water");
  const canBlend = canDistributeWater && has("P-102", "BL-301", "water")
    && has("TK-203", "P-203", "syrup") && has("P-203", "BL-301", "syrup");
  const blendTrim = 1 + clamp((60 - level("BL-301")) * 0.004, -0.02, 0.02)
    + 0.009 * Math.sin(elapsedSeconds / 84);
  const directWaterFraction = NOMINAL.blendWaterKgh / NOMINAL.blendKgh;
  const blendInKg = canBlend ? Math.min(
    NOMINAL.blendKgh * blendTrim * hours,
    room("BL-301"),
    stock("TK-102") / directWaterFraction,
    stock("TK-203") / SYRUP_MASS_FRACTION,
  ) : 0;
  const treatedToBlendKg = blendInKg * directWaterFraction;
  const syrupToBlendKg = blendInKg * SYRUP_MASS_FRACTION;
  mass["BL-301"] += blendInKg;
  mass["TK-102"] -= treatedToBlendKg;
  mass["TK-203"] -= syrupToBlendKg;

  const canFinishSyrup = has("TK-201", "P-201", "syrup") && has("P-201", "TK-203", "syrup")
    && has("TK-202", "P-202", "syrup") && has("P-202", "TK-203", "syrup");
  const finishingTrim = 1 + clamp((62 - level("TK-203")) * 0.004, -0.02, 0.02)
    + 0.012 * Math.sin(elapsedSeconds / 140);
  const simpleSyrupFraction = 1 - CONCENTRATE_MASS_FRACTION;
  const finishedSyrupKg = canFinishSyrup ? Math.min(
    NOMINAL.syrupKgh * finishingTrim * hours,
    room("TK-203"),
    stock("TK-201") / simpleSyrupFraction,
    stock("TK-202") / CONCENTRATE_MASS_FRACTION,
  ) : 0;
  const concentrateDoseKg = finishedSyrupKg * CONCENTRATE_MASS_FRACTION;
  const simpleSyrupKg = finishedSyrupKg - concentrateDoseKg;
  mass["TK-203"] += finishedSyrupKg;
  mass["TK-201"] -= simpleSyrupKg;
  mass["TK-202"] -= concentrateDoseKg;

  const canBatch = canDistributeWater && has("P-102", "TK-201", "water");
  const batchTrim = 1 + clamp((64 - level("TK-201")) * 0.004, -0.02, 0.02)
    + 0.014 * Math.sin(elapsedSeconds / 93);
  const batchKg = canBatch ? Math.min(
    SIMPLE_SYRUP_KGH * batchTrim * hours,
    room("TK-201"),
    stock("TK-102") / BATCH_WATER_FRACTION,
  ) : 0;
  const treatedToSyrupKg = batchKg * BATCH_WATER_FRACTION;
  const sugarKg = batchKg - treatedToSyrupKg;
  mass["TK-201"] += batchKg;
  mass["TK-102"] -= treatedToSyrupKg;

  const canRinse = beverageKg > 0 && canDistributeWater && has("P-102", "V-103", "water");
  const rinseKg = canRinse ? Math.min(NOMINAL.rinseKgh * beverageM3 / NOMINAL.fillerM3h, stock("TK-102")) : 0;
  mass["TK-102"] -= rinseKg;

  const canTreat = has("TK-101", "P-101", "water") && has("P-101", "RO-101", "water")
    && has("RO-101", "UV-101", "water") && has("UV-101", "TK-102", "water");
  const roTrim = clamp((68 - level("TK-102")) * 0.13, -0.6, 0.6)
    + 0.42 * Math.sin(elapsedSeconds / 78) + 0.10 * noise("RO-101", elapsedSeconds);
  const roFeedKg = canTreat ? Math.min(
    (NOMINAL.roFeedM3h + roTrim) * 1000 * hours,
    stock("TK-101"),
    room("TK-102") / NOMINAL.roRecovery,
  ) : 0;
  const roPermeateKg = roFeedKg * NOMINAL.roRecovery;
  const roRejectKg = roFeedKg - roPermeateKg;
  mass["TK-101"] -= roFeedKg;
  mass["TK-102"] += roPermeateKg;

  // These tanks receive intermittent deliveries rather than telemetry-only level noise.
  const rawWaterRefilling = fillLatch(level("TK-101"), 71, 73, previous.rawWaterRefilling);
  const rawWaterInKg = rawWaterRefilling && online(assets, "TK-101") ? Math.min(34_000 * hours, room("TK-101")) : 0;
  mass["TK-101"] += rawWaterInKg;
  const concentrateRefilling = fillLatch(level("TK-202"), 51.7, 53.2, previous.concentrateRefilling);
  const concentrateInKg = concentrateRefilling && online(assets, "TK-202") ? Math.min(195 * hours, room("TK-202")) : 0;
  mass["TK-202"] += concentrateInKg;

  const canCarbonate = has("TK-401", "HX-401", "co2") && has("HX-401", "CC-301", "co2");
  const co2Kg = canCarbonate ? Math.min(NOMINAL.co2Kgh * beverageM3 / NOMINAL.fillerM3h, stock("TK-401")) : 0;
  const dissolvedCo2Kg = co2Kg * (NOMINAL.co2Volumes * CO2_KG_PER_STANDARD_M3 * NOMINAL.fillerM3h / NOMINAL.co2Kgh);
  const purgeCo2Kg = co2Kg - dissolvedCo2Kg;
  const dissolvedCo2Volumes = beverageM3 > 0 ? dissolvedCo2Kg / (beverageM3 * CO2_KG_PER_STANDARD_M3) : 0;
  mass["TK-401"] -= co2Kg;

  const finalKg = total(mass);
  const externalInKg = rawWaterInKg + sugarKg + concentrateInKg;
  const externalOutKg = roRejectKg + rinseKg + beverageKg + co2Kg;
  const balance: ProcessBalance = {
    initialKg,
    finalKg,
    externalInKg,
    externalOutKg,
    residualKg: finalKg - initialKg - externalInKg + externalOutKg,
    roFeedKg,
    roPermeateKg,
    roRejectKg,
    treatedToBlendKg,
    treatedToSyrupKg,
    rinseKg,
    simpleSyrupKg,
    concentrateDoseKg,
    syrupToBlendKg,
    blendInKg,
    beverageKg,
    bottles: beverageM3 * 1000 / NOMINAL.bottleL,
    dissolvedCo2Kg,
    purgeCo2Kg,
    rawWaterInKg,
    concentrateInKg,
  };
  const state: ProcessState = { elapsedSeconds, rawWaterRefilling, concentrateRefilling };
  return { mass, balance, beverageM3, dissolvedCo2Volumes, state };
}

function total(masses: TankMasses): number {
  return TANK_IDS.reduce((sum, id) => sum + masses[id], 0);
}
