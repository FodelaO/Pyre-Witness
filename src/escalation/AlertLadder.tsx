/** Shows flag, message delivery and the on-call human's decision in one compact card. */
"use client";

import { MessageSquare, PhoneCall } from "lucide-react";
import { useState } from "react";
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
  const { decision, humanResponse } = record;

  async function submit(response: HumanResponse) {
    setSending(true);
    try { await respond(record, response); } finally { setSending(false); }
  }

  return <div className="pw-es-ladder-decision">
    <span>{decision === undefined ? "Requesting decision…" : decision
      ? `Decision · ${decision.model}: ${decision.choice} (${Math.round(decision.confidence * 100)}%)`
      : "Decision unavailable"}</span>
    {humanResponse ? <strong>{humanResponse.kind === "approve" ? "Approved" : "Overridden"} · {humanResponse.action}</strong>
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

export function AlertLadder({ records, call, phoneConnected, onRing, respond }: {
  records: readonly EscalationRecord[];
  call?: EscalationRecord;
  phoneConnected: boolean;
  onRing: (record: EscalationRecord) => void;
  respond: (record: EscalationRecord, response: HumanResponse) => Promise<void>;
}) {
  const live = records.filter((record) => record.level && !record.resolvedAt && !record.dismissedAt);
  const test = live.some(({ trigger }) => trigger.test);
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

  if (!live.length) return null;
  return <section className="pw-es-alert pw-es-ladder" aria-label="Alert ladder">
    {test && <strong className="pw-es-simulation">{TEST_SCENARIO_LABEL}</strong>}
    {!test && [flag, message, high].some((entry) => entry?.trigger.kind === "simulation")
      && <strong className="pw-es-simulation">SIMULATION</strong>}
    <div className="pw-es-ladder-row"><b className="pw-es-ladder-flag" aria-hidden>!</b><strong>Flag</strong>
      <span>{flag?.trigger.assetId ?? "—"}</span></div>
    <div className="pw-es-ladder-row"><MessageSquare size={14} aria-hidden /><strong>Message</strong>
      <span role="status">{message ? `${message.trigger.assetId ?? "Line 3"} · ${messageStatus}` : "—"}</span></div>
    <div className="pw-es-ladder-row"><PhoneCall size={14} aria-hidden /><strong>Call</strong>
      <span role="status">{high ? `${high.trigger.assetId ?? "Line 3"} · ${callStatus}` : "—"}</span>
      {high && <div className="pw-es-ladder-call">
        <DecisionControls key={high.id} record={high} respond={respond} />
        {!high.ringing && !high.humanResponse && <button type="button" className="pw-es-text-button" onClick={() => onRing(high)}>
          {phoneConnected ? "Ring phone" : "Pair phone"}
        </button>}
      </div>}
    </div>
  </section>;
}
