/** Keeps the rules check at the drop separate from the latest checked recommendation. */
import type { RunState } from "@/pipeline/runStore";
import type { PipelineEvent } from "@/pipeline/types";

export function placementChecks(events: readonly PipelineEvent[]) {
  const firstProposal = events.findIndex((event) => event.type === "reasoning.done" || event.type === "revision.done");
  const proposal = events.findLastIndex((event) => event.type === "reasoning.done" || event.type === "revision.done");
  const dropped = events.find((event, index) => event.type === "selfcheck.done" && (
    event.phase === "as-dropped" || (event.phase === undefined && (firstProposal < 0 || index < firstProposal))
  ));
  const recommendation = proposal < 0 ? undefined : events.findLast((event, index) => index > proposal
    && event.type === "selfcheck.done" && event.phase !== "as-dropped");
  return {
    dropped: dropped?.type === "selfcheck.done" ? dropped.result : null,
    recommendation: recommendation?.type === "selfcheck.done" ? recommendation.result : null,
  };
}

export function captureWithDataImpact({ runId, events, profile, assessment }: Pick<RunState, "runId" | "events" | "profile" | "assessment">): string | null {
  const started = events[0];
  if (!runId || started?.type !== "run.started" || started.mode === "reassess" || profile?.object_class === "passive_object") return null;
  const modeled = assessment && (assessment.attack_paths.length > 0 || assessment.risks.some(({ kind }) => kind === "cyber"));
  const verified = events.some((event) => event.type === "selfcheck.path" || (event.type === "selfcheck.done"
    && (event.result.paths.length > 0 || event.result.findings.some(({ kind }) => kind === "cyber"))));
  return modeled || verified ? runId : null;
}
