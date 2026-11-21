/** Shows a compact loss estimate using the same equipment drawing as the plant floor. */
"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { displayLedger, type LossDifference } from "./displayLedger";
import { formatUsd } from "./format";
import { LossBreakdown } from "./LossBreakdown";
import { LossGlyph } from "./LossGlyph";
import type { LossEstimate } from "./types";
import styles from "./LossFigure.module.css";

interface Props {
  estimate: LossEstimate;
  simulation?: boolean;
  qualifier?: string;
  comparison?: readonly { label: string; amount: number }[];
  subtitleAsset?: LossEstimate["asset"];
  difference?: LossDifference;
}

export function LossFigure({ estimate, simulation = false, qualifier, comparison, subtitleAsset, difference }: Props) {
  const [open, setOpen] = useState(false);
  const ledger = useMemo(() => displayLedger(estimate, difference), [estimate, difference]);
  const displayAsset = subtitleAsset ?? estimate.asset;
  const displayAmount = ledger.total;
  const tone = Math.abs(displayAmount) > 10_000_000 ? "alarm" : Math.abs(displayAmount) > 1_000_000 ? "attention" : undefined;

  return (
    <details className={styles.figure} data-loss-asset={displayAsset.id}
      onToggle={(event) => { if (event.target === event.currentTarget) setOpen(event.currentTarget.open); }}>
      <summary className={styles.summary}>
        <LossGlyph kind={displayAsset.kind} />
        <span className={styles.headline}>
          <span className={styles.amount} data-tone={tone}>{formatUsd(displayAmount)}</span>{" "}
          <span className={styles.estimated}>est.{simulation ? " · SIMULATION" : ""}{qualifier && <> <span className={styles.qualifier}>· {qualifier}</span></>}</span>
          <span className={styles.subtitle}>{displayAsset.tag} · {displayAsset.name}</span>
        </span>
        <span className={styles.toggle}>
          <span className={styles.more}>Show more</span>
          <span className={styles.less}>Show less</span>
          <ChevronDown size={13} aria-hidden="true" />
        </span>
      </summary>
      {open && <LossBreakdown estimate={estimate} difference={difference} comparison={comparison} ledger={ledger} />}
    </details>
  );
}
