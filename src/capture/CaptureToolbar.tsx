/** Six direct actions in the capture dock. */
"use client";

import { Camera, Link, MapPin, QrCode, TextAlignStart, Upload } from "lucide-react";
import { useDropStore } from "@/twin/dropPoint";
import { useTwinStore } from "@/twin/store";

const tools = [
  { id: "camera", label: "Camera", tip: "Open camera", Icon: Camera },
  { id: "upload", label: "Upload", tip: "Upload photos", Icon: Upload },
  { id: "link", label: "Product link", tip: "Paste product link", Icon: Link },
  { id: "text", label: "Describe device", tip: "Describe device", Icon: TextAlignStart },
  { id: "pin", label: "Pin location", tip: "Pin location", Icon: MapPin },
  { id: "phone", label: "Phone QR", tip: "Pair phone", Icon: QrCode },
] as const;

export type CaptureTool = (typeof tools)[number]["id"];

export function toggleFloorPin() {
  const drop = useDropStore.getState();
  if (drop.armed) {
    drop.disarm();
    return;
  }
  const twin = useTwinStore.getState();
  if (twin.view === "purdue") twin.setView("floor");
  drop.arm();
}

export default function CaptureToolbar({ active, onTool, uploadDisabled }: {
  active: CaptureTool | null;
  onTool: (tool: CaptureTool) => void;
  uploadDisabled: boolean;
}) {
  const armed = useDropStore((state) => state.armed);
  const pinned = useDropStore((state) => !!state.point);
  return (
    <div className="pw-tool-rail pw-capture-toolbar" role="group" aria-label="Capture device">
      {tools.map(({ id, label, tip, Icon }) => (
        <button key={id} type="button" className="pw-tool-button" data-capture-tool={id}
          data-pinned={id === "pin" && pinned} aria-label={label}
          aria-pressed={id === "pin" ? armed : undefined}
          aria-expanded={id === "pin" ? undefined : active === id}
          aria-controls={id === "pin" ? undefined : "pw-capture-editor"}
          aria-keyshortcuts={id === "camera" ? "C" : undefined}
          disabled={id === "upload" && uploadDisabled}
          data-pw-tip={id === "pin" && armed ? "Cancel pin" : tip}
          data-pw-tip-side="top" data-pw-tip-align={id === "camera" ? "start" : undefined}
          onClick={() => onTool(id)}>
          <Icon size={18} strokeWidth={1.65} aria-hidden />
        </button>
      ))}
    </div>
  );
}
