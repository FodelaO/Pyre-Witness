/** Mounts the shared updates ticker when its module is present. */
"use client";

import { Activity } from "lucide-react";
import { lazy, type ComponentType } from "react";

type TickerModule = { default: ComponentType };
declare const require: { context: (root: string, recursive: boolean, file: RegExp) => { keys(): string[]; (file: string): TickerModule } };

export const RailUpdates = lazy(async () => {
  const files = require.context("../agents", true, /^\.\/ticker\/UpdatesTicker\.tsx$/);
  const file = files.keys()[0];
  const Ticker = file ? files(file).default : undefined;
  return { default: Ticker ? function UpdatesSection() {
    return <div className="pw-panel-section pw-rail-section pw-rail-updates" data-pane="updates">
      <Activity className="pw-rail-updates-icon" size={16} aria-hidden /><Ticker />
    </div>;
  } : () => null };
});
