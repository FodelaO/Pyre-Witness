/** Summarizes alert tiers in the crew dock and opens the active tier's details. */
"use client";

import { MessageSquare, PhoneCall } from "lucide-react";
import { useId, useRef, useState } from "react";
import { formatUsd } from "@/econ/format";
import { ACTIONS, type AlertAction, type HumanResponse } from "./decision";
import { useSlackStatuses } from "./slackClient";
import { TEST_SCENARIO_LABEL } from "./testScenario";
import type { AlertLevel, EscalationRecord } from "./types";

function DecisionControls({ record, respond }: {
  record: EscalationRecord;
  respond: (record: EscalationRecord, response: HumanResponse) => Promise<void>;
}) {
  const [choice, setChoice] = useState<AlertAction | "">("");
  const [choosing, setChoosing] = useState(false);
  const [sending, setSending] = useState(false);
  const submitted = useRef(false);
  const { decision, humanResponse } = record;

  async function submit(response: HumanResponse) {
    submitted.current = true;
    setSending(true);
    try { await respond(record, response); } finally { setSending(false); }
  }

  return <div className="pw-es-ladder-decision">
    <span>{decision === undefined ? "Requesting decision…" : decision
      ? `Decision · ${decision.model}: ${decision.choice} (${Math.round(decision.confidence * 100)}%)`
      : "Decision unavailable"}</span>
    {humanResponse ? <strong tabIndex={-1} ref={(receipt) => {
      if (receipt && submitted.current) {
        if (document.activeElement === document.body || receipt.closest("section")?.contains(document.activeElement)) receipt.focus();
        submitted.current = false;
      }
    }}>{humanResponse.kind === "approve" ? "Approved" : "Overridden"} · {humanResponse.action}</strong>
      : decision !== undefined && <div className="pw-es-ladder-actions">
        <button type="button" className="pw-es-text-button" disabled={!decision || sending}
          onClick={() => { if (decision) void submit({ kind: "approve", action: decision.choice }); }}>Approve</button>
        <button type="button" className="pw-es-text-button" disabled={sending} onClick={() => {
          if (!choosing) setChoosing(true);
          else if (choice) void submit({ kind: "override", action: choice });
        }}>Override</button>
        {choosing && <select aria-label="Override action" value={choice} onChange={(event) => {
          const next = ACTIONS.find((action) => action === event.target.value);
          setChoice(next ?? "");
        }}>
          <option value="">Choose action</option>
          {ACTIONS.map((action) => <option key={action}>{action}</option>)}
        </select>}
      </div>}
  </div>;
}

export function AlertLadder({ records, call, phoneConnected, openId, onOpen, onRing, respond, testRunning }: {
  records: readonly EscalationRecord[];
  call?: EscalationRecord;
  phoneConnected: boolean;
  openId?: string;
  onOpen: (id: string | null) => void;
  onRing: (record: EscalationRecord) => void;
  respond: (record: EscalationRecord, response: HumanResponse) => Promise<void>;
  testRunning: boolean;
}) {
  const detailId = useId();
  const live = records.filter((record) => record.level && !record.resolvedAt && !record.dismissedAt);
  const test = testRunning || live.some(({ trigger }) => trigger.test);
  const latest = (level: AlertLevel) => live.findLast((entry) => entry.level === level && !!entry.trigger.test === test);
  const flag = latest(1);
  const message = latest(2);
  const high = call?.level === 3 && !call.resolvedAt && !call.dismissedAt && !!call.trigger.test === test ? call : latest(3);
  const slack = useSlackStatuses((state) => message ? state[message.id] : undefined);
  const messageStatus = message?.messageStatus === "sent" || slack === "sent" ? "Message sent"
    : message?.messageStatus === "pending" || slack === "pending" ? "Sending…"
      : message?.messageStatus === "failed" || (slack === "failed" && phoneConnected) ? "Message failed"
        : "Waiting for phone";
  const callStatus = high?.humanResponse ? "Responded" : high?.answered ? "Answered" : high?.ringing ? "Ringing"
    : high?.decision === undefined ? "Preparing decision…" : phoneConnected ? "Ready" : "Waiting for phone";

  const tiers = [
    { name: "Flag", record: flag, status: "Flagged", icon: <b className="pw-es-ladder-flag" aria-hidden>!</b> },
    { name: "Message", record: message, status: slack && slack !== "pending" ? `${messageStatus} · Slack ${slack}` : messageStatus,
      icon: <MessageSquare size={13} aria-hidden /> },
    { name: "Call", record: high, status: callStatus, icon: <PhoneCall size={13} aria-hidden /> },
  ];
  const selected = tiers.find(({ record }) => record && record.id === openId);
  const record = selected?.record;

  return <section className="pw-es-ladder" aria-label="Alert ladder">
    <div className="pw-es-ladder-row">
      {tiers.map(({ name, record, status, icon }) => {
        const asset = record?.trigger.assetId ?? "Line 3";
        const open = !!record && record.id === openId;
        const label = record ? `${name} · ${asset} · ${status}` : `${name} · Idle`;
        return <button key={name} type="button" className="pw-es-tier" data-level={record?.level}
          aria-label={label} title={label} aria-disabled={!record} aria-expanded={record ? open : undefined}
          aria-controls={open ? detailId : undefined} onClick={() => { if (record) onOpen(open ? null : record.id); }}>
          {icon}{record && <span>{asset}</span>}
        </button>;
      })}
    </div>
    {test ? <strong className="pw-es-simulation">{TEST_SCENARIO_LABEL}</strong>
      : tiers.some(({ record }) => record?.trigger.kind === "simulation") && <strong className="pw-es-simulation">SIMULATION</strong>}
    {record && selected && <section id={detailId} className="pw-es-popover pw-es-ladder-detail" aria-label={`${selected.name} details`}>
      <strong>{selected.name} · {record.trigger.assetId ?? "Line 3"}</strong>
      <span role="status">{selected.status}</span>
      <span className="pw-es-note">{record.trigger.loss === null ? "Loss estimate unavailable"
        : `${formatUsd(record.trigger.loss)} est. · simulated plant`}</span>
      <span>{record.trigger.title}</span>
      {record.level === 3 && <>
        <DecisionControls key={record.id} record={record} respond={respond} />
        {!record.ringing && !record.humanResponse && <button type="button" className="pw-es-text-button" onClick={() => onRing(record)}>
          {phoneConnected ? "Ring phone" : "Pair phone"}
        </button>}
      </>}
    </section>}
  </section>;
}
