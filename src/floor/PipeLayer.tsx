/** Renders routed process lines and utility cables under the equipment. */
import { memo, useMemo } from "react";
import { MEDIA, type Asset, type Medium } from "@/twin/types";
import { roundedPath, routeMidpoint, routePoints } from "./routing";

interface PipeLayerProps {
  assets: Asset[];
  hidden: ReadonlySet<Medium>;
}

export default memo(function PipeLayer({ assets, hidden }: PipeLayerProps) {
  const pipes = useMemo(() => {
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return assets.flatMap((source) => source.physical.connections.flatMap((connection, index) => {
      const target = byId.get(connection.to);
      if (!target) return [];

      const points = routePoints(source.physical, target.physical, connection.via);
      const d = roundedPath(points);
      if (!d) return [];

      const media = MEDIA[connection.medium];
      const active = connection.active !== false && source.process?.running === true && source.status !== "offline";
      return [{
        key: `${source.id}:${index}`,
        medium: connection.medium,
        color: `var(${media.cssVar})`,
        label: media.label,
        detail: connection.label,
        d,
        center: routeMidpoint(points),
        active,
        isolated: connection.active === false,
      }];
    }));
  }, [assets]);

  return (
    <g className="pw-floor-pipes" aria-label="Pipes and cables">
      {pipes.filter((pipe) => !hidden.has(pipe.medium)).map(({ key, medium, color, label, detail, d, center, active, isolated }) => (
        <g
          key={key}
          className="pw-floor-pipe"
          data-medium={medium}
          data-isolated={isolated || undefined}
          stroke={color}
        >
          <path d={d} className="pw-floor-pipe-line" />
          {active && <path d={d} className="pw-floor-pipe-flow pw-flow" />}
          <path d={d} className="pw-floor-pipe-hit">
            <title>{detail ? `${label} · ${detail}` : label}</title>
          </path>
          <text className="pw-floor-pipe-label" x={center.x} y={center.y - 8} textAnchor="middle">
            {label}
          </text>
        </g>
      ))}
    </g>
  );
});
