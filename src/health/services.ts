/** Describes the monitored services without importing server-side code. */
import { MODEL_IDS } from "@/gemini/models";

export interface HealthService {
  id: string;
  label: string;
  job: string;
  model: string;
  costly: boolean;
  minIntervalMs?: number;
  onDemand?: boolean;
}

export const SERVICES = [
  { id: "decisions", label: "Decisions API", job: "Gates captures and triages threat alerts.", model: MODEL_IDS.decisions, costly: false },
  { id: "perception", label: "Scout", job: "Identifies equipment in photos and walkthroughs.", model: MODEL_IDS.perception, costly: false },
  { id: "reasoning", label: "Architect", job: "Recommends placement and assesses risk.", model: MODEL_IDS.reasoning, costly: false },
  { id: "briefing", label: "Chief", job: "Summarizes placement and threat findings.", model: MODEL_IDS.chief, costly: false },
  { id: "speech", label: "Text to speech", job: "Reads Chief’s briefing aloud.", model: MODEL_IDS.tts, costly: false },
  { id: "live", label: "Live voice", job: "Lets engineers talk to Chief in real time.", model: MODEL_IDS.live, costly: false },
  { id: "image", label: "Fit preview", job: "Renders placement previews in the plant.", model: MODEL_IDS.image, costly: true, minIntervalMs: 15 * 60_000 },
  { id: "files_video", label: "Files API", job: "Stages walkthrough video for twin modeling.", model: "Gemini Files API", costly: false },
  { id: "managed_agent", label: "Managed agents", job: "Runs Antigravity’s threat-watch comparison.", model: MODEL_IDS.managedAgent, costly: true, minIntervalMs: 30 * 60_000, onDemand: true },
  { id: "feeds", label: "Threat feeds", job: "Supplies public advisories to Threat Watch.", model: "CISA KEV · CISA ICS · NCSC", costly: false },
] as const satisfies readonly HealthService[];

export interface HealthResult extends HealthService {
  ok: boolean;
  latencyMs: number;
  detail: string;
  checkedAt: string;
}

export interface ServiceHealth {
  service: HealthService;
  status: "unknown" | "ok" | "failing" | "skipped";
  last: HealthResult | null;
  skipped: "on-demand" | "cooldown" | null;
  nextEligibleAt: string | null;
}

export interface HealthRun {
  startedAt: string;
  checkedAt: string;
  all: boolean;
  services: ServiceHealth[];
}

export interface HealthSnapshot {
  checkedAt: string | null;
  refreshing: boolean;
  services: ServiceHealth[];
  history: HealthRun[];
}
