/** Review-page SVG camera and layer stack in the twin's floor coordinates. */
"use client";

import { memo, useState, type KeyboardEvent, type WheelEvent } from "react";
import type { Twin } from "@/twin/types";
import { useTwinStore } from "@/twin/store";
import ConnectorLayer from "./ConnectorLayer";
import DataLayer from "./DataLayer";
import LensReviewBackdrop from "./LensReviewBackdrop";
import LensReviewEquipment from "./LensReviewEquipment";
import LensReviewRisk from "./LensReviewRisk";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.2;

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const FIT: Camera = { x: 0, y: 0, zoom: MIN_ZOOM };
const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));
const selectEntry = (id: string) => useTwinStore.getState().select(id);

export default memo(function LensReviewFloor({ twin }: { twin: Twin }) {
  const [camera, setCamera] = useState(FIT);
  const { w, h } = twin.plant.canvas;
  const { x, y, zoom } = camera;

  function zoomAt(factor: number, anchorX: number, anchorY: number) {
    setCamera((current) => {
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom * factor));
      if (nextZoom === current.zoom) return current;
      if (nextZoom === MIN_ZOOM) return FIT;
      const ratio = current.zoom / nextZoom;
      return {
        zoom: nextZoom,
        x: clamp(anchorX - (anchorX - current.x) * ratio, w - w / nextZoom),
        y: clamp(anchorY - (anchorY - current.y) * ratio, h - h / nextZoom),
      };
    });
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    zoomAt(Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.004), clamp(point.x, w), clamp(point.y, h));
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "Escape") {
      useTwinStore.getState().select(null);
      return;
    }
    if (event.key === "0") {
      setCamera(FIT);
      event.preventDefault();
      return;
    }
    if (event.key === "+" || event.key === "=" || event.key === "-") {
      zoomAt(event.key === "-" ? 0.8 : 1.25, x + w / zoom / 2, y + h / zoom / 2);
      event.preventDefault();
    }
  }

  return (
    <div className="pwl-review-map">
      <svg
        className="pwl-review-svg"
        aria-label={`${twin.plant.line} floor plan. Press plus or minus to zoom, zero to reset.`}
        tabIndex={0}
        viewBox={`${x} ${y} ${w / zoom} ${h / zoom}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) useTwinStore.getState().select(null);
        }}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <LensReviewBackdrop twin={twin} />
        <DataLayer zoom={zoom} pass="underlay" />
        <LensReviewRisk twin={twin} />
        <ConnectorLayer />
        <LensReviewEquipment assets={twin.assets} zoom={zoom} />
        <DataLayer zoom={zoom} pass="annotations" onEntrySelect={selectEntry} />
      </svg>
    </div>
  );
});
