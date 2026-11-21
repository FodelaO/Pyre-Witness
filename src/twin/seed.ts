/** Seed twin for Bebidas del Norte, Line 3: a fictional cola bottling plant. */
import { SEED_AREAS } from "./seed/areas";
import { BLENDING_ASSETS } from "./seed/blending";
import { CONTROL_ASSETS } from "./seed/control";
import { ENTERPRISE_ASSETS } from "./seed/enterprise";
import { SEED_ENTRY_POINTS } from "./seed/entry";
import { FILLER_ASSETS } from "./seed/filler";
import { SEED_CONDUITS } from "./seed/network";
import { PACKAGING_ASSETS } from "./seed/packaging";
import { SYRUP_ASSETS } from "./seed/syrup";
import { UTILITIES_ASSETS } from "./seed/utilities";
import { WATER_ASSETS } from "./seed/water";
import type { Asset, Twin } from "./types";

export { SEED_AREAS, SEED_CONDUITS, SEED_ENTRY_POINTS };

export const SEED_ASSETS: Asset[] = [
  ...WATER_ASSETS,
  ...SYRUP_ASSETS,
  ...BLENDING_ASSETS,
  ...FILLER_ASSETS,
  ...PACKAGING_ASSETS,
  ...UTILITIES_ASSETS,
  ...CONTROL_ASSETS,
  ...ENTERPRISE_ASSETS,
];

export const SEED_TWIN: Twin = {
  plant: {
    name: "Bebidas del Norte",
    line: "Line 3",
    fictional: true,
    canvas: { w: 1600, h: 1000 },
    building: { x: 40, y: 70, w: 1520, h: 790 },
  },
  areas: SEED_AREAS,
  assets: SEED_ASSETS,
  conduits: SEED_CONDUITS,
  entryPoints: SEED_ENTRY_POINTS,
};
