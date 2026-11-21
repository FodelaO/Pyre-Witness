/** Low-order temperature and pressure response for normal plant telemetry. */
import type { Asset } from "@/twin/types";
import { connected, NOMINAL, noise, reading } from "./model";

const GLYCOL_DENSITY_KG_M3 = 1040;
const GLYCOL_HEAT_CAPACITY_KJ_KG_K = 3.73;
const PRODUCT_HEAT_CAPACITY_KJ_KG_K = 3.95;

export function thermalReadings(
  assets: ReadonlyMap<string, Asset>, elapsed: number, seconds: number, beverageKgh: number, co2Kgh: number,
): Record<string, number> {
  const recirculates = connected(assets, "EV-401", "TK-402", "glycol")
    && connected(assets, "TK-402", "P-402", "glycol")
    && connected(assets, "P-402", "CC-301", "glycol")
    && connected(assets, "CC-301", "EV-401", "glycol");
  const activeCompressor = ["C-1", "C-2"].some((id) => connected(assets, id, "EC-401", "ammonia")
    && connected(assets, "EV-401", id, "ammonia"));
  const availableCooling = activeCompressor && connected(assets, "EC-401", "R-401", "ammonia")
    && connected(assets, "R-401", "EV-401", "ammonia");
  const settle = (asset: string, tag: string, nominal: number, target: number, lag: number) => {
    const current = reading(assets, asset, tag) ?? nominal;
    return current + (target - current) * -Math.expm1(-seconds / lag);
  };
  const trim = (tag: string, nominal: number, amplitude: number) => nominal + noise(tag, elapsed) * amplitude;
  const glycolM3h = recirculates ? trim("FT-402", NOMINAL.glycolM3h, 0.7) : 0;
  const glycolSupply = settle("TT-401", "TT-401", -4, availableCooling ? trim("TT-401", -4, 0.22) : 20, 110);
  const warmCola = trim("TT-302", 22, 0.32);
  const coldTarget = recirculates ? Math.min(warmCola, trim("TT-301", glycolSupply + 7, 0.16)) : warmCola;
  const coldCola = settle("TT-301", "TT-301", 3, coldTarget, 24);
  const productLoadKw = beverageKgh * PRODUCT_HEAT_CAPACITY_KJ_KG_K * Math.max(0, warmCola - coldCola) / 3600;
  const glycolRise = glycolM3h > 0
    ? (productLoadKw + 28) * 3600 / (glycolM3h * GLYCOL_DENSITY_KG_M3 * GLYCOL_HEAT_CAPACITY_KJ_KG_K)
    : 0;
  const glycolReturn = settle("EV-401", "TT-407", 1, glycolSupply + glycolRise, 22);
  const tankTarget = trim("PT-403", 20 + 0.12 * Math.sin(elapsed / 430), 0.13) - 0.055 * co2Kgh / NOMINAL.co2Kgh;
  return {
    "TT-302": warmCola,
    "TT-301": coldCola,
    "TT-402": settle("TT-402", "TT-402", 3, coldCola, 7),
    "TT-401": glycolSupply,
    "TT-407": glycolReturn,
    "FT-402": glycolM3h,
    "TT-411": settle("EC-401", "TT-411", 35, availableCooling ? trim("TT-411", 35, 0.6) : 24, 60),
    "TT-412": settle("EV-401", "TT-412", -10, availableCooling ? glycolSupply - 6 : 19, 60),
    "PT-411": trim("PT-411", 2.9, 0.06),
    "PT-412": trim("PT-412", 13.5, 0.18),
    "PT-403": settle("TK-401", "PT-403", 20, tankTarget, 65),
    "PT-405": trim("PT-405", 5, 0.10),
    "PT-301": trim("PT-301", 2.6, 0.05),
    "PT-401": trim("PT-401", 2.3, 0.05),
    "TT-203": trim("TT-203", 22, 0.35),
    "TT-201": trim("TT-201", 62, 0.5),
  };
}
