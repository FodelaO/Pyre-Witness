/** Leaves a fixed drawing beside the rail while a capture is being composed. */
"use client";

import type { ReactNode } from "react";

export function PanelWorkspace({ captureOpen, setCaptureEditor, children }: {
  captureOpen: boolean;
  setCaptureEditor: (editor: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  return (
    <div className="pw-panel-workspace">
      <div className="pw-panel-composer pw-scroll" id="pw-capture-editor" ref={setCaptureEditor} hidden={!captureOpen} />
      <div className="pw-panel-readouts pw-scroll" hidden={captureOpen}>{children}</div>
    </div>
  );
}
