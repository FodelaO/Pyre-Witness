/** Shared headings, disclosures and readouts for the results panel. */
"use client";

import { ChevronDown, ExternalLink, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { techniqueById } from "@/data/attack-ics";
import type { PurdueLevel, Technique } from "@/twin/types";

const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatNumber(value: number) {
  return decimal.format(value);
}

export function percent(fraction: number) {
  return Math.round(Math.min(100, Math.max(0, fraction * 100)));
}

export function readableId(value: string) {
  return value.replaceAll("_", " ");
}

const KIND_WORDS: Record<string, string> = { plc: "PLC", hmi: "HMI", ro: "RO", uv: "UV", wifi: "Wi-Fi", ap: "AP", ip: "IP", usb: "USB" };

/** Equipment kind as a short label that keeps acronyms upper-case: `plc_cabinet` -> "PLC cabinet". */
export function kindLabel(kind: string) {
  const text = kind.split("_").map((word) => KIND_WORDS[word] ?? word).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function PanelSection({ children }: { children: ReactNode }) {
  return <section className="pw-panel-section">{children}</section>;
}

export function PanelHeading({ icon: Icon, children, aside }: { icon: LucideIcon; children: ReactNode; aside?: ReactNode }) {
  return (
    <header className="pw-panel-heading">
      <h2><Icon size={14} aria-hidden />{children}</h2>
      {aside}
    </header>
  );
}

export function Disclosure({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={`pw-panel-disclosure ${className}`}>
      <summary>
        {label}
        <ChevronDown size={13} className="pw-panel-disclosure-caret" aria-hidden />
      </summary>
      <div className="pw-panel-disclosure-body">{children}</div>
    </details>
  );
}

export function TextPreview({ text, label, lines = 1 }: { text: string; label: string; lines?: 1 | 3 }) {
  return (
    <details className="pw-panel-disclosure pw-panel-text-preview" data-lines={lines}>
      <summary aria-label={label}>
        <span className="pw-panel-preview-text">{text}</span>
        <span className="pw-panel-preview-label">{label}</span>
        <ChevronDown size={13} className="pw-panel-disclosure-caret" aria-hidden />
      </summary>
      <div className="pw-panel-disclosure-body">{text}</div>
    </details>
  );
}

export function PurdueBadge({ level }: { level: PurdueLevel }) {
  return <span className="pw-panel-chip pw-mono" title={`Purdue level ${level}`}>L{level}{level === 3.5 ? " · DMZ" : ""}</span>;
}

export function TechniqueChip({ technique }: { technique: Technique }) {
  const known = techniqueById(technique.id);
  const content = <><span className="pw-mono">{known?.id ?? technique.id}</span><span>{known?.name ?? technique.name}</span></>;
  return known ? (
    <a className="pw-panel-chip pw-panel-technique" href={known.url} target="_blank" rel="noopener noreferrer">
      {content}<ExternalLink size={11} aria-hidden />
    </a>
  ) : <span className="pw-panel-chip pw-panel-technique">{content}</span>;
}
