/** The plant's floating photo, product-link and description intake. */
"use client";

import { useEffect, useEffectEvent, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { Aperture, ArrowRight, Camera, Check, ChevronDown, Link, RotateCcw, Square, TextAlignStart } from "lucide-react";
import { HANDOFF_NOTE_MAX, type HandoffPacket } from "@/handoff/types";
import { analyze, cancelRun } from "@/pipeline/client";
import { useRunStore } from "@/pipeline/runStore";
import type { CaptureInput } from "@/pipeline/types";
import { DEFAULT_DROP, useDropStore } from "@/twin/dropPoint";
import CaptureLocation from "./CaptureLocation";
import CaptureProgress, { captureStageLabel } from "./CaptureProgress";
import { MAX_CAPTURE_PHOTOS } from "./image";
import PhotoPane from "./PhotoPane";
import PhonePairing from "./PhonePairing";
import { usePhotoDraft } from "./usePhotoDraft";
import { usePhoneHandoff } from "./usePhoneHandoff";
import "./capture.css";

const TABS = [
  { id: "photo", label: "Photo", Icon: Camera },
  { id: "link", label: "Link", Icon: Link },
  { id: "text", label: "Describe", Icon: TextAlignStart },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Failure = { stage: string; message: string };

function productUrl(value: string) {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.hostname && !url.username && !url.password && url.href.length <= 4096 ? url.href : null;
  } catch {
    return null;
  }
}

export default function CaptureCard() {
  const [tab, setTab] = useState<Tab>("photo");
  const [collapsed, setCollapsed] = useState(false);
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const [dismissedRun, setDismissedRun] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneNote, setPhoneNote] = useState("");
  const [incoming, setIncoming] = useState<HandoffPacket | null>(null);
  const draft = usePhotoDraft();
  const formRef = useRef<HTMLFormElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);
  const dragDepth = useRef(0);
  const submittingRun = useRef<symbol | null>(null);

  const status = useRunStore((state) => state.status);
  const runId = useRunStore((state) => state.runId);
  const deviceType = useRunStore((state) => state.profile?.device_type);
  const runError = useRunStore((state) => state.error);
  const busy = submitting || status === "running";
  const finished = !busy && !failed && status === "done" && runId !== dismissedRun;
  const error = failed ?? runError;
  const url = tab === "link" ? productUrl(link) : null;
  const invalidLink = tab === "link" && link.trim() !== "" && !url;
  const roomForIncoming = incoming && incoming.images.length + draft.photos.length <= MAX_CAPTURE_PHOTOS;
  let input: CaptureInput | null = null;
  if (tab === "photo" && draft.photos.length) {
    input = { kind: "photo", images: draft.photos.map((photo) => photo.image), ...(phoneNote && { note: phoneNote }) };
  } else if (tab === "link" && url) {
    input = { kind: "link", url };
  } else if (tab === "text" && description.trim()) {
    input = { kind: "text", description: description.trim() };
  }
  const canSubmit = !!input && !draft.preparing && !busy;

  const phone = usePhoneHandoff((packet) => {
    if (!submittingRun.current && !busy && !finished && useRunStore.getState().status !== "running" && addPhonePhotos(packet)) return;
    setIncoming(packet);
    setPhoneOpen(false);
  });

  function addPhonePhotos(packet: HandoffPacket, replace = false) {
    if (replace) draft.clear();
    if (!draft.addPrepared(packet.images)) return false;
    setPhoneNote((previous) => [replace ? "" : previous, packet.note].filter(Boolean).join("\n").slice(0, HANDOFF_NOTE_MAX));
    setIncoming(null);
    setPhoneOpen(false);
    setTab("photo");
    setCollapsed(false);
    return true;
  }

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || collapsed) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")
        && !rootRef.current?.contains(event.target)) return;
      focusNext.current = rootRef.current?.contains(document.activeElement) ?? false;
      useDropStore.getState().disarm();
      dragDepth.current = 0;
      setDragging(false);
      setCollapsed(true);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [collapsed]);

  useEffect(() => {
    if (!focusNext.current) return;
    rootRef.current?.querySelector<HTMLElement>(collapsed || finished ? "button" : '[role="tab"][aria-selected="true"]')?.focus();
    focusNext.current = false;
  }, [collapsed, finished]);

  const preparePhotos = useEffectEvent((files: File[]) => void draft.prepare(files));
  useEffect(() => {
    if (collapsed || finished || busy || tab !== "photo") return;
    function paste(event: ClipboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable]")) return;
      const data = event.clipboardData;
      if (!data) return;
      const files = Array.from(data.files).filter((file) => file.type.startsWith("image/"));
      if (!files.length) {
        for (const item of data.items) {
          const file = item.type.startsWith("image/") ? item.getAsFile() : null;
          if (file) files.push(file);
        }
      }
      if (!files.length) return;
      event.preventDefault();
      preparePhotos(files);
    }
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [busy, collapsed, finished, tab]);

  function toggleCard() {
    focusNext.current = true;
    useDropStore.getState().disarm();
    dragDepth.current = 0;
    setDragging(false);
    setCollapsed(!collapsed);
  }

  function newCapture() {
    focusNext.current = true;
    setDismissedRun(runId);
    setTab("photo");
    setLink("");
    setDescription("");
    setFailed(null);
    setPhoneOpen(false);
    if (incoming) addPhonePhotos(incoming, true);
    else {
      draft.clear();
      setPhoneNote("");
    }
    useDropStore.getState().setPoint(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input || !canSubmit || submittingRun.current || useRunStore.getState().status === "running") return;
    const attempt = Symbol();
    submittingRun.current = attempt;
    setSubmitting(true);
    setFailed(null);
    const previousError = useRunStore.getState().error;
    const drop = useDropStore.getState();
    drop.disarm();
    try {
      await analyze(input, drop.point ?? DEFAULT_DROP);
    } catch (cause) {
      if (submittingRun.current !== attempt) return;
      if (cause instanceof Error && cause.name === "AbortError") return;
      const latest = useRunStore.getState();
      if (latest.error && latest.error !== previousError) return;
      setFailed({
        stage: latest.stage ?? "submission",
        message: cause instanceof Error ? cause.message : "Could not start analysis.",
      });
    } finally {
      if (submittingRun.current === attempt) {
        submittingRun.current = null;
        setSubmitting(false);
      }
    }
  }

  function cancel(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    submittingRun.current = null;
    cancelRun();
    setSubmitting(false);
  }

  function tabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex(({ id }) => id === tab);
    const keys: Record<string, number> = {
      ArrowLeft: (index + TABS.length - 1) % TABS.length,
      ArrowRight: (index + 1) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = TABS[keys[event.key]];
    if (!next) return;
    event.preventDefault();
    setTab(next.id);
    formRef.current?.querySelector<HTMLElement>(`#capture-tab-${next.id}`)?.focus();
  }

  function dropFiles(event: DragEvent<HTMLFormElement>) {
    dragDepth.current = 0;
    setDragging(false);
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    if (busy || draft.preparing) return;
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;
    setTab("photo");
    void draft.prepare(files);
  }

  return (
    <div className="pw-capture-root" ref={rootRef}>
      {collapsed ? (
        <button type="button" className="pw-capture-round" title="Open capture" aria-label="Open capture"
          aria-expanded={false} onClick={toggleCard}>
          <Camera size={21} aria-hidden="true" />
        </button>
      ) : finished ? (
        <div className="pw-capture-summary">
          <Check size={16} aria-hidden="true" />
          <span role="status" title={deviceType ?? undefined}>{deviceType || "Capture complete"}</span>
          <button type="button" onClick={newCapture}><Camera size={14} aria-hidden="true" /> New capture</button>
        </div>
      ) : (
        <form className="pw-capture-card" aria-label="Capture device" data-dragging={dragging} ref={formRef} noValidate
          onSubmit={submit} onDrop={dropFiles}
          onDragEnter={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            dragDepth.current++;
            setDragging(!busy && !draft.preparing);
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = busy || draft.preparing ? "none" : "copy";
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDragging(false);
          }}>
          <header className="pw-capture-header">
            <h2><Aperture size={15} aria-hidden="true" /> Capture device</h2>
            <button type="button" className="pw-capture-icon-button" title="Collapse capture" aria-label="Collapse capture"
              aria-expanded={true} onClick={toggleCard}><ChevronDown size={18} aria-hidden="true" /></button>
          </header>
          <div className="pw-capture-tabs" role="tablist" aria-label="Capture method">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} type="button" role="tab" id={`capture-tab-${id}`} aria-selected={tab === id}
                aria-controls={`capture-pane-${id}`} tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)} onKeyDown={tabKeys} disabled={busy}>
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`capture-pane-${tab}`} aria-labelledby={`capture-tab-${tab}`} className="pw-capture-pane">
            {tab === "photo" && (
              <PhotoPane draft={draft} busy={busy}
                phonePreview={phoneOpen ? <PhonePairing state={phone.state} onStart={phone.start} /> : null}
                onTogglePhone={() => {
                  if (!phoneOpen && (phone.state.status === "idle" || phone.state.status === "error")) phone.start();
                  setPhoneOpen(!phoneOpen);
                }}
                onRemove={(id) => {
                  draft.remove(id);
                  if (draft.photos.length === 1) setPhoneNote("");
                }}>
                {incoming && (
                  <div className="pw-capture-incoming">
                    <span role="status">{incoming.images.length} from phone</span>
                    <button type="button" disabled={busy || draft.preparing}
                      onClick={() => addPhonePhotos(incoming, !roomForIncoming)}>
                      {roomForIncoming ? "Add photos" : "Replace photos"}
                    </button>
                  </div>
                )}
                {phoneNote && <p className="pw-capture-phone-note" title={phoneNote}>{phoneNote}</p>}
              </PhotoPane>
            )}
            {tab === "link" && (
              <label className="pw-capture-field">
                <span>Product URL</span>
                <input name="url" type="url" value={link} placeholder="https://…" autoComplete="url"
                  autoCapitalize="none" spellCheck={false} disabled={busy} aria-invalid={invalidLink}
                  aria-describedby={invalidLink ? "capture-link-error" : undefined} onChange={(event) => setLink(event.target.value)} />
                <span id="capture-link-error" className="pw-capture-field-error" aria-live="polite">
                  {invalidLink ? "Enter a valid http:// or https:// URL." : ""}
                </span>
              </label>
            )}
            {tab === "text" && (
              <label className="pw-capture-field">
                <span>Device and intended location</span>
                <textarea name="description" rows={3} maxLength={1200} value={description}
                  placeholder="What is it? Where will it go?" disabled={busy}
                  onChange={(event) => setDescription(event.target.value)} onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }} />
              </label>
            )}
          </div>

          {busy && <CaptureProgress />}
          {!busy && error && (
            <div className="pw-capture-failure">
              <div role="alert"><strong>{captureStageLabel(error.stage)}</strong><p>{error.message}</p></div>
              <button type="submit" disabled={!canSubmit}><RotateCcw size={13} aria-hidden="true" /> Retry</button>
            </div>
          )}
          <footer className="pw-capture-footer">
            <CaptureLocation disabled={busy} />
            {busy ? (
              <button type="button" className="pw-capture-cancel" onClick={cancel}><Square size={13} aria-hidden="true" /> Cancel</button>
            ) : (
              <button type="submit" className="pw-capture-analyze" disabled={!canSubmit}>Analyze <ArrowRight size={15} aria-hidden="true" /></button>
            )}
          </footer>
        </form>
      )}
    </div>
  );
}
