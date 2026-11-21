/** Registry of deterministic plant tabletop scenarios. */
import type { ScenarioDefinition, ScenarioId, SimScenarioId } from "../types";
import { ammonia } from "./ammonia";
import { carbonation } from "./carbonation";
import { chiller } from "./chiller";
import { cip } from "./cip";
import { ransomware } from "./ransomware";
import { wireless } from "./wireless";

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = { cip, ammonia, ransomware, wireless, chiller };

export const ALL_SCENARIOS: Record<SimScenarioId, ScenarioDefinition<SimScenarioId>> = { ...SCENARIOS, carbonation };
