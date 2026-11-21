/** Interactive review of every registered floor symbol and its display states. */
"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { EQUIPMENT, FOOTPRINT, type EquipmentComponent, type EquipmentProps } from "@/equipment";
import type { EquipmentKind } from "@/twin/types";
import "./process/gallery.css";

const kinds = Object.keys(EQUIPMENT) as EquipmentKind[];
const liquidLevels = [0.55, 0.90, 0.20];

const examples: Partial<Record<EquipmentKind, EquipmentProps>> = {
  vertical_tank: { label: "TK-101", capacityLabel: "8,000 L", medium: "water" },
  bullet_tank: { label: "TK-210", capacityLabel: "3,000 L", medium: "co2" },
  agitated_tank: { label: "TK-301", capacityLabel: "2,000 L", medium: "syrup" },
  pump: { label: "P-101", medium: "water" },
  valve: { label: "V-311", medium: "product" },
  instrument: { label: "LT-301", letters: "LT" },
  ro_skid: { label: "RO-101", medium: "water" },
  uv_reactor: { label: "UV-101", medium: "water" },
  carbo_cooler: { label: "CC-310", medium: "product" },
  heat_exchanger: { label: "HX-207", medium: "glycol" },
  rotary_filler: { label: "F-401", medium: "product" },
  conveyor: { label: "CV-410", medium: "product" },
  labeler: { label: "LB-410", medium: "product" },
  palletizer: { label: "PL-421" },
  chiller_compressor: { label: "C-501", medium: "ammonia" },
  condenser: { label: "EC-501", medium: "ammonia" },
  plc_cabinet: { label: "PLC-F3" },
  hmi: { label: "HMI-F3" },
};

const levelKinds = new Set<EquipmentKind>(["vertical_tank", "bullet_tank", "agitated_tank", "carbo_cooler"]);
const runningSamples = [
  { caption: "Running", props: { running: true } },
  { caption: "Stopped", props: { running: false } },
];
const levelSamples = [
  { caption: "20%", props: { level: 0.20 } },
  { caption: "55%", props: { level: 0.55 } },
  { caption: "90%", props: { level: 0.90 } },
];
const frameSamples = [
  { caption: "Selected", props: { selected: true } },
  { caption: "Recommended", props: { placement: "recommended" } },
  { caption: "Unsafe", props: { placement: "unsafe" } },
  { caption: "Alarm", props: { status: "alarm" } },
  { caption: "Compact", props: { compact: true } },
] satisfies { caption: string; props: EquipmentProps }[];

interface SampleRowProps {
  Symbol: EquipmentComponent;
  kind: EquipmentKind;
  samples: readonly { caption: string; props: EquipmentProps }[];
}

function SampleRow({ Symbol, kind, samples }: SampleRowProps) {
  const { w, h } = FOOTPRINT[kind];
  const { letters, medium } = examples[kind] ?? {};
  const level = levelKinds.has(kind) ? liquidLevels[0] : undefined;

  return (
    <ul className={samples.length === 2 ? "grid grid-cols-2 gap-px" : "grid grid-cols-5 gap-px"}>
      {samples.map(({ caption, props }) => (
        <li key={caption} className="min-w-0 bg-pw-panel px-0.5 pt-1 pb-1.5 text-center">
          <svg
            viewBox={`${-w / 2 - 11} ${-h / 2 - 11} ${w + 22} ${h + 22}`}
            className="mx-auto h-10 w-full max-w-21"
            aria-hidden="true"
          >
            <Symbol letters={letters} medium={medium} level={level} {...props} />
          </svg>
          <span className="block text-[9px] leading-4 text-pw-dim">{caption}</span>
        </li>
      ))}
    </ul>
  );
}

const StateSamples = memo(function StateSamples({ kind }: { kind: EquipmentKind }) {
  const Symbol = EQUIPMENT[kind];
  const operatingSamples = levelKinds.has(kind) ? [...runningSamples, ...levelSamples] : runningSamples;

  return (
    <div className="grid gap-px bg-pw-line">
      <SampleRow Symbol={Symbol} kind={kind} samples={operatingSamples} />
      <SampleRow Symbol={Symbol} kind={kind} samples={frameSamples} />
    </div>
  );
});

const EquipmentCard = memo(function EquipmentCard({ kind, running, level }: { kind: EquipmentKind; running: boolean; level?: number }) {
  const Symbol = EQUIPMENT[kind];
  const { w, h } = FOOTPRINT[kind];
  const example = examples[kind];
  const name = kind === "wifi_ap"
    ? "Wi-Fi AP"
    : kind.replaceAll("_", " ").replace(/^(ro|uv|hmi|plc|ip|usb)\b/, (part) => part.toUpperCase());
  const displayWidth = w + 22;
  const labelSpace = example?.capacityLabel ? 20 : example?.label ? 11 : 0;
  const displayHeight = h + 22 + labelSpace;
  const scale = Math.min(3, 388 / displayWidth, 330 / displayHeight);

  return (
    <article data-kind={kind} aria-labelledby={`gallery-${kind}`} className="min-w-0 overflow-hidden rounded-xl border border-pw-line bg-pw-panel">
      <h2 id={`gallery-${kind}`} className="border-b border-pw-line px-4 py-3 text-sm font-medium capitalize text-pw-text">
        {name}
      </h2>
      <div className="pw-equipment-gallery-grid flex h-[330px] items-center justify-center border-b border-pw-line px-2" data-preview="">
        <svg
          viewBox={`${-displayWidth / 2} ${-h / 2 - 11} ${displayWidth} ${displayHeight}`}
          width={displayWidth * scale}
          height={displayHeight * scale}
          className="h-auto max-h-full max-w-full"
          aria-hidden="true"
        >
          <Symbol {...example} level={level} running={running} />
        </svg>
      </div>
      <StateSamples kind={kind} />
    </article>
  );
});

export default function Gallery() {
  const [running, setRunning] = useState(false);
  const [levelIndex, setLevelIndex] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setLevelIndex((current) => (current + 1) % liquidLevels.length), 2400);
    return () => window.clearInterval(interval);
  }, [running]);

  return (
    <main className="pw-scroll h-full overflow-y-auto bg-pw-bg" data-gallery-motion={running ? "running" : "paused"}>
      <header className="sticky top-0 z-10 border-b border-pw-line bg-pw-panel">
        <div className="mx-auto flex max-w-[94rem] flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 sm:px-7 sm:py-8">
          <div>
            <Link href="/" className="text-xs text-pw-dim underline-offset-4 hover:text-pw-text hover:underline">
              Back to plant
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-pw-text sm:text-3xl">Equipment gallery</h1>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={running}
            onClick={() => setRunning((current) => !current)}
            className="flex items-center gap-3 rounded-md border border-pw-line-strong bg-pw-panel-2 px-3 py-2 text-xs font-medium text-pw-text hover:border-pw-dim focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-pw-info"
          >
            Animate equipment
            <span
              className="flex h-4 w-7 items-center rounded-full border border-pw-dim p-0.5"
              aria-hidden="true"
            >
              <span className={`size-2.5 rounded-full transition-transform ${running ? "translate-x-3 bg-pw-text" : "bg-pw-dim"}`} />
            </span>
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[94rem] grid-cols-1 gap-4 px-4 py-5 sm:px-7 md:grid-cols-2 xl:grid-cols-3">
        {kinds.map((kind) => (
          <EquipmentCard key={kind} kind={kind} running={running} level={levelKinds.has(kind) ? liquidLevels[levelIndex] : undefined} />
        ))}
      </div>
    </main>
  );
}
