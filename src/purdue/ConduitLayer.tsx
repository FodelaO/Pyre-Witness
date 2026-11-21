/** Shows zone boundary gates and the allowed flows for an inspected conduit. */
import { ShieldCheck } from "lucide-react";
import type { Conduit } from "@/twin/types";
import type { ConduitRoute } from "./conduits";
import type { PurdueLayout } from "./layout";
import { wirePath } from "./routing";

function GateGlyph({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 14 12" width="13" height="12" fill="none" aria-hidden="true">
      <path d={open ? "M2.5 1.5v9m9-9v9M2.5 6h3l5-3.5" : "M2.5 1.5v9m9-9v9m-9-4.5h9"} />
    </svg>
  );
}

export function MapLegend() {
  return (
    <ul className="pw-purdue-legend" aria-label="Diagram legend">
      <li><GateGlyph />Enforced</li>
      <li data-open="true"><GateGlyph open />Unenforced</li>
      <li><span className="pw-purdue-legend-path" aria-hidden="true" />Attack path</li>
    </ul>
  );
}

export function ConduitDetails({ conduit, id }: { conduit: Conduit; id: string }) {
  return (
    <aside className="pw-purdue-conduit-details" id={id} aria-label="Allowed flows">
      <div className="pw-purdue-detail-heading">
        <strong>{conduit.name}</strong>
        <span data-open={!conduit.enforcedBy}>{conduit.enforcedBy ?? "Unenforced"}</span>
      </div>
      {conduit.allows.length > 0 ? (
        <ul>{conduit.allows.map((flow, index) => <li key={index}>{flow}</li>)}</ul>
      ) : <p>No flows listed</p>}
    </aside>
  );
}

interface ConduitLayerProps {
  layout: PurdueLayout;
  routes: ConduitRoute[];
  inspected: string | null;
  detailsId: string;
  onInspect: (id: string, show: boolean) => void;
}

export function ConduitLayer({ layout, routes, inspected, detailsId, onInspect }: ConduitLayerProps) {
  return (
    <>
      <svg className="pw-purdue-conduits" width={layout.width} height={layout.height} aria-hidden="true">
        {routes.map(({ conduit, points }) => (
          <path
            key={conduit.id}
            d={wirePath(points)}
            data-open={!conduit.enforcedBy}
            data-inspected={conduit.id === inspected}
          />
        ))}
      </svg>
      {routes.map(({ conduit, gate, enforcerKind }) => (
        <button
          key={conduit.id}
          className="pw-purdue-gate"
          type="button"
          style={{ left: gate.x, top: gate.y }}
          data-open={!conduit.enforcedBy}
          data-switch={enforcerKind === "network_switch"}
          data-firewall={enforcerKind === "firewall"}
          data-conduit={conduit.id}
          data-inspected={conduit.id === inspected}
          title={conduit.name}
          aria-label={`${conduit.name} · ${conduit.enforcedBy ? `Enforced by ${conduit.enforcedBy}` : "Unenforced"}`}
          aria-describedby={conduit.id === inspected ? detailsId : undefined}
          onPointerEnter={() => onInspect(conduit.id, true)}
          onPointerLeave={(event) => {
            if (!event.currentTarget.matches(":focus-visible")) onInspect(conduit.id, false);
          }}
          onFocus={() => onInspect(conduit.id, true)}
          onBlur={(event) => {
            if (!event.currentTarget.matches(":hover")) onInspect(conduit.id, false);
          }}
          onClick={() => onInspect(conduit.id, true)}
          onKeyDown={(event) => { if (event.key === "Escape") onInspect(conduit.id, false); }}
        >
          {enforcerKind === "firewall" ? <ShieldCheck size={13} aria-hidden="true" /> : <GateGlyph open={!conduit.enforcedBy} />}
          {conduit.enforcedBy && <span>{conduit.enforcedBy}</span>}
        </button>
      ))}
    </>
  );
}
