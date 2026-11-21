/** Opens the capture action fan from a single dock button. */
"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { Camera, Link, MapPin, Plus, QrCode, TextAlignStart, Upload } from "lucide-react";
import { useDropStore } from "@/twin/dropPoint";

const tools = [
  { id: "camera", label: "Camera", short: "Camera", Icon: Camera },
  { id: "upload", label: "Upload", short: "Upload", Icon: Upload },
  { id: "link", label: "Product link", short: "Link", Icon: Link },
  { id: "text", label: "Describe device", short: "Describe", Icon: TextAlignStart },
  { id: "phone", label: "Phone QR", short: "Phone", Icon: QrCode },
] as const;

export type CaptureTool = (typeof tools)[number]["id"];
export const TECHNOLOGY_CAPTURE = "Integrate a new technology";
const dataTools = [...tools.slice(2, 4), ...tools.slice(0, 2), ...tools.slice(4)];

export default function CaptureToolbar({ active, addButton, expanded, onExpandedChange, onTool, running, dataFirst }: {
  active: CaptureTool | null;
  addButton: RefObject<HTMLButtonElement | null>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onTool: (tool: CaptureTool) => void;
  running: boolean;
  dataFirst: boolean;
}) {
  const armed = useDropStore((state) => state.armed);
  const launcher = useRef<HTMLDivElement>(null);
  const fanId = useId();
  const statusId = `${fanId}-status`;

  useEffect(() => {
    if (!expanded) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !launcher.current?.contains(event.target)) onExpandedChange(false);
    }
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [expanded, onExpandedChange]);

  return (
    <div className="pw-capture-launcher" ref={launcher}>
      <button ref={addButton} type="button" className="pw-tool-button pw-capture-add" aria-label="Add a device"
        aria-expanded={expanded} aria-controls={fanId} aria-keyshortcuts="Plus N"
        aria-describedby={running || armed ? statusId : undefined} disabled={running}
        data-pw-tip={expanded ? undefined : "Add a device (+ / N)"} data-pw-tip-side="top" data-pw-tip-align="start"
        onClick={() => onExpandedChange(!expanded)}>
        <Plus className="pw-capture-add-icon" size={23} strokeWidth={1.7} aria-hidden />
        {running && <span className="pw-capture-add-ring" aria-hidden />}
        {armed && <span className="pw-capture-add-pin" aria-hidden><MapPin size={11} strokeWidth={2} /></span>}
      </button>
      {(running || armed) && <span id={statusId} className="pw-capture-sr-only">{running ? "Analysis in progress" : "Pin armed"}</span>}
      <div id={fanId} className="pw-capture-toolbar" role="group"
        aria-label={dataFirst ? TECHNOLOGY_CAPTURE : "Capture device"} hidden={!expanded}>
        {(dataFirst ? dataTools : tools).map(({ id, label, short, Icon }) => (
          <button key={id} type="button" className="pw-tool-button" aria-label={label}
            aria-expanded={active === id} aria-controls="pw-capture-editor"
            aria-keyshortcuts={id === "camera" ? "C" : undefined}
            onClick={() => {
              onExpandedChange(false);
              addButton.current?.focus({ preventScroll: true });
              onTool(id);
            }}>
            <Icon size={18} strokeWidth={1.65} aria-hidden />
            <span>{short}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
