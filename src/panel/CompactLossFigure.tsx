/** Folds audited loss details to four asset rows in narrow result panels. */
"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatFormulaUsd } from "@/econ/format";
import styles from "./CompactLossFigure.module.css";

interface Breakdown {
  container: HTMLElement;
  extraAssets: HTMLDetailsElement | null;
  assetCount: number;
  originCount: number;
  hiddenLoss: number;
}

const visibleAssetCount = 4;

export function CompactLossFigure({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [expandedFor, setExpandedFor] = useState<HTMLElement | null>(null);
  const expanded = breakdown !== null && expandedFor === breakdown.container;

  useEffect(() => {
    const host = root.current;
    if (!host) return;

    // The audited figure mounts its calculation only when the outer disclosure opens.
    function readBreakdown() {
      const total = host?.querySelector("[data-loss-total]");
      const container = total?.parentElement;
      if (!container) {
        setBreakdown(null);
        setExpandedFor(null);
        return;
      }
      const extraAssets = container.querySelector<HTMLDetailsElement>(":scope > details");
      const assets = Array.from(container.querySelectorAll<HTMLElement>("[data-loss-item]"));
      const assetCount = assets.length;
      const originCount = container.querySelectorAll(":scope > ul[aria-label='Originating assets'] > [data-loss-item]").length;
      const hiddenRows = [...assets.slice(visibleAssetCount), ...container.querySelectorAll<HTMLElement>("[data-loss-other]")];
      const hiddenLoss = hiddenRows.reduce((sum, row) => sum + Number(row.dataset.lossContribution ?? 0), 0);
      setBreakdown((previous) => previous?.container === container && previous.extraAssets === extraAssets
        && previous.assetCount === assetCount && previous.originCount === originCount && previous.hiddenLoss === hiddenLoss
        ? previous : { container, extraAssets, assetCount, originCount, hiddenLoss });
      setExpandedFor((previous) => previous === container ? previous : null);
    }

    const observer = new MutationObserver(readBreakdown);
    observer.observe(host, { subtree: true, childList: true, attributeFilter: ["data-loss-contribution"] });
    readBreakdown();
    return () => observer.disconnect();
  }, []);

  const extraAssets = breakdown?.extraAssets;
  useEffect(() => {
    if (!expanded || !extraAssets) return;
    const previous = extraAssets.open;
    extraAssets.open = true;
    return () => { extraAssets.open = previous; };
  }, [expanded, extraAssets]);

  const hiddenAssets = (breakdown?.assetCount ?? 0) - visibleAssetCount;
  return (
    <div ref={root} className={styles.scope} data-compact-ready={breakdown ? "" : undefined}
      data-show-all={expanded ? "" : undefined} data-origin-count={breakdown?.originCount}>
      {children}
      {breakdown && createPortal(
        <button type="button" className={styles.more} aria-expanded={expanded}
          onClick={() => setExpandedFor(expanded ? null : breakdown.container)}>
          {expanded ? "Show less" : hiddenAssets > 0 ? `+${hiddenAssets} more` : "More details"}
          {!expanded && (hiddenAssets > 0 || breakdown.hiddenLoss !== 0) && ` · ${formatFormulaUsd(breakdown.hiddenLoss)}`}
          <ChevronDown size={13} aria-hidden="true" />
        </button>,
        breakdown.container,
      )}
    </div>
  );
}
