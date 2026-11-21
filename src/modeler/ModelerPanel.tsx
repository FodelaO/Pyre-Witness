/** Compact upload and human review panel for modeler proposals. */
"use client";

import { Check, ChevronDown, ScanLine, Upload, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { useTwinStore } from "@/twin/store";
import { MODEL_ACCEPT, modelMime } from "./limits";
import { modelerBusy, useModelerStore } from "./modelerStore";
import { ProposalRow } from "./ProposalRow";
import { VideoEvidenceStrip } from "./VideoEvidenceStrip";

type Props = { open?: boolean; onOpenChange?: (open: boolean) => void; children?: ReactNode };

export default function ModelerPanel({ open, onOpenChange, children }: Props) {
  const state = useModelerStore();
  const twin = useTwinStore((current) => current.twin);
  const input = useRef<HTMLInputElement>(null);
  const help = useId();
  const [dragging, setDragging] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const { phase, source, proposal, observations, votes, error, applied, applyIssues } = state;
  const busy = modelerBusy(phase);
  const accepted = Object.values(votes).filter((vote) => vote === "accept").length;
  const notices = [...(proposal?.dropped ?? []), ...applyIssues];
  const status = {
    idle: "", upload: source ? "Source received · Preparing" : "Uploading source",
    gate: "Source uploaded · Checking", extract: "Finding equipment",
    reconcile: `${observations.length} observed · Reconciling with twin`,
    review: applied ?? `${proposal?.items.length ?? 0} observed`, error: "Ingest stopped",
  }[phase];

  function choose(files: FileList | null) {
    setDragging(false);
    if (busy || !files?.length) return;
    const first = files[0];
    setVideo(files.length === 1 && modelMime(first.name, first.type)?.startsWith("video/") ? first : null);
    void state.ingest(Array.from(files));
  }

  return (
    <details className="pw-model-panel" open={open} onToggle={(event) => {
      if (event.target !== event.currentTarget) return;
      const expanded = event.currentTarget.open;
      if (!expanded) state.preview(null);
      onOpenChange?.(expanded);
    }}>
      <summary className="pw-model-heading">
        <ScanLine size={16} aria-hidden />
        <strong>Model the twin</strong>
        {busy && <span className="pw-model-pill">In progress</span>}
        {proposal && <span className="pw-model-pill">{proposal.items.length} observed</span>}
        <ChevronDown size={14} aria-hidden className="pw-model-chevron" />
      </summary>
      <div className="pw-model-body">
        <input ref={input} type="file" accept={MODEL_ACCEPT} multiple hidden disabled={busy}
          onChange={(event) => {
            choose(event.currentTarget.files);
            event.currentTarget.value = "";
          }} />
        <button type="button" className="pw-model-drop" data-dragging={dragging} disabled={busy} aria-describedby={help}
          onClick={() => input.current?.click()}
          onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files); }}>
          <Upload size={16} aria-hidden />
          <span><strong>Drop or choose files</strong><small id={help}>Video ≤60 s · 6 photos · PDF · CSV/TXT</small></span>
        </button>
        {!!status && (
          <div className="pw-model-status">
            <span role="status" aria-atomic="true">{status}</span>
            {busy && <button type="button" className="pw-model-icon" title="Cancel ingest" aria-label="Cancel ingest"
              onClick={() => { setVideo(null); state.cancel(); }}>
              <X size={16} aria-hidden />
            </button>}
          </div>
        )}
        {source && <div className="pw-model-file" title={source.files.join(", ")}>{source.files.join(", ")}</div>}
        {error && <div role="alert" className="pw-model-warning">{error}</div>}
        {video && source?.kind === "video" && observations.length > 0 && (
          <VideoEvidenceStrip file={video} items={observations} />
        )}
        {busy && observations.length > 0 && (
          <ul className="pw-model-sightings">
            {observations.map(({ id, label, evidence }) => <li key={id}><span>{label}</span><span className="pw-mono">{evidence[0]?.locator}</span></li>)}
          </ul>
        )}
        {proposal && <>
          {proposal.items.length > 0 && (
            <ul className="pw-model-list">
              {proposal.items.map((item) => (
                <ProposalRow key={item.id} item={item} twin={twin} vote={votes[item.id]}
                  addition={proposal.additions.find(({ id }) => item.outcome.action !== "unplaced" && item.outcome.assetId === id)}
                  update={proposal.updates.find(({ assetId }) => item.outcome.action !== "unplaced" && item.outcome.assetId === assetId)}
                  onVote={(vote) => state.vote(item.id, vote)}
                  onPreview={(active) => state.preview(active ? item.id : null)} />
              ))}
            </ul>
          )}
          {proposal.items.length === 0 && <div className="pw-model-detail">No equipment with a valid source citation.</div>}
          {notices.length > 0 && (
            <details className="pw-model-warning" open>
              <summary>{notices.length} validation {notices.length === 1 ? "note" : "notes"}</summary>
              <ul>{notices.map(({ itemId, reason }, index) => (
                <li key={`${itemId}-${index}`}>{reason}</li>
              ))}</ul>
            </details>
          )}
          {proposal.items.some(({ outcome }) => outcome.action !== "unplaced") && (
            <button type="button" className="pw-model-apply" disabled={!accepted} onClick={state.applyAccepted}>
              <Check size={16} aria-hidden /> Add accepted{accepted > 0 && ` · ${accepted}`}
            </button>
          )}
        </>}
        {children}
      </div>
    </details>
  );
}
