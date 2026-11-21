"use client";

/** BOOTSTRAP STUB of the results side panel (replaced by the capture-panel task). */
import { useTwinStore } from "@/twin/store";

export default function SidePanel() {
  const risk = useTwinStore((s) => s.risk);
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-pw-faint">Plant risk</div>
      <div className="pw-mono mt-1 text-4xl font-semibold">{Math.round(risk.score)}</div>
    </div>
  );
}
