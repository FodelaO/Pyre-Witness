/** Leaves a fixed drawing beside the rail while a capture is being composed. */
"use client";

import type { ReactNode, Ref } from "react";

export function PanelWorkspace({ captureOpen, setCaptureEditor, readoutsRef, children }: {
  captureOpen: boolean;
  setCaptureEditor: (editor: HTMLDivElement | null) => void;
  readoutsRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="pw-panel-workspace">
      <div className="pw-panel-composer pw-scroll" id="pw-capture-editor" ref={setCaptureEditor} hidden={!captureOpen} />
      <div className="pw-panel-readouts pw-scroll" ref={readoutsRef} hidden={captureOpen}>{children}</div>
    </div>
  );
}
