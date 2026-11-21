/** Maps observed watch milestones to the existing floor and activity cues. */
import { assetById } from "@/twin/geometry";
import type { Twin } from "@/twin/types";
import type { CrewCue } from "./director";
import type { CrewId } from "./types";

export interface WatchCrewTarget {
  assetId: string;
  source: string;
  drill?: boolean;
}

type WatchCrewEvent = { runId: string; at: number; target: WatchCrewTarget } & (
  | { type: "matched" }
  | { type: "reviewed"; pathFound: boolean; proposal?: { title: string; engine: string }; brief: string; briefEngine?: string }
);

export function watchCrewCues(event: WatchCrewEvent, twin: Twin): CrewCue[] {
  const asset = assetById(twin, event.target.assetId);
  if (!asset) return [];
  const { x, y, area } = asset.physical;
  const point = { x, y };
  const prefix = event.target.drill ? "Simulated drill · " : "";
  const cue = (crew: CrewId, text: string, engine: string, visit = false): CrewCue => ({
    activity: { at: event.at, runId: event.runId, kind: "watch", crew, text: prefix + text, engine },
    status: "done",
    target: { ids: [asset.id], fallbackArea: area, label: asset.id },
    ...(visit && { stops: [{ point, area, beside: true }] }),
  });
  if (event.type === "matched") {
    return [cue("scout", event.target.drill ? "Reads drill scenario" : `Reads advisory · ${event.target.source}`,
      event.target.drill ? "tabletop scenario" : "inventory matching", true)];
  }

  const inspection = cue("inspector",
    event.pathFound ? `Rules engine: path to ${asset.id}` : `Rules engine: no modeled path to ${asset.id}`,
    "rules engine", true);
  const resolution = event.proposal && cue("architect", `Proposes: ${event.proposal.title}`, event.proposal.engine);
  return [
    { ...inspection, inspect: point },
    ...(resolution ? [{ ...resolution, holdMs: 850 }] : []),
    { ...cue("chief", event.brief, event.briefEngine ?? "watch summary"), briefing: true },
  ];
}
