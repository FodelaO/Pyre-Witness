/** Draws proposed additions in floor coordinates until they are rejected or applied. */
"use client";

import { Equipment, FOOTPRINT } from "@/equipment";
import { useModelerStore } from "./modelerStore";

export default function GhostLayer() {
  const proposal = useModelerStore((state) => state.proposal);
  const votes = useModelerStore((state) => state.votes);
  const preview = useModelerStore((state) => state.previewId);
  if (!proposal?.additions.length) return null;
  const items = new Map(proposal.items.flatMap(({ id, outcome }) =>
    outcome.action === "new_asset" ? [[outcome.assetId, id] as const] : []));

  return (
    <g className="pw-model-ghost" pointerEvents="none" aria-hidden="true">
      {proposal.additions.map(({ id, physical }) => {
        const item = items.get(id);
        if (!item || votes[item] === "reject" || votes[item] === "applied") return null;
        const { x, y, rotation, kind, scale = 1 } = physical;
        const { w, h } = FOOTPRINT[kind];
        const focused = item === preview;
        const stroke = votes[item] === "accept" ? "var(--pw-ok, #34d399)" : "var(--pw-eq-accent, #d2deea)";
        return (
          <g key={id} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
            opacity={focused ? 1 : 0.7}>
            <rect x={-w / 2 - 5} y={-h / 2 - 5} width={w + 10} height={h + 10} rx={5}
              fill="var(--pw-panel, #0e151d)" fillOpacity={0.76} stroke={stroke} strokeWidth={focused ? 2.6 : 1.6}
              strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
            <g className="pw-model-ghost-glyph" opacity={focused ? 0.88 : 0.62}><Equipment kind={kind} compact /></g>
            <text y={h / 2 + 16} fill={stroke} textAnchor="middle" className="pw-mono" fontSize={9}>{id}</text>
          </g>
        );
      })}
    </g>
  );
}
