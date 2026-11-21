/** Review-page frame around the same plant and three-stop pipeline lens. */
"use client";

import dynamic from "next/dynamic";
import { Box, Network } from "lucide-react";
import { BrandMark } from "@/shell/BrandMark";
import { useTwinStore } from "@/twin/store";
import LensLegend from "./LensLegend";
import LensToggle from "./LensToggle";
import { useLensStore } from "./lensStore";
import { useLensVars } from "./useLensVars";

const LensReviewFloor = dynamic(() => import("./LensReviewFloor"), {
  ssr: false,
  loading: () => <div className="pwl-review-map" aria-busy="true" />,
});

export default function LensReview() {
  const twin = useTwinStore((state) => state.twin);
  const lensStyle = useLensVars();

  return (
    <main className="pwl-review" style={lensStyle}>
      <header className="pwl-review-header">
        <div className="pwl-review-brand"><BrandMark /></div>
        <LensToggle />
        <div className="pwl-review-status">
          <span className="pwl-review-status-dot" />
          <span>Simulated plant</span>
        </div>
      </header>
      <section className="pwl-review-stage" aria-labelledby="pwl-review-plant">
        <header className="pwl-review-plant">
          <div>
            <p className="pwl-review-line">{twin.plant.line} <span> / </span> Plant floor</p>
            <h1 id="pwl-review-plant">{twin.plant.name}</h1>
          </div>
          <div className="pwl-review-stats" aria-label="Twin inventory">
            <span><Box aria-hidden="true" /> <strong>{twin.assets.length}</strong> assets</span>
            <span><Network aria-hidden="true" /> <strong>{twin.conduits.length}</strong> conduits</span>
          </div>
        </header>
        <LensReviewFloor twin={twin} />
        <footer className="pwl-review-footer">
          <LensLegend />
          <ReviewInspection />
        </footer>
      </section>
    </main>
  );
}

function ReviewInspection() {
  const mode = useLensStore((state) => state.mode);
  const twin = useTwinStore((state) => state.twin);
  const id = useTwinStore((state) => state.hoveredId ?? state.selectedId);
  const asset = twin.assets.find((item) => item.id === id);
  const entry = twin.entryPoints.find((item) => item.id === id);

  if (entry) return <p className="pwl-review-inspection"><strong>{entry.name}</strong> <span>·</span> Entry point</p>;
  if (!asset) return <p className="pwl-review-inspection">{mode === "both" ? "Hover to trace a data chain" : "Hover an asset to inspect"} <span>·</span> Scroll to zoom</p>;

  const reading = asset.process?.telemetry?.[0];
  return (
    <p className="pwl-review-inspection">
      <strong>{asset.id}</strong> <span>·</span> {asset.name}
      {reading && <span className="lens-material-only"> <span>·</span> {reading.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} {reading.unit}</span>}
      <span className="lens-data-only"> <span>·</span> {asset.network.area}</span>
    </p>
  );
}
