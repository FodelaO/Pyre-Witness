/**
 * AI crew roster. Each member is the visible face of ONE real pipeline component.
 * Shared contract — see AGENTS.md.
 */
import { MODEL_IDS } from "@/gemini/models";

export type CrewId = "scout" | "architect" | "inspector" | "chief";

export interface CrewMember {
  id: CrewId;
  name: string;
  initials: string;
  /** What it really is. */
  role: string;
  /** Model id, or "rules engine" for the deterministic checker (it is NOT a model). */
  engine: string;
  isModel: boolean;
  /** CSS variable holding its colour. */
  colorVar: string;
}

export const CREW: Record<CrewId, CrewMember> = {
  scout: {
    id: "scout",
    name: "Scout",
    initials: "SC",
    role: "Perception: photo, link or text to device profile",
    engine: MODEL_IDS.perception,
    isModel: true,
    colorVar: "--pw-crew-scout",
  },
  architect: {
    id: "architect",
    name: "Architect",
    initials: "AR",
    role: "Reasoning: placement, risk and attack paths against the twin",
    engine: MODEL_IDS.reasoning,
    isModel: true,
    colorVar: "--pw-crew-architect",
  },
  inspector: {
    id: "inspector",
    name: "Inspector",
    initials: "IN",
    role: "Deterministic plant rules that check the Architect's answer",
    engine: "rules engine",
    isModel: false,
    colorVar: "--pw-crew-inspector",
  },
  chief: {
    id: "chief",
    name: "Chief",
    initials: "CH",
    role: "Writes the short briefing for the human",
    engine: MODEL_IDS.chief,
    isModel: true,
    colorVar: "--pw-crew-chief",
  },
};

export const CREW_ORDER: CrewId[] = ["scout", "architect", "inspector", "chief"];

/** One line in the crew activity feed. Every entry mirrors a real step. */
export interface ActivityEntry {
  id: string;
  /** Epoch ms. */
  at: number;
  crew: CrewId;
  text: string;
  /** Model id or "rules engine". */
  engine?: string;
  latencyMs?: number;
  /**
   * pipeline = a real analysis step · patrol = idle patrol round (must be labelled "idle patrol",
   * never a finding) · watch = daily threat watch · sim = simulated scenario (labelled simulated).
   */
  kind: "pipeline" | "patrol" | "watch" | "sim";
  runId?: string;
}
