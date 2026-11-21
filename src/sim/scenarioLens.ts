/** Places each tabletop exercise in its primary pipeline lens. */
import type { SimScenarioId } from "./types";

export const scenarioLens: Record<SimScenarioId, "material" | "data"> = {
  cip: "material",
  ammonia: "material",
  chiller: "material",
  carbonation: "material",
  ransomware: "data",
  wireless: "data",
};
