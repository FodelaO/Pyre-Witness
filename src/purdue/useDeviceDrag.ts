/** Tracks added-device pointer drags and scrolls the diagram near the pane edges. */
import { type MouseEvent, type PointerEvent, type RefObject, useEffect, useRef, useState } from "react";
import type { Point } from "@/twin/geometry";
import type { Asset } from "@/twin/types";
import { networkDropAt, type NetworkDrop, type PurdueLayout } from "./layout";

interface Tracking {
  asset: Asset;
  pointerId: number;
  start: Point;
  client: Point;
  moved: boolean;
}

interface Preview {
  id: string;
  point: Point;
  target?: NetworkDrop;
}

function edgeSpeed(value: number, low: number, high: number) {
  const threshold = 29;
  if (value < low + threshold) return -Math.min(16, Math.ceil((low + threshold - value) / 2));
  if (value > high - threshold) return Math.min(16, Math.ceil((value - high + threshold) / 2));
  return 0;
}

export function useDeviceDrag(
  layout: PurdueLayout,
  scrollerRef: RefObject<HTMLDivElement | null>,
  onMove: (id: string, target: NetworkDrop) => void,
) {
  const tracking = useRef<Tracking | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function locate(drag: Tracking, scroller: HTMLDivElement): Preview {
    const bounds = scroller.getBoundingClientRect();
    const point = {
      x: drag.client.x - bounds.left + scroller.scrollLeft,
      y: drag.client.y - bounds.top + scroller.scrollTop,
    };
    const inside = drag.client.x >= bounds.left + layout.railWidth
      && drag.client.x < bounds.left + scroller.clientWidth
      && drag.client.y >= bounds.top
      && drag.client.y < bounds.top + scroller.clientHeight;
    return {
      id: drag.asset.id,
      point,
      target: inside ? networkDropAt(layout, point, drag.asset.network.area) : undefined,
    };
  }

  function scrollAtEdge() {
    frame.current = 0;
    const drag = tracking.current;
    const scroller = scrollerRef.current;
    if (!drag?.moved || !scroller) return;
    const bounds = scroller.getBoundingClientRect();
    const right = bounds.left + scroller.clientWidth;
    const bottom = bounds.top + scroller.clientHeight;
    const { x, y } = drag.client;
    if (x < bounds.left || x > right || y < bounds.top || y > bottom) return;
    const left = scroller.scrollLeft;
    const top = scroller.scrollTop;
    scroller.scrollLeft = left + edgeSpeed(x, bounds.left + layout.railWidth, right);
    scroller.scrollTop = top + edgeSpeed(y, bounds.top, bottom);
    if (scroller.scrollLeft !== left || scroller.scrollTop !== top) {
      setPreview(locate(drag, scroller));
      frame.current = requestAnimationFrame(scrollAtEdge);
    }
  }

  function start(event: PointerEvent<HTMLButtonElement>, asset: Asset) {
    if (event.button !== 0 || !event.isPrimary || tracking.current) return;
    const point = { x: event.clientX, y: event.clientY };
    tracking.current = { asset, pointerId: event.pointerId, start: point, client: point, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = tracking.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.client = { x: event.clientX, y: event.clientY };
    if (!drag.moved && Math.hypot(drag.client.x - drag.start.x, drag.client.y - drag.start.y) < 5) return;
    drag.moved = true;
    setPreview(locate(drag, event.currentTarget));
    if (!frame.current) frame.current = requestAnimationFrame(scrollAtEdge);
  }

  function finish(event: PointerEvent<HTMLDivElement>, dropped: boolean) {
    const drag = tracking.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    tracking.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (!drag.moved) return;
    suppressClick.current = true;
    setPreview(null);
    if (dropped) {
      drag.client = { x: event.clientX, y: event.clientY };
      const { target } = locate(drag, event.currentTarget);
      if (target) onMove(drag.asset.id, target);
    }
  }

  return {
    preview,
    start,
    handlers: {
      onPointerDownCapture: () => { suppressClick.current = false; },
      onPointerMove: move,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => finish(event, true),
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finish(event, false),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => finish(event, false),
      onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
        if (event.detail === 0 || !suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
}
