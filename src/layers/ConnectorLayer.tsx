/** Shows inferred ISA-style field taps and publishes the hovered equipment data chain. */
"use client";

import { memo, useEffect, useMemo } from "react";
import { useTwinStore } from "@/twin/store";
import { FOOTPRINT } from "@/equipment/types";
import { getDataModel } from "./dataModel";
import { signalPath } from "./dataDrawing";
import { useLensStore } from "./lensStore";

function useChainHighlight(chain: readonly string[]) {
  useEffect(() => {
    if (chain.length < 2) return;
    const { highlightIds: previous, setHighlight } = useTwinStore.getState();
    const claimed = [...new Set([...previous, ...chain])];
    setHighlight(claimed);
    return () => {
      // A panel or another view can take ownership while the pointer is moving.
      if (useTwinStore.getState().highlightIds === claimed) setHighlight(previous);
    };
  }, [chain]);
}

const emptyChain: readonly string[] = [];

export default memo(function ConnectorLayer({ publishInData = false }: { publishInData?: boolean }) {
  const model = useTwinStore((state) => getDataModel(state.twin));
  const hoveredId = useTwinStore((state) => state.hoveredId);
  const highlightIds = useTwinStore((state) => state.highlightIds);
  const opacity = useLensStore((state) => state.weights.connectors);
  const visible = opacity > 0;
  const highlight = visible || publishInData;
  const chain = useMemo(() => highlight && hoveredId ? model.chainOf(hoveredId) : emptyChain,
    [model, hoveredId, highlight]);
  useChainHighlight(chain);

  const taps = useMemo(() => {
    const assets = new Map(model.assets.map((asset) => [asset.id, asset]));
    return model.signalTaps.flatMap((tap) => {
      const process = assets.get(tap.processId)?.physical;
      const device = assets.get(tap.deviceId)?.physical;
      const controller = tap.controllerId ? assets.get(tap.controllerId)?.physical : undefined;
      if (!process || !device) return [];
      const { w, h } = FOOTPRINT[process.kind];
      const angle = (process.rotation * Math.PI) / 180;
      const halfWidth = (Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle))) * (process.scale ?? 1) / 2;
      const halfHeight = (Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) * (process.scale ?? 1) / 2;
      const dx = device.x - process.x;
      const dy = device.y - process.y;
      const factor = Math.min(1, (halfWidth + 3) / Math.abs(dx), (halfHeight + 3) / Math.abs(dy));
      const anchor = { x: process.x + dx * factor, y: process.y + dy * factor };
      return [{ ...tap, anchor, processPath: signalPath(anchor, device), controlPath: controller && signalPath(device, controller) }];
    });
  }, [model]);

  const focused = useMemo(() => new Set(highlightIds), [highlightIds]);

  return (
    <g className="pw-lens-connectors" style={{ opacity }} data-visible={visible || undefined}
      aria-hidden={!visible || undefined} aria-label="Inferred ISA-style process signals" pointerEvents="none">
      {taps.map(({ processId, deviceId, controllerId, role, anchor, processPath, controlPath }) => {
        const measuring = focused.has(processId) && focused.has(deviceId);
        const controlling = controllerId !== null && focused.has(deviceId) && focused.has(controllerId);
        return (
          <g key={`${processId}:${deviceId}`} className="pw-lens-tap" data-role={role}>
            <path d={processPath} className="pw-lens-signal" data-active={measuring || undefined} />
            {controlPath && <path d={controlPath} className="pw-lens-signal pw-lens-control-signal"
              data-active={controlling || undefined} />}
            <circle cx={anchor.x} cy={anchor.y} r={measuring ? 3.5 : 2.4} className="pw-lens-tap-dot"
              data-active={measuring || undefined} />
          </g>
        );
      })}
    </g>
  );
});
