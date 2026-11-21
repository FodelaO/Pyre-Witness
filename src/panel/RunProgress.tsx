/** Four crew stages and the Decisions API verdict, read from pipeline events. */
"use client";

import { Activity, CircleAlert, ScanLine } from "lucide-react";
import type { CSSProperties } from "react";
import { captureErrorMessage } from "@/capture/captureError";
import { CREW, CREW_ORDER, type CrewId } from "@/crew/types";
import type { RunState } from "@/pipeline/runStore";
import type { GateResult, PipelineEvent, PipelineEventType } from "@/pipeline/types";
import { formatNumber, PanelHeading, percent, TextPreview } from "./PanelParts";

const EVENT_CREW: Partial<Record<PipelineEventType, CrewId>> = {
  "perception.started": "scout",
  "perception.done": "scout",
  "reasoning.started": "architect",
  "reasoning.done": "architect",
  "selfcheck.started": "inspector",
  "selfcheck.done": "inspector",
  "revision.started": "architect",
  "revision.done": "architect",
  "summary.started": "chief",
  "summary.done": "chief",
};

type CrewStep = { engine?: string; ms?: number; working?: boolean };

function crewStages(events: readonly PipelineEvent[]) {
  const stages: Record<CrewId, CrewStep> = { scout: {}, architect: {}, inspector: {}, chief: {} };
  for (const event of events) {
    const id = EVENT_CREW[event.type];
    if (!id) continue;
    const step = stages[id];
    if ("model" in event) step.engine = event.model;
    if ("engine" in event) step.engine = event.engine;
    step.working = !("latencyMs" in event);
    if ("latencyMs" in event) step.ms = (step.ms ?? 0) + event.latencyMs;
  }
  return stages;
}

function crewForStage(stage: string | null): CrewId | undefined {
  switch (stage) {
    case "perception": return "scout";
    case "reasoning":
    case "revision": return "architect";
    case "selfcheck": return "inspector";
    case "summary": return "chief";
    default: return undefined;
  }
}

function GateMeter({ gate, showReason }: { gate: GateResult; showReason: boolean }) {
  const deviceAnswer = gate.answers.is_device;
  const probability = deviceAnswer?.type === "noul" && typeof deviceAnswer.value === "number" ? percent(deviceAnswer.value) : undefined;
  return (
    <div className="pw-panel-gate" data-proceed={gate.proceed}>
      <div className="pw-panel-gate-head">
        <span><ScanLine size={13} aria-hidden />Decisions API</span>
        <strong>{gate.proceed ? "Proceed" : "Stopped"}</strong>
      </div>
      {probability !== undefined && deviceAnswer && (
        <div className="pw-panel-gate-data pw-mono">
          <span>P(device) {probability}%</span>
          <meter min={0} max={100} value={probability} aria-label="Probability of a device" />
          <span>{percent(deviceAnswer.confidence)}% confidence</span>
        </div>
      )}
      {showReason && gate.reason && <TextPreview text={gate.reason} label="Gate reason" />}
    </div>
  );
}

type ProgressProps = Pick<RunState, "status" | "stage" | "events" | "gate" | "error">;

export function RunError({ message }: { message: string }) {
  return <p className="pw-panel-error" role="alert"><CircleAlert size={15} aria-hidden />{captureErrorMessage(message)}</p>;
}

export function RunProgress({ status, stage, events, gate, error }: ProgressProps) {
  const stages = crewStages(events);
  const failed = crewForStage(error?.stage ?? null);
  const reassess = events.some((event) => event.type === "run.started" && event.mode === "reassess");
  const proposed = events.some((event) => event.type === "reasoning.done");
  return (
    <>
      <PanelHeading icon={Activity}>Analysis run</PanelHeading>
      <ul className="pw-panel-crew" aria-label="Crew progress">
        {CREW_ORDER.map((id) => {
          const member = CREW[id];
          const step = stages[id];
          const { engine, ms } = step;
          const working = status === "running" && step.working;
          const revising = working && id === "architect" && stage === "revision";
          const phase = failed === id ? "error" : working ? "working" : ms !== undefined ? "done" : "waiting";
          const time = ms === undefined ? null : ms < 1000 ? `${formatNumber(ms)} ms` : `${formatNumber(ms / 1000)} s`;
          const detail = phase === "error" ? "Error" : revising ? "Revising"
            : working ? (id === "inspector" ? proposed ? "Recommendation" : "As dropped" : "Working")
              : id === "inspector" && !proposed && time ? "As dropped" : time ?? (status === "running" ? "Pending" : "Skipped");
          return (
            <li key={id} style={{ "--pw-panel-crew-color": `var(${member.colorVar})` } as CSSProperties}
              data-phase={phase} aria-current={working ? "step" : undefined} title={time ? `${member.role} · ${time} measured` : member.role}>
              <div className="pw-panel-crew-head">
                <span className="pw-panel-crew-dot" aria-hidden="true" /><strong>{member.name}</strong>
                <span className="pw-mono">{detail}</span>
              </div>
              <span className="pw-panel-crew-engine pw-mono" title={engine ?? member.engine}>{engine ?? member.engine}</span>
            </li>
          );
        })}
      </ul>
      {gate && !reassess && <GateMeter gate={gate} showReason={error?.message !== gate.reason} />}
    </>
  );
}
