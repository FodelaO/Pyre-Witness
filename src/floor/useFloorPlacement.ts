/** Resolves pin clicks and moves added assets between marked floor areas. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropStore } from "@/twin/dropPoint";
import type { Point } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import { beginAssetMove, completeAssetMove, pinOnFloor, previewAssetMove, type AssetMove } from "./placement";

export default function useFloorPlacement() {
  const armed = useDropStore((state) => state.armed);
  const [notice, setNotice] = useState<"outside" | "reassess" | null>(null);
  const move = useRef<AssetMove | null>(null);
  const pending = useRef<Point | null>(null);
  const frame = useRef<number | undefined>(undefined);
  const reassessment = useRef(0);

  const dismiss = useCallback(() => {
    setNotice(null);
    if (useDropStore.getState().armed) useDropStore.getState().disarm();
  }, []);

  useEffect(() => {
    if (!armed) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) dismiss();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [armed, dismiss]);

  const activate = useCallback((point: Point, assetId: string | null) => {
    const drop = useDropStore.getState();
    const store = useTwinStore.getState();
    if (!drop.armed) {
      store.select(assetId);
      return;
    }

    setNotice(pinOnFloor(point) ? null : "outside");
  }, []);

  const startMove = useCallback((assetId: string | null, point: Point) => {
    move.current = beginAssetMove(assetId, point);
    return move.current !== null;
  }, []);

  const flushMove = useCallback(() => {
    const active = move.current;
    const point = pending.current;
    pending.current = null;
    if (active && point) previewAssetMove(active, point);
  }, []);

  const updateMove = useCallback((point: Point) => {
    pending.current = point;
    if (frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      flushMove();
    });
  }, [flushMove]);

  const finishMove = useCallback((canceled: boolean) => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    if (!canceled) flushMove();
    const active = move.current;
    pending.current = null;
    move.current = null;
    if (!active) return;
    const request = completeAssetMove(active, canceled);
    if (!request) return;
    const attempt = ++reassessment.current;
    setNotice(null);
    void request.catch(() => {
      if (attempt === reassessment.current) setNotice("reassess");
    });
  }, [flushMove]);

  useEffect(() => () => {
    reassessment.current++;
    finishMove(true);
  }, [finishMove]);

  return { armed, notice, dismiss, activate, startMove, updateMove, finishMove };
}

export type FloorPlacement = ReturnType<typeof useFloorPlacement>;
