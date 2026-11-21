/** Runs a real photo or description capture beside the production floor and crew instruments. */
"use client";

import dynamic from "next/dynamic";
import { Camera, ScanLine } from "lucide-react";
import { useState, type FormEvent } from "react";
import { captureErrorMessage } from "@/capture/captureError";
import { MAX_CAPTURE_PHOTOS, prepareCaptureImage } from "@/capture/image";
import ActivityFeed from "@/crew/ActivityFeed";
import CrewDock from "@/crew/CrewDock";
import { useCrewConnection } from "@/crew/crewStore";
import { analyze } from "@/pipeline/client";
import { useRunStore } from "@/pipeline/runStore";
import type { CaptureInput } from "@/pipeline/types";
import { BrandMark } from "@/shell/BrandMark";
import TranscriptDrawer from "@/transcript/TranscriptDrawer";
import { areaCenter } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";

const PlantFloor = dynamic(() => import("@/floor/PlantFloor"), { ssr: false });

const STAGE_LABEL = {
  link: "Reading product page",
  gate: "Checking capture",
  perception: "Scout is reading the device",
  reasoning: "Architect is assessing placement",
  selfcheck: "Inspector is checking placement",
  revision: "Architect is revising placement",
  summary: "Chief is writing the briefing",
} as const;

export default function CrewReview() {
  useCrewConnection();
  const areas = useTwinStore((state) => state.twin.areas);
  const stage = useRunStore((state) => state.stage);
  const status = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const profile = useRunStore((state) => state.profile);
  const assessment = useRunStore((state) => state.assessment);
  const summary = useRunStore((state) => state.summary);
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState("filler3");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = pending || status === "running";
  const recommendedArea = assessment && areas.find((area) => area.id === assessment.physical_placement.area);

  async function capture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (!files.length && !description.trim())) return;
    setPending(true);
    setError(null);
    try {
      const text = description.trim();
      const input: CaptureInput = files.length
        ? { kind: "photo", images: await Promise.all(files.map(prepareCaptureImage)), note: text || undefined }
        : { kind: "text", description: text };
      const area = useTwinStore.getState().twin.areas.find(({ id }) => id === areaId);
      await analyze(input, area ? { ...areaCenter(area), area: area.id } : null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to read the capture.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="pw-shell pw-crew-review">
      <header className="pw-crew-review-bar">
        <BrandMark />
        <h1>Crew review</h1>
        <span className="pw-crew-review-live pw-mono"><i aria-hidden="true" /> Live pipeline</span>
      </header>
      <div className="pw-crew-review-body">
        <div className="pw-crew-review-dock"><CrewDock /></div>
        <section className="pw-crew-review-floor" aria-label="Plant floor"><PlantFloor previewModel={false} /></section>
        <aside className="pw-crew-review-instrument pw-scroll" aria-label="Capture and results">
          <form className="pw-crew-review-form" onSubmit={capture}>
            <h2><Camera size={17} aria-hidden="true" /> Device capture</h2>
            <label htmlFor="crew-review-file">Photos <span>Up to {MAX_CAPTURE_PHOTOS}</span></label>
            <input id="crew-review-file" type="file" accept="image/*" multiple disabled={busy}
              onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []).slice(0, MAX_CAPTURE_PHOTOS))} />
            <label htmlFor="crew-review-description">{files.length ? "Capture notes" : "Device description"}</label>
            <textarea id="crew-review-description" value={description} rows={3} maxLength={2000}
              placeholder="Model, ports, and proposed use" disabled={busy} onChange={(event) => setDescription(event.currentTarget.value)} />
            <label htmlFor="crew-review-area">Drop zone</label>
            <select id="crew-review-area" value={areaId} disabled={busy} onChange={(event) => setAreaId(event.currentTarget.value)}>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
            <button type="submit" disabled={busy || (!files.length && !description.trim())}>
              <ScanLine size={15} aria-hidden="true" />{busy ? "Analyzing…" : "Analyze device"}
            </button>
          </form>
          <section className="pw-crew-review-run" aria-label="Run results">
            <div className="pw-crew-review-stage pw-mono" role="status" data-status={status}>
              {busy ? stage ? STAGE_LABEL[stage] : "Preparing capture" : status === "done" ? "Run complete" : status === "error" ? "Run stopped" : "Ready for capture"}
            </div>
            {(error || runError) && <p role="alert">{captureErrorMessage(error ?? runError?.message ?? "")}</p>}
            {profile && <h2>{profile.device_type}</h2>}
            {recommendedArea && <p>Recommended placement <strong>{recommendedArea.name}</strong></p>}
            {summary && <p className="pw-crew-review-summary">{summary}</p>}
          </section>
          <ActivityFeed />
        </aside>
      </div>
      <TranscriptDrawer />
    </main>
  );
}
