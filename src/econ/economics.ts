/** Assumed economics, installed cost benchmarks and FAIR inputs for the fictional Line 3. */
import type { EquipmentKind } from "@/twin/types";

export interface Assumption<T = number> {
  value: T;
  unit: string;
  basis: "assumed (simulated plant)" | "published";
  source?: string;
}

export type ThreePoint = readonly [low: number, mode: number, high: number];

export type Consequence = "device" | "processStop" | "productHold" | "ammoniaRelease" | "productRecall";

function assumed<T>(value: T, unit: string): Assumption<T> {
  return { value, unit, basis: "assumed (simulated plant)" };
}

function range(value: ThreePoint, unit: string): Assumption<ThreePoint> {
  return assumed(value, unit);
}

export const plantEconomics = {
  // Seed rotary filler specification, copied as the fallback for variants of this fictional twin.
  nameplateBph: assumed(36_000, "bottles/hr"),
  oee: assumed(0.78, "good-bottle fraction"),
  contributionMargin: assumed(0.19, "USD/bottle"),
  bottleLitres: assumed(0.5, "L/bottle"),
  shiftsPerDay: assumed(2, "shifts/day"),
  hoursPerShift: assumed(8, "hr/shift"),
  bottlingBatch: assumed(12_000, "bottles/batch"),
  recallBatches: range([4, 18, 65], "batches"),
  unitCost: assumed(0.24, "USD/bottle"),
  blendedResponseRate: assumed(180, "USD/person-hour"),
} as const;

/**
 * U.S. reference benchmark only. The twin assumes its own composite liability ranges.
 * Read on https://www.osha.gov/penalties on 2026-11-21: "Willful or Repeated $165,514 per violation".
 */
export const penaltyBenchmark: Assumption = {
  value: 165_514,
  unit: "USD per willful or repeat violation, U.S. OSHA maximum",
  basis: "published",
  source: "https://www.osha.gov/penalties",
};

interface ConsequenceEconomics {
  downtimeHours: Assumption<ThreePoint>;
  damageFactor: Assumption<ThreePoint>;
  productFraction: Assumption<ThreePoint>;
  responseHours: Assumption<ThreePoint>;
  regulatoryLiability: Assumption<ThreePoint>;
}

const noLiability = range([0, 0, 0], "USD/event");
const noProductLoss = range([0, 0, 0], "inventory fraction");

export const consequenceEconomics: Record<Consequence, ConsequenceEconomics> = {
  device: {
    downtimeHours: range([0, 0, 0], "scheduled production hr"),
    damageFactor: range([0.05, 0.25, 0.85], "installed cost fraction"),
    productFraction: noProductLoss,
    responseHours: range([4, 12, 26], "person-hr"),
    regulatoryLiability: noLiability,
  },
  processStop: {
    downtimeHours: range([2, 12, 40], "scheduled production hr"),
    damageFactor: range([0.01, 0.13, 0.52], "installed cost fraction"),
    productFraction: range([0.025, 0.18, 0.5], "inventory fraction"),
    responseHours: range([12, 34, 76], "person-hr"),
    regulatoryLiability: noLiability,
  },
  productHold: {
    downtimeHours: range([3, 14, 48], "scheduled production hr"),
    damageFactor: range([0, 0.05, 0.3], "installed cost fraction"),
    productFraction: range([0.3, 0.7, 1], "inventory fraction"),
    responseHours: range([22, 75, 180], "person-hr"),
    regulatoryLiability: noLiability,
  },
  ammoniaRelease: {
    downtimeHours: range([32, 120, 336], "scheduled production hr"),
    damageFactor: range([0.1, 0.48, 1], "installed cost fraction"),
    productFraction: range([0.1, 0.45, 1], "inventory fraction"),
    responseHours: range([110, 350, 1_000], "person-hr"),
    // Assumed emergency remediation, third-party claims and possible enforcement liability.
    regulatoryLiability: range([175_000, 950_000, 4_500_000], "USD/event"),
  },
  productRecall: {
    downtimeHours: range([24, 78, 240], "scheduled production hr"),
    damageFactor: range([0.03, 0.18, 0.7], "installed cost fraction"),
    productFraction: range([0.65, 0.9, 1], "inventory fraction"),
    responseHours: range([160, 510, 1_500], "person-hr"),
    // Assumed recall logistics and third-party/legal liability, exclusive of scrapped goods and labor.
    regulatoryLiability: range([250_000, 1_400_000, 6_800_000], "USD/event"),
  },
};

type SizingUnit = "L" | "m³/h" | "kg/h" | "kW" | "bottles/h" | "trays/pallet" | "drawing scale";

interface EquipmentCost {
  base: Assumption;
  reference?: Assumption & { unit: SizingUnit };
}

function installed(value: number, referenceSize?: number, referenceUnit?: SizingUnit): EquipmentCost {
  return {
    base: assumed(value, "USD installed"),
    ...(referenceSize && referenceUnit
      ? { reference: { ...assumed(referenceSize, referenceUnit), unit: referenceUnit } }
      : {}),
  };
}

export const equipmentCosts: Record<EquipmentKind, EquipmentCost> = {
  vertical_tank: installed(52_000, 10_000, "L"),
  bullet_tank: installed(92_000, 6_000, "L"),
  agitated_tank: installed(98_000, 6_000, "L"),
  pump: installed(18_000, 20, "m³/h"),
  valve: installed(7_500),
  instrument: installed(4_200),
  ro_skid: installed(160_000, 20, "m³/h"),
  uv_reactor: installed(31_000, 20, "m³/h"),
  carbo_cooler: installed(220_000, 420, "kW"),
  heat_exchanger: installed(48_000, 200, "kW"),
  rotary_filler: installed(780_000, 36_000, "bottles/h"),
  conveyor: installed(33_000, 1, "drawing scale"),
  labeler: installed(180_000, 36_000, "bottles/h"),
  palletizer: installed(320_000, 48, "trays/pallet"),
  chiller_compressor: installed(190_000, 500, "kW"),
  condenser: installed(128_000, 680, "kW"),
  plc_cabinet: installed(31_000),
  hmi: installed(6_500),
  workstation: installed(3_500),
  server_rack: installed(29_000),
  firewall: installed(16_500),
  network_switch: installed(5_800),
  wifi_ap: installed(1_850),
  ip_camera: installed(1_250),
  gateway: installed(3_600),
  laptop: installed(2_300),
  phone: installed(900),
  usb_drive: installed(55),
  generic_device: installed(1_650),
};

export const valuationEconomics = {
  sizeExponent: assumed(0.65, "sizing exponent"),
  minSizeRatio: assumed(0.08, "reference-size ratio"),
  maxSizeRatio: assumed(8, "reference-size ratio"),
  stainlessPremium: assumed(1.16, "installed cost multiplier"),
  washdownPremium: assumed(1.18, "installed cost multiplier"),
  hazardPremium: assumed(1.25, "installed cost multiplier"),
  liquidDensityProxy: assumed(1_000, "kg/m³"),
  kilogramsPerHourReference: assumed(200, "kg/h"),
  processEquipmentBase: assumed(72_000, "USD installed"),
  processEquipmentSize: assumed(1, "drawing scale"),
  switchDisruption: assumed(0.45, "line fraction"),
  operatorDisruption: assumed(0.25, "line fraction"),
  instrumentationDisruption: assumed(0.35, "line fraction"),
  areaDisruption: assumed(0.15, "local line fraction"),
} as const;

export const FREQUENCY = {
  exposure: {
    internet: range([2, 12, 40], "events/yr"),
    cloud: range([0.25, 2, 8], "events/yr"),
    remote: range([0.25, 2, 7], "events/yr"),
    // A radio attack needs someone on site, so it ranks below every internet-borne route.
    rf: range([0.05, 0.5, 3], "events/yr"),
    visitor: range([0.04, 0.4, 2], "events/yr"),
    removable: range([0.03, 0.4, 2], "events/yr"),
    internal: range([0.012, 0.08, 0.35], "events/yr"),
  },
  conversion: {
    // Ordering: confirmed exploitation > default credentials (no exploit needed) > severity score alone.
    kev: range([0.24, 0.58, 0.86], "probability"),
    cvssBase: range([0.01, 0.05, 0.2], "probability"),
    cvssMaximum: range([0.08, 0.3, 0.6], "probability"),
    credential: range([0.15, 0.4, 0.7], "probability"),
    unmanaged: range([0.035, 0.15, 0.4], "probability"),
    compliance: range([0.006, 0.04, 0.17], "probability"),
    generic: range([0.02, 0.12, 0.34], "probability"),
  },
  controls: {
    enforcedConduit: assumed(0.35, "TEF multiplier"),
    lateralHop: assumed(0.7, "TEF multiplier"),
    protection: assumed(0.75, "vulnerability multiplier"),
    approvedMitigation: assumed(0.55, "vulnerability multiplier"),
  },
} as const;
