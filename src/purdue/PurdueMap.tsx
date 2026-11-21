"use client";

/**
 * BOOTSTRAP STUB of the Purdue network map (replaced by the purdue-view task).
 */
import { useTwinStore } from "@/twin/store";
import { PURDUE_LEVELS } from "@/twin/types";

export default function PurdueMap() {
  const assets = useTwinStore((s) => s.twin.assets);
  const selectedId = useTwinStore((s) => s.selectedId);
  const select = useTwinStore((s) => s.select);
  return (
    <div className="pw-scroll h-full overflow-auto p-4">
      {PURDUE_LEVELS.map((lvl) => (
        <div key={lvl.level} className="flex min-h-14 items-center gap-3 border-b border-pw-line py-2">
          <div className="w-36 shrink-0">
            <div className="pw-mono text-[10px] text-pw-faint">L{lvl.level}</div>
            <div className="text-xs text-pw-dim">{lvl.name}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {assets
              .filter((a) => a.network.level === lvl.level)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => select(a.id)}
                  className={`pw-mono rounded border px-1.5 py-0.5 text-[10px] ${
                    a.id === selectedId ? "border-pw-text text-pw-text" : "border-pw-line text-pw-dim"
                  }`}
                >
                  {a.id}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
