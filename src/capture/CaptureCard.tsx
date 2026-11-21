/** Preserves the capture draft as the dock switches between editing, progress and completion. */
"use client";

import { useEffect, useEffectEvent, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { Aperture, ArrowRight, Camera, Check, CircleAlert, Link, RotateCcw, Square, TextAlignStart, Upload, X } from "lucide-react";
import { createPortal } from "react-dom";
import { HANDOFF_NOTE_MAX, type HandoffPacket } from "@/handoff/types";
import { useLensStore } from "@/layers/lensStore";
import { analyze, cancelRun } from "@/pipeline/client";
import { useRunStore } from "@/pipeline/runStore";
import type { CaptureInput } from "@/pipeline/types";
import { DEFAULT_DROP, useDropStore } from "@/twin/dropPoint";
import CaptureLocation from "./CaptureLocation";
import CaptureProgress from "./CaptureProgress";
import CaptureToolbar, { TECHNOLOGY_CAPTURE, type CaptureTool } from "./CaptureToolbar";
import { captureErrorMessage } from "./captureError";
import { MAX_CAPTURE_PHOTOS } from "./image";
import PhotoPane from "./PhotoPane";
import SamplePhotos from "./SamplePhotos";
import PhonePairing from "./PhonePairing";
import { usePhotoDraft } from "./usePhotoDraft";
import { usePhoneHandoff } from "./usePhoneHandoff";

const TABS = [
  { id: "photo", label: "Photo", Icon: Camera },
  { id: "upload", label: "Upload", Icon: Upload },
  { id: "link", label: "Link", Icon: Link },
  { id: "text", label: "Describe", Icon: TextAlignStart },
] as const;
const DATA_TABS = [TABS[2], TABS[3], TABS[0], TABS[1]];
type Tab = (typeof TABS)[number]["id"];

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

type Props = {
  open: boolean;
  editor: HTMLDivElement | null;
  onOpenChange: (open: boolean) => void;
};

export default function CaptureCard({ open, editor, onOpenChange }: Props) {
  const dataFirst = useLensStore((state) => state.mode === "data");
  const tabs = dataFirst ? DATA_TABS : TABS;
  const heading = dataFirst ? TECHNOLOGY_CAPTURE : "Capture device";
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const tab = chosenTab ?? tabs[0].id;
  const [tool, setTool] = useState<CaptureTool>("camera");
  const [fanOpen, setFanOpen] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [dismissedRun, setDismissedRun] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneNote, setPhoneNote] = useState("");
  const [incoming, setIncoming] = useState<HandoffPacket | null>(null);
  const draft = usePhotoDraft();
  const form = useRef<HTMLFormElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const focusField = useRef(false);
  const dragDepth = useRef(0);
  const submittingRun = useRef<symbol | null>(null);
  const autoRun = useRef(false);

  const status = useRunStore((state) => state.status);
  const runId = useRunStore((state) => state.runId);
  const deviceType = useRunStore((state) => state.profile?.device_type);
  const runError = useRunStore((state) => state.error);
  const busy = submitting || status === "running";
  const finished = !busy && !failed && status === "done" && runId !== dismissedRun;
  const photoTab = tab === "photo" || tab === "upload";
  const url = tab === "link" ? productUrl(link) : null;
  const invalidLink = tab === "link" && link.trim() !== "" && !url;
  const roomForIncoming = incoming && incoming.images.length + draft.photos.length <= MAX_CAPTURE_PHOTOS;
  let input: CaptureInput | null = null;
  if (photoTab && draft.photos.length) {
    input = { kind: "photo", images: draft.photos.map(({ image }) => image), ...(phoneNote && { note: phoneNote }) };
  } else if (tab === "link" && url) {
    input = { kind: "link", url };
  } else if (tab === "text" && description.trim()) {
    input = { kind: "text", description: description.trim() };
  }
  const canSubmit = !!input && !draft.preparing && !busy;

  const phone = usePhoneHandoff((packet) => {
    const fresh = draft.photos.length === 0;
    if (!submittingRun.current && !busy && !finished && useRunStore.getState().status !== "running" && addPhonePhotos(packet)) {
      // A send from the phone is the user's intent to analyze: start the run as soon as the draft is ready.
      autoRun.current = fresh;
      return;
    }
    setIncoming(packet);
    setPhoneOpen(false);
  });

  function addPhonePhotos(packet: HandoffPacket, replace = false) {
    if (replace) draft.clear();
    if (!draft.addPrepared(packet.images)) return false;
    setPhoneNote((previous) => [replace ? "" : previous, packet.note].filter(Boolean).join("\n").slice(0, HANDOFF_NOTE_MAX));
    setIncoming(null);
    setPhoneOpen(false);
    setCameraAttempt(0);
    setTool("upload");
    setTab("upload");
    onOpenChange(true);
    return true;
  }

  function collapse(restoreFocus: boolean) {
    autoRun.current = false;
    draft.clearError();
    useDropStore.getState().disarm();
    dragDepth.current = 0;
    setFanOpen(false);
    setDragging(false);
    setPhoneOpen(false);
    setCameraAttempt(0);
    onOpenChange(false);
    if (restoreFocus) requestAnimationFrame(() => addButton.current?.focus({ preventScroll: true }));
  }

  function resetCapture() {
    setDismissedRun(runId);
    setLink("");
    setDescription("");
    setFailed(null);
    setPhoneOpen(false);
    setCameraAttempt(0);
    if (incoming) addPhonePhotos(incoming, true);
    else {
      draft.clear();
      setPhoneNote("");
    }
    useDropStore.getState().setPoint(null);
  }

  function newCapture() {
    focusField.current = true;
    chooseTab(tabs[0].id);
    resetCapture();
    onOpenChange(true);
  }

  function chooseTab(next: Tab) {
    setTab(next);
    setTool(next === "photo" ? "camera" : next);
    setPhoneOpen(false);
    setCameraAttempt(0);
  }

  function openPhone() {
    if (!phoneOpen && (phone.state.status === "idle" || phone.state.status === "error")) phone.start();
    setPhoneOpen(!phoneOpen);
    setCameraAttempt(0);
    setTool(phoneOpen ? "camera" : "phone");
  }

  function useTool(action: CaptureTool) {
    if (finished) resetCapture();
    focusField.current = true;
    if (action === "phone") {
      setTab("photo");
      openPhone();
    } else {
      chooseTab(action === "camera" ? "photo" : action);
      if (action === "camera") setCameraAttempt(cameraAttempt + 1);
    }
    onOpenChange(true);
  }

  const captureKeys = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    const typing = target instanceof Element && !!target.closest("input, textarea, select, [contenteditable], [role='textbox']");
    const inEditor = target instanceof Node && (form.current?.contains(target) ?? false);
    if (event.key === "Escape" && fanOpen && !busy) {
      event.preventDefault();
      setFanOpen(false);
      addButton.current?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Escape" && useDropStore.getState().armed && (!typing || inEditor)) {
      event.preventDefault();
      useDropStore.getState().disarm();
      form.current?.querySelector<HTMLButtonElement>(".pw-capture-pick")?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Escape" && open && (!typing || inEditor)) {
      event.preventDefault();
      collapse(inEditor);
      return;
    }
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.isComposing || typing || busy) return;
    const key = event.key.toLowerCase();
    if (key === "+" || key === "n") {
      const button = addButton.current;
      if (!button || button.closest("[inert]")) return;
      event.preventDefault();
      setFanOpen(!fanOpen);
      button.focus({ preventScroll: true });
      return;
    }
    if (key !== "c") return;
    event.preventDefault();
    setFanOpen(false);
    if (open && tool === "camera" && !fanOpen) collapse(true);
    else useTool("camera");
  });

  const pastePhotos = useEffectEvent((event: ClipboardEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest("input, textarea, [contenteditable]")) return;
    const data = event.clipboardData;
    if (!data || !open || busy || !photoTab) return;
    const files = Array.from(data.files).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      for (const item of data.items) {
        const file = item.type.startsWith("image/") ? item.getAsFile() : null;
        if (file) files.push(file);
      }
    }
    if (!files.length) return;
    event.preventDefault();
    chooseTab("upload");
    void draft.prepare(files);
  });

  useEffect(() => {
    function keydown(event: globalThis.KeyboardEvent) { captureKeys(event); }
    function paste(event: ClipboardEvent) { pastePhotos(event); }
    window.addEventListener("keydown", keydown);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("paste", paste);
    };
  }, []);

  useEffect(() => {
    if (!open || !editor || !focusField.current || useDropStore.getState().armed) return;
    focusField.current = false;
    const selectedTab = '[role="tab"][aria-selected="true"]';
    const field = tab === "upload" ? ".pw-capture-file-drop:not(:disabled)"
      : tab === "photo" ? selectedTab : "input, textarea";
    const control = form.current?.querySelector<HTMLElement>(field) ?? form.current?.querySelector<HTMLElement>(selectedTab);
    control?.focus();
  }, [open, editor, tab, tool]);

  useEffect(() => {
    if (!autoRun.current || !canSubmit || !photoTab || !form.current) return;
    autoRun.current = false;
    form.current.requestSubmit();
  }, [canSubmit, photoTab, open, editor]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input && canSubmit) void startCapture(input);
  }

  async function startCapture(capture: CaptureInput) {
    if (submittingRun.current || useRunStore.getState().status === "running") return;
    const attempt = Symbol();
    submittingRun.current = attempt;
    setSubmitting(true);
    setFailed(null);
    const previousError = useRunStore.getState().error;
    collapse(false);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".pw-capture-run button")?.focus());
    try {
      await analyze(capture, useDropStore.getState().point ?? DEFAULT_DROP);
    } catch (cause) {
      if (submittingRun.current !== attempt || (cause instanceof Error && cause.name === "AbortError")) return;
      const { error } = useRunStore.getState();
      if (error && error !== previousError) return;
      setFailed(cause instanceof Error ? captureErrorMessage(cause.message) : "Could not start analysis.");
    } finally {
      if (submittingRun.current === attempt) {
        submittingRun.current = null;
        setSubmitting(false);
      }
    }
  }

  function cancel() {
    submittingRun.current = null;
    cancelRun();
    setSubmitting(false);
    focusField.current = true;
    onOpenChange(true);
  }

  function tabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex(({ id }) => id === tab);
    const keys: Record<string, number> = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = tabs[keys[event.key]];
    if (!next) return;
    event.preventDefault();
    chooseTab(next.id);
    form.current?.querySelector<HTMLElement>("#capture-tab-" + next.id)?.focus();
  }

  function dropFiles(event: DragEvent<HTMLFormElement>) {
    dragDepth.current = 0;
    setDragging(false);
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    if (busy || draft.preparing) return;
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;
    chooseTab("upload");
    void draft.prepare(files);
  }

  const error = failed ?? (runError && captureErrorMessage(runError.message));

  function reopenDraft() {
    focusField.current = true;
    onOpenChange(true);
  }

  function errorReadout(message: string, belowDesktop = false) {
    return (
      <div className="pw-capture-summary pw-tool-rail" data-failed="true" data-below-desktop={belowDesktop}>
        <CircleAlert size={16} aria-hidden />
        <span role="alert" title={message}>{message}</span>
        <button type="button" className="pw-tool-button pw-capture-new" aria-label="Edit capture"
          data-pw-tip="Edit capture" data-pw-tip-side="top" onClick={reopenDraft}>
          <RotateCcw size={17} aria-hidden />
        </button>
      </div>
    );
  }

  const composer = open && !busy && editor && createPortal(
    <form className="pw-capture-card" aria-label={heading} data-dragging={dragging} ref={form} noValidate
      onSubmit={submit} onDrop={dropFiles}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current++;
        setDragging(!draft.preparing);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = draft.preparing ? "none" : "copy";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}>
      <header className="pw-capture-header">
        <h2><Aperture size={17} aria-hidden /> {heading}</h2>
        <button type="button" className="pw-capture-icon-button" title="Collapse capture (Esc)" aria-label="Collapse capture"
          onClick={() => collapse(true)}><X size={17} aria-hidden /></button>
      </header>
      <div className="pw-capture-tabs" role="tablist" aria-label="Capture method">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="tab" id={"capture-tab-" + id} aria-selected={tab === id}
            aria-controls="capture-pane" tabIndex={tab === id ? 0 : -1}
            onClick={() => chooseTab(id)} onKeyDown={tabKeys}>
            <Icon size={14} aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="capture-pane" aria-labelledby={"capture-tab-" + tab} className="pw-capture-pane">
        {photoTab && (
          <PhotoPane draft={draft} cameraAttempt={cameraAttempt} uploadMode={tab === "upload"}
            phonePreview={phoneOpen ? <PhonePairing state={phone.state} onStart={phone.start} /> : null}
            onTogglePhone={openPhone} onUpload={() => upload.current?.click()}
            onRemove={(id) => {
              draft.remove(id);
              if (draft.photos.length === 1) setPhoneNote("");
            }}>
            {incoming && (
              <div className="pw-capture-incoming">
                <span role="status">{incoming.images.length} from phone</span>
                <button type="button" disabled={draft.preparing} onClick={() => addPhonePhotos(incoming, !roomForIncoming)}>
                  {roomForIncoming ? "Add photos" : "Replace photos"}
                </button>
              </div>
            )}
            {phoneNote && <p className="pw-capture-phone-note" title={phoneNote}>{phoneNote}</p>}
          </PhotoPane>
        )}
        {tab === "upload" && (
          <SamplePhotos onCapture={(photo) => void startCapture({ kind: "photo", images: [photo] })} />
        )}
        {tab === "link" && (
          <label className="pw-capture-field">
            <span>Product URL</span>
            <input name="url" type="url" value={link} placeholder="https://…" autoComplete="url"
              autoCapitalize="none" spellCheck={false} aria-invalid={invalidLink}
              aria-describedby={invalidLink ? "capture-link-error" : undefined} onChange={(event) => setLink(event.target.value)} />
            <span id="capture-link-error" className="pw-capture-field-error" aria-live="polite">
              {invalidLink ? "Enter a valid http:// or https:// URL." : ""}
            </span>
          </label>
        )}
        {tab === "text" && (
          <label className="pw-capture-field">
            <span>Device description{description.length >= 1000 && (
              <span className="pw-capture-count" aria-live="polite"> · {description.length}/1200</span>
            )}</span>
            <textarea name="description" rows={3} maxLength={1200} value={description}
              placeholder="What device are you adding?"
              onChange={(event) => setDescription(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }} />
          </label>
        )}
      </div>
      {error && <p className="pw-capture-failure" role="alert"><CircleAlert size={15} aria-hidden />{error}</p>}
      <footer className="pw-capture-footer">
        <CaptureLocation />
        <button type="submit" className="pw-capture-analyze" disabled={!canSubmit}>
          {error ? "Retry" : "Analyze"} <ArrowRight size={15} aria-hidden />
        </button>
      </footer>
    </form>,
    editor,
  );

  return (
    <div className="pw-capture-root" ref={root}>
      <input type="file" ref={upload} accept="image/*" multiple hidden disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length && !busy) void draft.prepare(files);
        }} />
      <CaptureToolbar active={open ? tool : null} addButton={addButton} expanded={fanOpen && !busy}
        onExpandedChange={setFanOpen} onTool={useTool} running={busy} dataFirst={dataFirst} />
      {busy ? (
        <div className="pw-capture-run pw-tool-rail">
          <CaptureProgress />
          <button type="button" className="pw-tool-button" aria-label="Cancel analysis"
            data-pw-tip="Cancel analysis" data-pw-tip-side="top" onClick={cancel}><Square size={15} aria-hidden /></button>
        </div>
      ) : finished ? (
        <div className="pw-capture-summary pw-tool-rail">
          <Check size={16} aria-hidden />
          <span role="status" title={deviceType ?? undefined}>{deviceType || "Capture complete"}</span>
          <button type="button" className="pw-tool-button pw-capture-new" aria-label="New capture"
            data-pw-tip={dataFirst ? heading : "New capture (C)"} data-pw-tip-side="top" onClick={newCapture}>
            {dataFirst ? <Link size={18} aria-hidden /> : <Camera size={18} aria-hidden />}
          </button>
        </div>
      ) : error && !open && errorReadout(error, !failed)}
      {composer}
    </div>
  );
}
