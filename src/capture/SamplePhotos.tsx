/** Runs one credited sample through the ordinary photo preparation path. */
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import credits from "../../public/demo/credits.json";
import type { CaptureImage } from "@/pipeline/types";
import { prepareCaptureImage } from "./image";
import styles from "./SamplePhotos.module.css";

export default function SamplePhotos({ onCapture }: { onCapture: (photo: CaptureImage) => void }) {
  const pending = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => () => pending.current?.abort(), []);

  async function pick(file: string) {
    if (pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/demo/${file}`, { signal: request.signal });
      if (!response.ok) throw new Error("Sample photo unavailable");
      const photo = new File([await response.blob()], file, { type: "image/jpeg" });
      const prepared = await prepareCaptureImage(photo);
      if (!request.signal.aborted) onCapture(prepared);
    } catch {
      if (!request.signal.aborted) setError(true);
    } finally {
      pending.current = null;
      if (!request.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className={styles.tray} role="group" aria-label="Sample photos">
      <div className={styles.heading}>
        <span>Sample photos</span>
        {loading ? <span role="status">Preparing…</span>
          : <a href="/demo/credits.json" target="_blank" rel="noreferrer">Credits</a>}
      </div>
      <div className={styles.row} aria-busy={loading}>
        {credits.map(({ file, label, title, author, licence }, index) => {
          const credit = `${title} · ${author} · ${licence}`;
          const align = index < 2 ? "start" : index >= credits.length - 2 ? "end" : undefined;
          return (
            <button key={file} type="button" className={styles.photo} data-sample-photo={file}
              aria-label={`Run ${label} sample photo`} aria-description={credit}
              data-pw-tip={credit} data-pw-tip-side="top" data-pw-tip-align={align} disabled={loading}
              onClick={() => void pick(file)}>
              <span className={styles.frame}>
                <Image src={`/demo/${file}`} alt="" fill sizes="54px" unoptimized />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {error && <span className="pw-capture-field-error" role="alert">Could not open the sample photo. Try again.</span>}
    </div>
  );
}
