/** Indexes the real pipeline events that supply work cues in the 3D view. */
import type { DisplayedVisual } from "@/crew/crewStore";
import type { CrewVisual, EvidenceChip } from "@/crew/director";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { Assessment, ObjectClass, PipelineEvent, SelfCheckPhase } from "@/pipeline/types";
import { assetById, type Point } from "@/twin/geometry";
import type { AttackPath, Twin } from "@/twin/types";

type Event<T extends PipelineEvent["type"]> = Extract<PipelineEvent, { type: T }>;

export interface WorkTrace {
  path: AttackPath;
  assessment: Assessment | null;
}

interface WorkCheck {
  event: Event<"selfcheck.done">;
  assessment: Assessment | null;
}

export interface WorkRun {
  start: Event<"run.started"> | null;
  reading: boolean;
  evidence: boolean;
  writing: boolean;
  briefing: Event<"summary.done"> | null;
  proposalCheck: WorkCheck | null;
  checks: Map<SelfCheckPhase, WorkCheck>;
  paths: Map<string, WorkTrace>;
}

function pathKey(phase: SelfCheckPhase, id: string) {
  return `${phase}:${id}`;
}

export function readWorkRun(events: readonly PipelineEvent[]): WorkRun {
  const work: WorkRun = {
    start: null, reading: false, evidence: false, writing: false, briefing: null, proposalCheck: null,
    checks: new Map(), paths: new Map(),
  };
  let assessment: Assessment | null = null;
  let stopped = false;
  for (const event of events) {
    if (event.type === "run.started") {
      work.start = event;
      work.reading = work.evidence = work.writing = false;
      work.briefing = assessment = null;
      work.proposalCheck = null;
      work.paths.clear();
      work.checks.clear();
      stopped = false;
      continue;
    }
    if (stopped || event.runId !== work.start?.runId) continue;
    switch (event.type) {
      case "perception.started":
        work.reading = true;
        break;
      case "perception.done":
        work.reading = false;
        work.evidence = true;
        break;
      case "reasoning.done":
      case "revision.done":
        assessment = event.assessment;
        work.evidence = false;
        work.proposalCheck = null;
        break;
      case "selfcheck.path": {
        const phase = event.phase ?? (assessment ? "recommendation" : "as-dropped");
        work.paths.set(pathKey(phase, event.path.id), { path: event.path, assessment: phase === "as-dropped" ? null : assessment });
        break;
      }
      case "selfcheck.done": {
        const phase = event.phase ?? (assessment ? "recommendation" : "as-dropped");
        const check = { event, assessment: phase === "as-dropped" ? null : assessment };
        work.checks.set(phase, check);
        if (phase !== "as-dropped") work.proposalCheck = check;
        break;
      }
      case "summary.started":
        work.writing = true;
        work.evidence = false;
        break;
      case "summary.done":
        work.writing = false;
        work.briefing = event;
        break;
      case "run.error":
        work.reading = work.evidence = work.writing = false;
        stopped = true;
        break;
    }
  }
  return work;
}

export function displayedTrace(work: WorkRun, effect: CrewVisual | undefined) {
  return effect?.kind === "trace" ? work.paths.get(pathKey(effect.phase, effect.id)) : undefined;
}

/** Use the checked placement for a virtual move while the real equipment stays at its drop point. */
export function checkedPosition(twin: Twin, assetId: string | null, assessment: Assessment | null, objectClass?: ObjectClass): Point | undefined {
  const asset = assetId ? assetById(twin, assetId) : undefined;
  return asset && assessment ? atRecommendedPlacement(twin, asset, assessment, objectClass)?.physical : undefined;
}

export function traceDuration(visual: DisplayedVisual, hops: number) {
  const first = visual.walk?.waypoints[0];
  return first && visual.walk ? visual.walk.end.at - first.at : Math.min(1100, 280 * hops);
}

/** One readable line per source on the floor. The transcript retains the complete evidence. */
export function evidencePreview(chips: readonly EvidenceChip[]): EvidenceChip[] {
  const statements = chips.filter(({ kind }) => kind !== "port" && kind !== "radio");
  const label = statements.find(({ kind }) => kind === "label")
    ?? statements.find(({ text }) => /\b(?:label|sticker)\b/i.test(text)) ?? statements[0];
  return [
    ...(label ? [label] : []),
    ...(["port", "radio"] as const).flatMap((kind) => {
      const items = [...new Set(chips.filter((chip) => chip.kind === kind).map(({ text }) => text))];
      return items.length ? [{ kind, text: items.join(", ") }] : [];
    }),
  ];
}
