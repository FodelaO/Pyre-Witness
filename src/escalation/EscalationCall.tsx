/** Fixed desktop alert instrument with threshold settings, phone pairing and call receipts. */
"use client";

import { Bell, Check, ChevronDown, PhoneCall, QrCode, Settings2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { formatUsd } from "@/econ/format";
import { Equipment, FOOTPRINT } from "@/equipment";
import { monitorEscalations } from "./monitor";
import { BASELINE_INCREASE, validThresholds } from "./policy";
import { useEscalationStore } from "./store";
import type { EscalationRecord, Thresholds } from "./types";
import { useCallPairing } from "./useCallPairing";
import "./escalation.css";

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

function AlertCard({ record, busy, phoneConnected, onRing, onDismiss }: {
  record: EscalationRecord; busy: boolean; phoneConnected: boolean; onRing: () => void; onDismiss: () => void;
}) {
  const { trigger, approved, acknowledged, answered, ringing, dialed, resolvedAt } = record;
  const done = approved ?? acknowledged;
  const status = approved ? "Approved" : acknowledged ? "Acknowledged"
    : resolvedAt ? "Resolved" : answered ? "Answered" : ringing ? (phoneConnected ? "Ringing" : "Waiting for paired phone") : "Threshold crossed";
  const when = done?.at ?? resolvedAt ?? answered?.at ?? ringing?.at ?? record.raisedAt;

  return <section className="pw-es-alert" aria-label="Escalation alert" data-approved={!!approved}>
    <div className="pw-es-alert-head" role="status">
      {done || resolvedAt ? <Check size={14} aria-hidden /> : <Bell size={14} aria-hidden />}
      <strong>{status}</strong>{trigger.kind === "simulation" && <span className="pw-es-simulation">SIMULATION</span>}
      <Time at={when} />
      {(done || resolvedAt) && <button type="button" className="pw-es-icon" aria-label="Dismiss escalation card" onClick={onDismiss}><X size={15} /></button>}
    </div>
    <div className="pw-es-evidence">
      <div className="pw-es-asset"><AssetMark kind={trigger.assetKind} /></div>
      <div className="pw-es-evidence-copy">
        <div className="pw-es-value">
          {trigger.kind === "risk" ? <><strong>{Number(trigger.score.toFixed(1))}</strong><span>plant risk</span></>
            : trigger.loss !== null && <><strong>{formatUsd(trigger.loss)}</strong><span>est.</span></>}
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
      <span>Calling on-call...</span> <Time at={dialed.at} />
    </div>}
    {!ringing && !resolvedAt && <button type="button" className="pw-es-button pw-es-call-button" disabled={busy} onClick={onRing}>
      <PhoneCall size={16} aria-hidden /> {busy ? "Opening phone link…" : "Call on-call"}
    </button>}
    <details className="pw-es-script">
      <summary>Read call script <ChevronDown size={13} aria-hidden /></summary>
      <div>{record.script}</div>
    </details>
  </section>;
}

export default function EscalationCall() {
  const [settings, setSettings] = useState(false);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [label, setLabel] = useState("");
  const records = useEscalationStore((state) => state.records);
  const thresholds = useEscalationStore((state) => state.thresholds);
  const { pairing, snapshot, busy, error, preparePairing, ring } = useCallPairing(label);

  useEffect(monitorEscalations, []);
  useEffect(() => {
    try { setLabel(localStorage.getItem(RESPONDER_KEY) ?? ""); } catch { /* The paired browser still has an identifier. */ }
  }, []);

  const liveId = snapshot?.call?.alert.id;
  const called = records.find((record) => record.id === liveId && !record.dismissedAt);
  const pending = records.filter((record) => !record.resolvedAt && !record.dismissedAt);
  const record = called ?? pending.toSorted((a, b) => b.raisedAt - a.raisedAt)[0];
  const phoneConnected = snapshot?.phoneConnected ?? false;

  function saveLabel(value: string) {
    setLabel(value.trim());
    try { localStorage.setItem(RESPONDER_KEY, value.trim()); } catch { /* Session label still works. */ }
  }

  return <div className="pw-es" onKeyDown={(event) => {
    if (event.key === "Escape" && (settings || pairingOpen)) { setSettings(false); setPairingOpen(false); }
  }}>
    <button type="button" className="pw-es-chip" aria-label="Escalation thresholds" aria-expanded={settings} onClick={() => {
      setSettings(!settings);
      setPairingOpen(false);
    }}>
      <Bell size={14} aria-hidden />
      <span>{record ? "Escalation" : "Armed"}</span>
      <span className="pw-es-chip-values">{formatUsd(thresholds.loss)} / {thresholds.risk}</span>
      <Settings2 size={13} aria-hidden />
    </button>
    {settings && <section className="pw-es-popover" aria-label="Escalation settings">
      <ThresholdForm thresholds={thresholds} onSave={(value) => {
        useEscalationStore.getState().setThresholds(value);
        setSettings(false);
      }} label={label} onLabel={saveLabel} />
      <button className="pw-es-text-button" type="button" disabled={busy} onClick={() => {
        setSettings(false); setPairingOpen(true); void preparePairing();
      }}><QrCode size={15} aria-hidden /> {phoneConnected ? "Show paired phone" : "Pair phone"}</button>
    </section>}
    {record && <AlertCard record={record} busy={busy} phoneConnected={phoneConnected} onRing={() => {
      setSettings(false); setPairingOpen(true); void ring(record);
    }} onDismiss={() => {
      useEscalationStore.getState().update(record.id, { dismissedAt: Date.now() }); setPairingOpen(false);
    }} />}
    {pairingOpen && !settings && <section className="pw-es-popover" aria-label="Phone pairing">
      <div className="pw-es-popup-head"><span>On-call link</span><button type="button" className="pw-es-icon" aria-label="Close pairing" onClick={() => setPairingOpen(false)}><X size={15} /></button></div>
      {pairing ? <PairingCard pairing={pairing} connected={phoneConnected}
        canRenew={!called || !!(called.approved || called.acknowledged || called.resolvedAt)}
        onRenew={() => void preparePairing(true)} />
        : busy && <div className="pw-es-note">Opening phone link…</div>}
    </section>}
    {error && <div className="pw-es-error" role="status">{error}</div>}
  </div>;
}
