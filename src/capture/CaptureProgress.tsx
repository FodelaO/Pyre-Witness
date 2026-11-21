/** Draw crew progress and label failures using the pipeline's actual stage. */
import type { CSSProperties } from "react";
import { CREW, CREW_ORDER, type CrewId } from "@/crew/types";
import { useRunStore } from "@/pipeline/runStore";
import type { PipelineEventType, PipelineStage } from "@/pipeline/types";

const stageCrew: Record<PipelineStage, CrewId> = {
  link: "scout", gate: "scout", perception: "scout", reasoning: "architect",
  selfcheck: "inspector", revision: "architect", summary: "chief",
};

const finishedEvent: Record<CrewId, PipelineEventType> = {
  scout: "perception.done", architect: "reasoning.done", inspector: "selfcheck.done", chief: "summary.done",
};

const stageLabels: Record<string, string> = {
  submission: "Submission",
  link: "Link lookup",
  gate: "Input screening",
  perception: CREW.scout.name,
  reasoning: CREW.architect.name,
  selfcheck: `${CREW.inspector.name} · ${CREW.inspector.engine}`,
  revision: `${CREW.architect.name} · Revision`,
  summary: CREW.chief.name,
  unknown: "Analysis",
};

export const captureStageLabel = (stage: string) => stageLabels[stage] ?? stage;

export default function CaptureProgress() {
  const status = useRunStore((state) => state.status);
  const stage = useRunStore((state) => state.stage);
  const events = useRunStore((state) => state.events);
  const activeStage = status === "running" ? stage : null;
  const active = activeStage && stageCrew[activeStage];
  const proposal = events.findLastIndex(({ type }) => type === "reasoning.done" || type === "revision.done");
  const check = events.findLastIndex(({ type }) => type === "selfcheck.done");
  const inspectorLabel = `${CREW.inspector.name} · ${CREW.inspector.engine} · ${proposal < 0 ? "as dropped" : "recommendation"}`;
  return (
    <div className="pw-capture-progress" aria-label="Analysis progress">
      <span className="pw-capture-sr-only" role="status">{activeStage === "selfcheck" ? inspectorLabel : activeStage ? captureStageLabel(activeStage) : "Starting analysis"}</span>
      {CREW_ORDER.map((id) => {
        const crew = CREW[id];
        const done = status === "running" && (id === "inspector" ? proposal >= 0 && check > proposal
          : events.some((event) => event.type === finishedEvent[id]));
        return (
          <span key={id} title={id === "inspector" ? inspectorLabel : crew.name}
            data-state={active === id ? "active" : done ? "done" : "waiting"}
            style={{ "--crew-color": `var(${crew.colorVar})` } as CSSProperties}>
            {crew.name}
          </span>
        );
      })}
    </div>
  );
}
