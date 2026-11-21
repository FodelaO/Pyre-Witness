/** Handles generation, retry, download and enlargement for one comparison tile. */
"use client";

import Image from "next/image";
import { Download, ImagePlus, Maximize2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CaptureImage } from "@/pipeline/types";
import { FitLightbox } from "./FitLightbox";
import type { FitRequest, FitResult } from "./types";

const GENERATION_ERROR = "Couldn't generate the fit image. Try again.";

export function FitTile({ request, areaName, findings, pendingAnalysis }: {
  request: FitRequest;
  areaName: string;
  findings: string[];
  pendingAnalysis: boolean;
}) {
  const [image, setImage] = useState<CaptureImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const active = useRef<AbortController | null>(null);
  const variant = request.variant;
  const title = variant === "recommended" ? "Recommended" : "As placed";
  const description = `${request.profile.device_type} at ${areaName}`;
  const src = image ? `data:${image.mimeType};base64,${image.dataBase64}` : undefined;

  useEffect(() => () => active.current?.abort(), []);

  async function generate(regenerate = false) {
    if (active.current || pendingAnalysis) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fit${regenerate ? "?regenerate=1" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const result = await response.json() as FitResult | { error: string };
      if (controller.signal.aborted) return;
      if (!response.ok || !("image" in result)) {
        setError("error" in result && typeof result.error === "string" ? result.error : GENERATION_ERROR);
        return;
      }
      setImage(result.image);
    } catch {
      if (!controller.signal.aborted) setError(GENERATION_ERROR);
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <article className="pw-fit-tile" data-variant={variant} aria-label={`${title} fit preview`}>
      <div className="pw-fit-tile-heading">
        <h3>{title}</h3>
        <p title={areaName}>{areaName}</p>
      </div>
      <div className="pw-fit-media" aria-busy={loading}>
        {loading ? (
          <div className="pw-fit-skeleton" role="status">Generating…</div>
        ) : src ? (
          <button className="pw-fit-enlarge" type="button" onClick={() => setEnlarged(true)} aria-label={`Enlarge ${title.toLowerCase()} fit image`}>
            <Image src={src} alt={description} fill unoptimized sizes="180px" />
            <Maximize2 className="pw-fit-enlarge-icon" size={15} aria-hidden />
          </button>
        ) : (
          <button className="pw-fit-generate" type="button" disabled={pendingAnalysis} onClick={() => void generate()}>
            <ImagePlus size={19} aria-hidden />{pendingAnalysis ? "After briefing" : error ? "Try again" : "Generate preview"}
          </button>
        )}
        {!!findings.length && (
          <ul className="pw-fit-findings" data-overlay={Boolean(src) && !loading} aria-label="Blocking rules engine findings">
            {findings.map((title) => <li key={title}>{title}</li>)}
          </ul>
        )}
      </div>
      {error && <p className="pw-fit-error" role="alert">{error}</p>}
      <footer className="pw-fit-tile-footer">
        <p>AI-generated visualisation</p>
        {src && image && (
          <div className="pw-fit-actions">
            <button className="pw-fit-icon" type="button" disabled={loading || pendingAnalysis} onClick={() => void generate(true)}
              aria-label={`Regenerate ${title.toLowerCase()} fit image`} title="Regenerate">
              <RotateCw size={15} aria-hidden />
            </button>
            <a className="pw-fit-icon" href={src} download={`pyre-witness-${variant}.${image.mimeType.split("/")[1]}`}
              aria-label={`Download ${title.toLowerCase()} fit image`} title="Download">
              <Download size={15} aria-hidden />
            </a>
          </div>
        )}
      </footer>
      {enlarged && src && <FitLightbox {...{ src, description, title, areaName, findings }} onClose={() => setEnlarged(false)} />}
    </article>
  );
}
