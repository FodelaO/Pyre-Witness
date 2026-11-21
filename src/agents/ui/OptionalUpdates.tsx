/** Mounts the updates worker's ticker when its entry exists in this build. */
"use client";

import { lazy, type ComponentType } from "react";
import { Slot } from "@/shell/Slot";

type TickerModule = { default: ComponentType };
type TickerFiles = { keys(): string[]; (file: string): TickerModule };
declare const require: { context: (root: string, recursive: boolean, file: RegExp) => TickerFiles };

const NoTicker = () => null;
const UpdatesTicker = lazy(async () => {
  try {
    const files = require.context("..", true, /^\.\/ticker\/UpdatesTicker\.tsx$/);
    const file = files.keys()[0];
    if (file) return files(file);
  } catch {
    // The ticker can be absent in a partial checkout.
  }
  return { default: NoTicker };
});

export default function OptionalUpdates() {
  // The dock is not inside a feature slot, so a ticker render error must stay inside this mount.
  return <div className="pw-crew-dock-updates"><Slot name="Updates" quiet><UpdatesTicker /></Slot></div>;
}
