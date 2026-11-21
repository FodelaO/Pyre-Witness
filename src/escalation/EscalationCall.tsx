/** Hosts the escalation controls in the crew dock while retaining the shell's error boundary. */
"use client";

import { Bell, Check, ChevronDown, FlaskConical, MessageSquare, Phone, PhoneCall, QrCode, Settings2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatUsd } from "@/econ/format";
import { Equipment, FOOTPRINT } from "@/equipment";
import { AlertLadder } from "./AlertLadder";
import { monitorEscalations } from "./monitor";
import { PhoneContactDialog } from "./PhoneContactDialog";
import { BASELINE_INCREASE, validThresholds } from "./policy";
import { monitorSlackAlerts, useSlackStatuses } from "./slackClient";
import { useEscalationStore } from "./store";
import { TelephoneCard } from "./TelephoneCard";
import { TEST_SCENARIO_LABEL } from "./testScenario";
import type { EscalationRecord, Thresholds } from "./types";
import { useCallPairing } from "./useCallPairing";
import { useEscalationPhone } from "./useEscalationPhone";
import "./escalation.css";
import "./telephony.css";

const RESPONDER_KEY = "pw:escalation-responder-label";

function Time({ at }: { at: number }) {
  return <time dateTime={new Date(at).toISOString()}>{new Date(at).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })}</time>;
}

function AssetMark({ kind }: { kind: EscalationRecord["trigger"]["assetKind"] }) {
  if (!kind) return <Bell className="pw-es-fallback-symbol" size={27} aria-hidden />;
  const { w, h } = FOOTPRINT[kind];
  return <svg viewBox={`${-w * 0.72} ${-h * 0.72} ${w * 1.44} ${h * 1.44}`} aria-hidden>
    <Equipment kind={kind} compact />
  </svg>;
}

function ThresholdForm({ thresholds, onSave, label, onLabel }: {
  thresholds: Thresholds; onSave: (value: Thresholds) => void; label: string; onLabel: (text: string) => void;
}) {
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = { loss: Number(data.get("loss")), risk: Number(data.get("risk")) };
    if (validThresholds(next)) onSave(next);
    onLabel(String(data.get("responder") ?? ""));
  }

  return <form className="pw-es-form" onSubmit={save}>
    <div className="pw-es-fields">
      <label>Loss threshold (USD)<input name="loss" type="number" inputMode="numeric" required min={1} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={thresholds.loss} /></label>
      <label>Risk score threshold<input name="risk" type="number" inputMode="numeric" required min={1} max={100} step={1} defaultValue={thresholds.risk} /></label>
    </div>
    <span className="pw-es-note">Also arms at +{BASELINE_INCREASE} points above baseline.</span>
    <label>Paired responder label <input name="responder" maxLength={28} placeholder="Optional" defaultValue={label} /></label>
    <button className="pw-es-button" type="submit"><Check size={14} aria-hidden /> Save thresholds</button>
  </form>;
}

function PairingCard({ pairing, connected, canRenew, onRenew }: {
  pairing: NonNullable<ReturnType<typeof useCallPairing>["pairing"]>;
  connected: boolean;
  canRenew: boolean;
  onRenew: () => void;
}) {
  const [address, setAddress] = useState("");
  const [qr, setQr] = useState<{ url: string; src: string }>();
  const host = pairing.addresses.includes(address) ? address
    : pairing.addresses.includes(location.hostname) ? location.hostname : pairing.addresses[0];
  const path = `/call/${pairing.connection.code}`;
  const url = host ? `http://${host}:${pairing.port}${path}` : new URL(path, location.origin).href;

  useEffect(() => {
    let alive = true;
    void import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 240, margin: 2 }))
      .then((src) => { if (alive) setQr({ url, src }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [url]);

  return <div className="pw-es-pair">
    <a href={url} className="pw-es-qr" target="_blank" rel="noreferrer" aria-label="Open paired phone link">
      {qr?.url === url ? <img src={qr.src} alt="On-call pairing QR code" width={88} height={88} /> : <QrCode size={32} aria-hidden />}
    </a>
    <div className="pw-es-pair-copy">
      <strong data-connected={connected}>{connected ? "Phone paired" : host ? "Scan on paired phone" : "Open call link"}</strong>
      <span className="pw-es-note">{host ? "Use the same Wi-Fi" : "LAN address unavailable"}</span>
      <a className="pw-es-link" href={url} target="_blank" rel="noreferrer">{url}</a>
      {pairing.addresses.length > 1 && <select aria-label="Call network address" value={host} onChange={(event) => setAddress(event.target.value)}>
        {pairing.addresses.map((ip) => <option key={ip} value={ip}>{ip}</option>)}
      </select>}
      {canRenew && <button type="button" className="pw-es-text-button" onClick={onRenew}>New link</button>}
    </div>
  </div>;
}

function AlertCard({ record, busy, phoneConnected, telephone, onRing, onDismiss }: {
  record: EscalationRecord; busy: boolean; phoneConnected: boolean; telephone: ReactNode;
  onRing: () => void; onDismiss: () => void;
}) {
  const { trigger, approved, acknowledged, answered, ringing, dialed, resolvedAt } = record;
  const slackStatus = useSlackStatuses((statuses) => statuses[record.id]);
  const done = approved ?? acknowledged;
  const status = approved ? "Approved" : acknowledged ? "Acknowledged"
    : resolvedAt ? "Resolved" : answered ? "Briefing opened" : dialed ? "Call tapped"
      : ringing ? (phoneConnected ? "Ringing" : "Waiting for paired phone") : "Threshold crossed";
  const when = done?.at ?? resolvedAt ?? answered?.at ?? dialed?.at ?? ringing?.at ?? record.raisedAt;

  return <section className="pw-es-alert" aria-label="Escalation alert" data-approved={!!approved}>
    <div className="pw-es-alert-head" role="status">
      {done || resolvedAt ? <Check size={14} aria-hidden /> : <Bell size={14} aria-hidden />}
      <strong>{status}</strong>
      {trigger.test ? <span className="pw-es-simulation">{TEST_SCENARIO_LABEL}</span>
        : trigger.kind === "simulation" && <span className="pw-es-simulation">SIMULATION</span>}
      <Time at={when} />
      {(done || resolvedAt) && <button type="button" className="pw-es-icon" aria-label="Dismiss escalation card" onClick={onDismiss}><X size={15} /></button>}
    </div>
    <div className="pw-es-evidence">
      <div className="pw-es-asset"><AssetMark kind={trigger.assetKind} /></div>
      <div className="pw-es-evidence-copy">
        <div className="pw-es-value">
          {trigger.kind === "risk" ? <><strong>{Number(trigger.score.toFixed(1))}</strong><span>plant risk</span></>
            : trigger.loss !== null && <><strong>{formatUsd(trigger.loss)}</strong><span>est.{trigger.kind === "finding" && " · per event"}</span></>}
        </div>
        <div className="pw-es-location"><strong>{trigger.assetId ?? "Line 3"}</strong>{trigger.room && <span> at {trigger.room}</span>}</div>
      </div>
    </div>
    <div className="pw-es-finding">{trigger.title}</div>
    {trigger.loss !== null && <div className="pw-es-note">
      {trigger.kind === "risk" && <>{formatUsd(trigger.loss)} est. · </>}assumed (simulated plant)
    </div>}
    {done && <div className="pw-es-receipt">{done.actor} · <Time at={done.at} />{approved && <> · {record.action}</>}</div>}
    {dialed && <div className="pw-es-receipt" role="status"><PhoneCall size={13} aria-hidden />
      <span>Call tapped on the paired phone</span> <Time at={dialed.at} />
    </div>}
    {!resolvedAt && !done && !dialed && (!phoneConnected || !ringing) &&
      <button type="button" className="pw-es-button pw-es-call-button" disabled={busy} onClick={onRing}>
      {phoneConnected ? <PhoneCall size={16} aria-hidden /> : <QrCode size={16} aria-hidden />}
      {busy ? "Opening phone link…" : phoneConnected ? "Ring paired phone" : "Pair a phone to call you"}
    </button>}
    {telephone}
    <div className="pw-es-slack" role="status">
      {slackStatus && slackStatus !== "pending" && <><MessageSquare size={12} aria-hidden /> Slack {slackStatus}</>}
    </div>
    <details className="pw-es-script">
      <summary>Read call script <ChevronDown size={13} aria-hidden /></summary>
      <div>{record.script}</div>
    </details>
  </section>;
}

export default function EscalationCall() {
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<"settings" | "pairing" | { alertId: string } | null>(null);
  const controls = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState("");
  const records = useEscalationStore((state) => state.records);
  const thresholds = useEscalationStore((state) => state.thresholds);
  const phone = useEscalationPhone(records);
  const { pairing, snapshot, busy, error, preparePairing, ring, respond, record, activeRecord } = useCallPairing(label, phone.contact);

  useEffect(monitorSlackAlerts, []);
  useEffect(monitorEscalations, []);
  useLayoutEffect(() => {
    setDock(document.querySelector<HTMLElement>(".pw-crew-stage-dock [data-escalation-dock]"));
  }, []);
  useEffect(() => {
    try { setLabel(localStorage.getItem(RESPONDER_KEY) ?? ""); } catch { /* The paired browser still has an identifier. */ }
  }, []);
  useEffect(() => {
    if (!panel || phone.dialog) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !controls.current?.contains(event.target)) setPanel(null);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [panel, phone.dialog]);

  const phoneConnected = snapshot?.phoneConnected ?? false;

  function saveLabel(value: string) {
    setLabel(value.trim());
    try { localStorage.setItem(RESPONDER_KEY, value.trim()); } catch { /* Session label still works. */ }
  }

  function closePanel() {
    (controls.current?.querySelector<HTMLButtonElement>(".pw-es-tier[aria-expanded='true']") ?? chip.current)?.focus();
    setPanel(null);
  }

  function openPairing() {
    chip.current?.focus();
    setPanel("pairing");
    void preparePairing();
  }

  return dock && createPortal(<div className="pw-es" ref={controls} onKeyDown={(event) => {
    if (event.key === "Escape" && panel && !phone.dialog) {
      event.preventDefault();
      closePanel();
    }
  }}>
    <button type="button" ref={chip} className="pw-es-chip" aria-label="Escalation thresholds" aria-expanded={panel === "settings"} onClick={() => {
      setPanel(panel === "settings" ? null : "settings");
    }}>
      <Bell size={14} aria-hidden />
      <span>{record ? "Escalation" : "Armed"}</span>
      <span className="pw-es-chip-values">{formatUsd(thresholds.loss)} / {thresholds.risk}</span>
      <Settings2 size={13} aria-hidden />
    </button>
    {panel === "settings" && <section className="pw-es-popover" aria-label="Escalation settings">
      <ThresholdForm thresholds={thresholds} onSave={(value) => {
        useEscalationStore.getState().setThresholds(value);
        closePanel();
      }} label={label} onLabel={saveLabel} />
      <div className="pw-es-phone-settings">
        <button className="pw-es-text-button" type="button" onClick={phone.openPhone}>
          <Phone size={14} aria-hidden /> {phone.contact ? "Edit phone" : "Add your phone"}
        </button>
        {phone.maskedNumber && <span className="pw-es-phone-mask">{phone.maskedNumber}</span>}
      </div>
      <button className="pw-es-text-button pw-es-test-action" type="button" onClick={() => {
        if (phone.toggleTest()) closePanel();
      }}><FlaskConical size={15} aria-hidden /> {phone.testRunning ? "Clear test" : "Run test alert"}</button>
      <button className="pw-es-text-button" type="button" disabled={busy} onClick={openPairing}>
        <QrCode size={15} aria-hidden /> {phoneConnected ? "Show paired phone" : "Pair phone"}
      </button>
      {phone.testError && <p className="pw-es-note" role="status">{phone.testError}</p>}
    </section>}
    <AlertLadder records={records} call={record} phoneConnected={phoneConnected} respond={respond}
      testRunning={phone.testRunning} openId={panel && typeof panel === "object" ? panel.alertId : undefined}
      onOpen={(id) => setPanel(id ? { alertId: id } : null)} onRing={(high) => {
      if (phoneConnected) void ring(high);
      else openPairing();
    }} />
    {record && record.level === undefined && <AlertCard record={record} busy={busy} phoneConnected={phoneConnected}
      telephone={<TelephoneCard mode={phone.mode} maskedNumber={phone.maskedNumber} receipt={record.telephoneCalls?.at(-1)}
        resolved={!!record.resolvedAt} onCall={() => phone.callNow(record.id)}
        onDevice={() => phone.callFromDevice(record.id)} />} onRing={() => {
      if (phoneConnected) { setPanel(null); void ring(record); }
      else openPairing();
    }} onDismiss={() => {
      useEscalationStore.getState().update(record.id, { dismissedAt: Date.now() }); setPanel(null);
    }} />}
    {panel === "pairing" && <section className="pw-es-popover" aria-label="Phone pairing">
      <div className="pw-es-popup-head"><span>On-call link</span><button type="button" className="pw-es-icon" aria-label="Close pairing" onClick={closePanel}><X size={15} /></button></div>
      {pairing ? <PairingCard pairing={pairing} connected={phoneConnected}
        canRenew={!activeRecord || !!(activeRecord.approved || activeRecord.acknowledged || activeRecord.resolvedAt || activeRecord.humanResponse)}
        onRenew={() => void preparePairing(true)} />
        : busy && <div className="pw-es-note">Opening phone link…</div>}
    </section>}
    {error && <div className="pw-es-error" role="status">{error}</div>}
    {phone.dialog && <PhoneContactDialog contact={phone.contact} onSave={phone.savePhone}
      onRemove={() => phone.savePhone(null)} onDismiss={phone.closePhone} />}
  </div>, dock);
}
