/** Shows the review status of the resolution tied to a watch row. */
"use client";

import { useTwinStore } from "@/twin/store";
import { watchReceipt } from "./watchCache";
import { watchResolutionId } from "./watchResolutions";

export function WatchResolutionStatus({ itemKey }: { itemKey: string }) {
  const id = watchResolutionId(itemKey);
  const status = useTwinStore((state) => state.mitigations.find((item) => item.id === id)?.status) ?? watchReceipt(id);
  if (!status) return null;
  const decision = status === "applied" ? " · Approved" : status === "rejected" ? " · Rejected" : "";
  return <p className="pw-signal-row-meta pw-watch-resolution">Detected → Proposed{decision}</p>;
}
