"use client";

/** Connects the resizable Purdue diagram to the shared twin and floor selection. */
import { Network } from "lucide-react";
import { type RefObject, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTwinStore } from "@/twin/store";
import { ConduitDetails, ConduitLayer, MapLegend } from "./ConduitLayer";
import { LevelBands } from "./LevelBands";
import { LinkLayer } from "./LinkLayer";
import { NodeLayer } from "./NodeLayer";
import { PathOverlay } from "./PathOverlay";
import { ZoneBoxes } from "./ZoneBoxes";
import { buildConduitRoutes } from "./conduits";
import { type Box, buildPurdueLayout, type NetworkDrop } from "./layout";
import { moveAddedDevice } from "./moveDevice";
import { networkWires } from "./routing";
import { useDeviceDrag } from "./useDeviceDrag";
import "./purdue.css";

function scrollToBox(scroller: HTMLDivElement | null, box: Box | undefined, railWidth: number) {
  if (!scroller || !box) return;
  const { scrollLeft, scrollTop, clientWidth, clientHeight } = scroller;
  const pad = 8;
  let left = scrollLeft;
  let top = scrollTop;
  if (box.x < scrollLeft + railWidth + pad) left = box.x - railWidth - pad;
  else if (box.x + box.w > scrollLeft + clientWidth - pad) left = box.x + box.w - clientWidth + pad;
  if (box.y < scrollTop + pad) top = box.y - pad;
  else if (box.y + box.h > scrollTop + clientHeight - pad) top = box.y + box.h - clientHeight + pad;
  if (left !== scrollLeft || top !== scrollTop) scroller.scrollTo({ left, top, behavior: "instant" });
}

function useScrollToNode(
  scroller: RefObject<HTMLDivElement | null>,
  id: string | null,
  box: Box | undefined,
  railWidth: number,
  localHover?: RefObject<string | null>,
) {
  const x = box?.x;
  const y = box?.y;
  const w = box?.w;
  const h = box?.h;
  useLayoutEffect(() => {
    if (!id || localHover?.current === id || x === undefined || y === undefined || w === undefined || h === undefined) return;
    scrollToBox(scroller.current, { x, y, w, h }, railWidth);
  }, [scroller, id, x, y, w, h, railWidth, localHover]);
}

export default function PurdueMap() {
  const twin = useTwinStore((state) => state.twin);
  const paths = useTwinStore((state) => state.risk.paths);
  const selectedId = useTwinStore((state) => state.selectedId);
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const select = useTwinStore((state) => state.select);
  const hover = useTwinStore((state) => state.hover);
  const [width, setWidth] = useState(850);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [reassessmentError, setReassessmentError] = useState<string | null>(null);
  const conduitDetailsId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const localHover = useRef<string | null>(null);
  const lastReassessment = useRef(0);
  const hiddenFields = useMemo(() => new Set(twin.assets.filter((asset) =>
    asset.origin === "seed" && asset.network.level === 0 && !expanded.has(asset.network.area),
  ).map((asset) => asset.id)), [twin.assets, expanded]);
  const selectedField = selectedId && hiddenFields.has(selectedId) ? selectedId : null;
  const hoveredField = hoveredId && hiddenFields.has(hoveredId) ? hoveredId : null;
  const layout = useMemo(() => buildPurdueLayout(
    twin,
    width,
    expanded,
    new Set([selectedField, hoveredField].filter((id): id is string => id !== null)),
  ), [twin, width, expanded, selectedField, hoveredField]);
  const wires = useMemo(() => networkWires(twin.assets), [twin.assets]);
  const routes = useMemo(() => buildConduitRoutes(layout, twin.conduits, twin.assets, wires), [layout, twin, wires]);
  const gated = useMemo(() => new Set(routes.flatMap(({ wireKey }) => wireKey ? [wireKey] : [])), [routes]);
  const inspected = routes.find(({ conduit }) => conduit.id === inspectedId)?.conduit;
  const drag = useDeviceDrag(layout, scrollerRef, moveDevice);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const fit = () => { if (scroller.clientWidth > 0) setWidth(scroller.clientWidth); };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  const selected = selectedId ? layout.anchors.get(selectedId) : undefined;
  const hovered = hoveredId ? layout.anchors.get(hoveredId) : undefined;
  useScrollToNode(scrollerRef, selectedId, selected, layout.railWidth);
  useScrollToNode(scrollerRef, hoveredId, hovered, layout.railWidth, localHover);

  useEffect(() => () => {
    if (localHover.current && useTwinStore.getState().hoveredId === localHover.current) hover(null);
  }, [hover]);

  function handleHover(id: string, entered: boolean) {
    if (entered) {
      localHover.current = id;
      hover(id);
    } else if (localHover.current === id) {
      localHover.current = null;
      if (useTwinStore.getState().hoveredId === id) hover(null);
    }
  }

  function toggleFields(zone: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }

  function moveDevice(id: string, target: NetworkDrop) {
    const reassessment = moveAddedDevice(id, target);
    if (!reassessment) return;
    setReassessmentError(null);
    const request = ++lastReassessment.current;
    void reassessment.catch(() => {
      if (lastReassessment.current === request) setReassessmentError(`Reassessment failed for ${id}.`);
    });
  }

  function inspectConduit(id: string, show: boolean) {
    setInspectedId((current) => show ? id : current === id ? null : current);
  }

  return (
    <section className="pw-purdue" aria-label="Purdue network map">
      <header className="pw-purdue-header">
        <h2><Network size={15} strokeWidth={1.6} aria-hidden="true" />Purdue network</h2>
        <MapLegend />
        {inspected && !drag.preview && <ConduitDetails conduit={inspected} id={conduitDetailsId} />}
      </header>
      {reassessmentError && <div className="pw-purdue-reassessment" role="status">{reassessmentError}</div>}
      <div
        ref={scrollerRef}
        className="pw-purdue-scroll pw-scroll"
        role="region"
        aria-label="Purdue diagram"
        tabIndex={0}
        {...drag.handlers}
      >
        <div
          className="pw-purdue-canvas"
          data-compact={layout.compact}
          data-dragging={!!drag.preview}
          style={{ width: layout.width, height: layout.height }}
        >
          <LevelBands bands={layout.bands} railWidth={layout.railWidth} />
          <ZoneBoxes
            zones={layout.zones}
            active={activeZone}
            onSelect={(name) => setActiveZone((value) => value === name ? null : name)}
          />
          <LinkLayer layout={layout} wires={wires} gated={gated} focused={hoveredId ?? selectedId} />
          <ConduitLayer
            layout={layout}
            routes={routes}
            inspected={inspectedId}
            detailsId={conduitDetailsId}
            onInspect={inspectConduit}
          />
          <PathOverlay layout={layout} routes={routes} paths={paths} selectedId={selectedId} />
          <NodeLayer
            layout={layout}
            selectedId={selectedId}
            hoveredId={hoveredId}
            activeZone={activeZone}
            draggedId={drag.preview?.id}
            onSelect={select}
            onHover={handleHover}
            onToggleFields={toggleFields}
            onDragStart={drag.start}
          />
          {drag.preview?.target && (
            <div
              className="pw-purdue-drop"
              style={{
                left: drag.preview.target.x, top: drag.preview.target.y,
                width: drag.preview.target.w, height: drag.preview.target.h,
              }}
            />
          )}
          {drag.preview && (
            <span
              className="pw-purdue-drag-ghost"
              aria-hidden="true"
              style={{
                left: Math.max(layout.railWidth, Math.min(layout.width - 115, drag.preview.point.x + 9)),
                top: Math.max(0, Math.min(layout.height - 24, drag.preview.point.y + 9)),
              }}
            >
              {drag.preview.id}
              {drag.preview.target && <small>{drag.preview.target.area} · L{drag.preview.target.level}</small>}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
