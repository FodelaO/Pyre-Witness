/** Renders accessible equipment cards, collapsed field groups, and entry points. */
import { Boxes, ChevronDown, Globe, Laptop, Radio, Truck, UserRound } from "lucide-react";
import type { PointerEvent } from "react";
import { Equipment, FOOTPRINT } from "@/equipment";
import type { Asset, EntryPoint } from "@/twin/types";
import type { Box, PurdueLayout } from "./layout";

function position({ x, y, w, h }: Box) {
  return { left: x, top: y, width: w, height: h };
}

const ENTRY_ICONS = {
  internet: Globe,
  remote: Laptop,
  rf: Radio,
  physical: UserRound,
  supply: Truck,
} satisfies Record<EntryPoint["kind"], typeof Globe>;

interface NodeLayerProps {
  layout: PurdueLayout;
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  linkedEntries: ReadonlySet<string>;
  activeZones: ReadonlySet<string>;
  draggedId?: string;
  onSelect: (id: string | null) => void;
  onHover: (id: string, entered: boolean) => void;
  onToggleFields: (area: string) => void;
  onDragStart?: (event: PointerEvent<HTMLButtonElement>, asset: Asset) => void;
}

export function NodeLayer({
  layout,
  selectedId,
  highlighted,
  linkedEntries,
  activeZones,
  draggedId,
  onSelect,
  onHover,
  onToggleFields,
  onDragStart,
}: NodeLayerProps) {
  return (
    <>
      {layout.entries.map(({ entry, external, ...box }) => {
        const Icon = ENTRY_ICONS[entry.kind];
        return (
          <button
            key={entry.id}
            type="button"
            className="pw-purdue-entry"
            data-external={external}
            data-entry={entry.id}
            data-highlighted={highlighted.has(entry.id) || linkedEntries.has(entry.id)}
            aria-pressed={entry.id === selectedId}
            aria-label={entry.name}
            title={entry.name}
            onClick={() => onSelect(entry.id)}
            onPointerEnter={(event) => { if (event.pointerType !== "touch") onHover(entry.id, true); }}
            onPointerLeave={() => onHover(entry.id, false)}
            style={position(box)}
          >
            <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
            {external && <span>{entry.name}</span>}
          </button>
        );
      })}
      {layout.fieldGroups.map(({ zone, count, expanded, ...box }) => (
        <button
          key={zone}
          type="button"
          className="pw-purdue-group"
          aria-expanded={expanded}
          aria-label={`${zone}, ${count} field devices`}
          title={`${count} field devices`}
          data-zone-active={activeZones.has(zone)}
          style={position(box)}
          onClick={() => onToggleFields(zone)}
        >
          <Boxes size={12} strokeWidth={1.6} aria-hidden="true" />
          <span>{count}</span>
          <ChevronDown size={9} strokeWidth={1.8} className="pw-purdue-group-chevron" aria-hidden="true" />
        </button>
      ))}
      {layout.cards.map(({ asset, mini, ...box }) => {
        const { id, name, origin, placement, physical, status, network } = asset;
        const footprint = FOOTPRINT[physical.kind];
        const letters = physical.kind === "instrument" ? id.match(/^([A-Z]{1,3})-(\d{1,4})$/) : null;
        const fieldGlyph = mini && letters && box.w >= 36;
        const selected = id === selectedId;
        const linked = highlighted.has(id);
        return (
          <button
            key={id}
            type="button"
            className="pw-purdue-node"
            data-asset={id}
            data-mini={mini}
            data-firewall={physical.kind === "firewall"}
            data-added={origin === "added"}
            data-dragging={id === draggedId}
            data-placement={placement}
            data-hovered={linked}
            data-zone-active={activeZones.has(network.area)}
            aria-pressed={selected}
            aria-label={`${id} · ${name}`}
            title={`${id} · ${name}`}
            onClick={() => onSelect(id)}
            onPointerEnter={(event) => { if (event.pointerType !== "touch") onHover(id, true); }}
            onPointerLeave={() => onHover(id, false)}
            onPointerDown={origin === "added" && onDragStart ? (event) => onDragStart(event, asset) : undefined}
            style={position(box)}
          >
            {(!mini || !layout.compact || fieldGlyph) && (
              <svg
                className="pw-purdue-symbol"
                viewBox={fieldGlyph ? "-10 -10 20 20" : `${-footprint.w / 2 - 3} ${-footprint.h / 2 - 3} ${footprint.w + 6} ${footprint.h + 6}`}
                aria-hidden="true"
              >
                <Equipment kind={physical.kind} status={status} selected={selected} highlighted={linked} letters={letters?.[1]} compact />
              </svg>
            )}
            <span className="pw-purdue-tag">{fieldGlyph ? letters[2] : id}</span>
          </button>
        );
      })}
    </>
  );
}
