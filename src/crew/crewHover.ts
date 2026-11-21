/** Gives card and chat portraits one pointer and keyboard focus state for the twin. */
"use client";

import { useCallback, useId, type FocusEvent, type PointerEvent } from "react";
import { create } from "zustand";
import type { CrewId } from "./types";

type HoverSource = { key: string; id: CrewId; element: HTMLElement };
type Channel = "focus" | "pointer";
type HoverState = Record<Channel, HoverSource | null>;

const useHover = create<HoverState>(() => ({ focus: null, pointer: null }));
const source = (state: HoverState) => state.pointer ?? state.focus;
const tooltipId = "pw-agent-activity";

export function useCrewHoverSource() {
  return useHover(source);
}

export function useCrewHoverId() {
  return useHover((state) => source(state)?.id);
}

export function useCrewHoverEvents(id: CrewId) {
  const key = useId();
  const described = useHover((state) => source(state)?.key === key);
  const ref = useCallback((element: HTMLElement | null) => {
    if (element) return;
    const { pointer, focus } = useHover.getState();
    if (pointer?.key === key || focus?.key === key) {
      useHover.setState({ pointer: pointer?.key === key ? null : pointer, focus: focus?.key === key ? null : focus });
    }
  }, [key]);

  function activate(channel: Channel, element: HTMLElement) {
    useHover.setState({ [channel]: { key, id, element } });
  }
  function release(channel: Channel) {
    if (useHover.getState()[channel]?.key === key) useHover.setState({ [channel]: null });
  }

  return {
    ref,
    "aria-describedby": described ? tooltipId : undefined,
    onPointerEnter(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== "touch") activate("pointer", event.currentTarget);
    },
    onPointerLeave: () => release("pointer"),
    onFocus(event: FocusEvent<HTMLElement>) {
      if (event.currentTarget.matches(":focus-visible")) activate("focus", event.currentTarget);
    },
    onBlur: () => release("focus"),
  };
}

export const CREW_ACTIVITY_TOOLTIP_ID = tooltipId;
