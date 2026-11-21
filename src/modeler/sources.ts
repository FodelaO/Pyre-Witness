/** Source chips for browser-session imports and prospective connectors. */
import type { ModelSourceKind } from "./types";

export const MODEL_SOURCES: ReadonlyArray<{ id: ModelSourceKind | "historian" | "cmms" | "scan"; label: string }> = [
  { id: "video", label: "Video walkthrough" },
  { id: "photos", label: "Site photos" },
  { id: "document", label: "P&ID / documents" },
  { id: "inventory", label: "Asset inventory" },
  { id: "historian", label: "Historian" },
  { id: "cmms", label: "CMMS" },
  { id: "scan", label: "Network scan" },
];
