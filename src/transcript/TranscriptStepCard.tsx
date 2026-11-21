/** Renders each recorded step with a readable payload preview and copyable original data. */
"use client";

import { useState } from "react";
import Image from "next/image";
import { Braces, Check, Copy, ShieldCheck, Terminal } from "lucide-react";
import type { TranscriptEntry } from "@/pipeline/types";
import type { AttackPath, RuleFinding } from "@/twin/types";
import { CREW_LABEL, ORIGIN_LABEL, STAGE_LABEL, timestamp, type TranscriptStep } from "./transcriptSteps";

function RawPayload({ value, label = "Raw JSON" }: { value: unknown; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<"ready" | "done" | "failed">("ready");
  const json = expanded ? JSON.stringify(value, null, 2) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(json ?? "");
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="pw-transcript-raw">
      <button type="button" className="pw-transcript-raw-trigger" aria-expanded={expanded}
        onClick={() => { setExpanded(!expanded); setCopied("ready"); }}>
        <Braces size={14} aria-hidden="true" /> {label}
      </button>
      {expanded && <div className="pw-transcript-raw-content">
        <button type="button" className="pw-transcript-action" onClick={() => void copy()}>
          {copied === "done" ? <Check size={14} /> : <Copy size={14} />}
          {copied === "done" ? "Copied" : copied === "failed" ? "Retry copy" : "Copy JSON"}
        </button>
        <pre tabIndex={0}>{json}</pre>
      </div>}
    </div>
  );
}

function ReportedPath({ path }: { path: AttackPath }) {
  return (
    <div className="pw-transcript-report">
      <p><strong>{path.title}</strong></p>
      {path.impact && <p>{path.impact}</p>}
      <ol>
        {path.steps.map((step, index) => <li key={index}>
          <code>{step.from} → {step.to}</code>
          <span className="pw-transcript-key">{step.technique?.id ?? step.via}</span>
          {step.technique && <span>{step.technique.name}</span>}
          {step.note && <p>{step.note}</p>}
        </li>)}
      </ol>
    </div>
  );
}

function Finding({ finding }: { finding: RuleFinding }) {
  return <li className="pw-transcript-finding">
    <div><code>{finding.ruleId}</code> <strong>{finding.title}</strong> <code>{finding.assetId}</code></div>
    <p>{finding.detail}</p>
    {finding.references.length > 0 && <p className="pw-transcript-muted">{finding.references.join(" · ")}</p>}
    {finding.technique && <p><code>{finding.technique.id}</code> {finding.technique.name}</p>}
    {finding.fix && <p>{finding.fix}</p>}
  </li>;
}

function ProviderRecord({ entry }: { entry: TranscriptEntry }) {
  const { request, response, thoughts, note } = entry;
  return <>
    {note && <p className="pw-transcript-verbatim">{note}</p>}
    {request && <details className="pw-transcript-detail">
      <summary>Request{request.attachments !== undefined ? ` · ${request.attachments} attachments` : ""}</summary>
      {request.schema && <p className="pw-transcript-muted">{request.schema}</p>}
      {request.system !== undefined && <div><strong>System instruction</strong><p className="pw-transcript-verbatim">{request.system}</p></div>}
      {request.text !== undefined && <div><strong>Request text</strong><p className="pw-transcript-verbatim">{request.text}</p></div>}
    </details>}
    {thoughts && thoughts.length > 0 && <details className="pw-transcript-detail">
      <summary>Thought summaries ({thoughts.length})</summary>
      <ol>{thoughts.map((thought, index) => <li className="pw-transcript-verbatim" key={index}>{thought}</li>)}</ol>
    </details>}
    {response?.text !== undefined && <details className="pw-transcript-detail">
      <summary>Raw response text</summary><p className="pw-transcript-verbatim">{response.text}</p>
    </details>}
    {response?.json !== undefined && <RawPayload value={response.json} label="Raw response JSON" />}
  </>;
}

function StepBody({ step }: { step: TranscriptStep }) {
  const { event, providerRecord } = step;
  if (providerRecord) return <ProviderRecord entry={providerRecord} />;
  if (!event) return step.text ? <p>{step.text}</p> : null;
  switch (event.type) {
    case "run.started":
      return <p>{event.input.label}{event.dropPoint && <span className="pw-transcript-key">{event.dropPoint.area}</span>}</p>;
    case "run.error":
      return <p className="pw-transcript-error">
        {event.stage !== "unknown" && <span className="pw-transcript-key">{STAGE_LABEL[event.stage]}</span>}{event.message}
      </p>;
    case "link.started": return <p className="pw-transcript-muted">{event.url}</p>;
    case "link.fetched": return <p>{event.snapshot.title}</p>;
    case "gate.done": {
      const { answers, reason, proceed } = event.gate;
      const rows = Object.entries(answers);
      const unavailable = proceed && reason?.startsWith("Gate unavailable");
      return <>
        {reason && <p>{reason}</p>}
        <p className={unavailable ? "pw-transcript-attention" : "pw-transcript-muted"}>
          {unavailable ? "Gate unavailable: continued" : proceed ? "Admitted" : "Stopped"}
        </p>
        {rows.length > 0 && <ul className="pw-transcript-data">
          {rows.map(([key, answer]) => <li key={key}>
            <code>{key}</code> <strong>{answer.value}</strong> <span>confidence {answer.confidence}</span>
          </li>)}
        </ul>}
      </>;
    }
    case "perception.done":
      return <p><strong>{event.profile.device_type}</strong> {[event.profile.vendor, event.profile.model].filter(Boolean).join(" · ")}</p>;
    case "reasoning.started":
      return event.candidateArea ? <p><span className="pw-transcript-key">{event.candidateArea}</span></p> : null;
    case "reasoning.thought":
    case "summary.done":
      return <p className="pw-transcript-verbatim">{event.text}</p>;
    case "reasoning.done":
    case "revision.done":
      return <>
        <p><strong>{event.assessment.physical_placement.area}</strong> <span className="pw-transcript-key">Purdue L{event.assessment.placement.level}</span></p>
        <p>{event.assessment.placement.why}</p>
        {step.revisedFields && <p className="pw-transcript-muted">
          Changed assessment fields {step.revisedFields.length ? step.revisedFields.join(", ") : "· none"}
        </p>}
      </>;
    case "selfcheck.path":
      return <ReportedPath path={event.path} />;
    case "selfcheck.done": {
      const { passed, findings, paths, disagreements } = event.result;
      return <>
        <p><strong>{passed ? "Passed" : "Flagged"}</strong>
          <span className="pw-transcript-key">{findings.length} findings · {paths.length} paths</span>
        </p>
        {findings.length > 0 && <ul className="pw-transcript-data">{findings.map((finding, index) =>
          <Finding key={`${finding.ruleId}/${finding.assetId}/${index}`} finding={finding} />)}</ul>}
        {disagreements.length > 0 && <details className="pw-transcript-detail">
          <summary>Disagreements ({disagreements.length})</summary>
          <ol>{disagreements.map((text, index) => <li key={index}>{text}</li>)}</ol>
        </details>}
      </>;
    }
    case "revision.started": return <p className="pw-transcript-verbatim">{event.reason}</p>;
    default: return null;
  }
}

function StepIdentity({ crew }: { crew: TranscriptStep["crew"] }) {
  if (crew === "gate") return <span className="pw-transcript-avatar"><ShieldCheck size={17} /></span>;
  if (crew === "system") return <span className="pw-transcript-avatar"><Terminal size={16} /></span>;
  return <Image className="pw-transcript-avatar" src={`/crew/${crew}.png`} alt="" width={36} height={36} unoptimized />;
}

export default function TranscriptStepCard({ step, highlighted }: { step: TranscriptStep; highlighted?: boolean }) {
  const { at, crew, engine, origin, usage, thinkingLevel, latencyMs } = step;
  const metrics = [
    latencyMs !== undefined ? `${latencyMs.toLocaleString()} ms` : undefined,
    usage?.inputTokens !== undefined ? `${usage.inputTokens.toLocaleString()} in` : undefined,
    usage?.outputTokens !== undefined ? `${usage.outputTokens.toLocaleString()} out` : undefined,
    usage?.thoughtTokens !== undefined ? `${usage.thoughtTokens.toLocaleString()} thought` : undefined,
    usage?.totalTokens !== undefined ? `${usage.totalTokens.toLocaleString()} total tokens` : undefined,
    thinkingLevel ? `${thinkingLevel} thinking` : undefined,
  ].filter(Boolean);
  return (
    <article className="pw-transcript-step" data-step-id={step.id} data-crew={crew}
      data-highlighted={highlighted || undefined} tabIndex={0} aria-label={step.title}>
      <StepIdentity crew={crew} />
      <div className="pw-transcript-step-card">
        <div className="pw-transcript-step-header">
          <strong>{CREW_LABEL[crew]}</strong>
          <span className="pw-transcript-origin" data-origin={origin}>{ORIGIN_LABEL[origin]}</span>
          {at !== undefined && <time dateTime={new Date(at).toISOString()}>{timestamp(at)}</time>}
        </div>
        {(engine || metrics.length > 0) && <p className="pw-transcript-metrics">
          {[engine, ...metrics].filter(Boolean).join(" · ")}
        </p>}
        <h3>{step.title}</h3>
        <StepBody step={step} />
        {step.raw !== undefined && <RawPayload value={step.raw} />}
      </div>
    </article>
  );
}
