/** Displays the illustration at full size in a native, keyboard-accessible modal. */
"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export function FitLightbox({ src, description, title, areaName, findings, onClose }: {
  src: string;
  description: string;
  title: string;
  areaName: string;
  findings: string[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog
      className="pw-fit-dialog"
      ref={ref}
      aria-labelledby={label}
      onClose={onClose}
      onKeyDown={(event) => { if (event.key === "Escape") event.stopPropagation(); }}
      onClick={(event) => { if (event.target === ref.current) ref.current.close(); }}
    >
      <div className="pw-fit-dialog-content">
        <header>
          <div>
            <h3 id={label}>{title} · {areaName}</h3>
            <p>AI-generated visualisation</p>
          </div>
          <button className="pw-fit-icon" type="button" onClick={() => ref.current?.close()} aria-label="Close fit image" autoFocus>
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="pw-fit-dialog-image">
          <Image src={src} alt={description} fill unoptimized sizes="(max-width: 900px) 94vw, 880px" />
        </div>
        {!!findings.length && <ul className="pw-fit-dialog-findings" aria-label="Blocking rules engine findings">
          {findings.map((title) => <li key={title}>{title}</li>)}
        </ul>}
      </div>
    </dialog>
  );
}
