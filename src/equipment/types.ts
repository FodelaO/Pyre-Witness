/**
 * Contract for the parametric SVG equipment library. Shared contract — see AGENTS.md.
 *
 * Every kind lives in src/equipment/kinds/<kind>.tsx and default-exports an EquipmentComponent.
 * A component renders an SVG <g> CENTRED ON (0,0) in floor units, sized to FOOTPRINT[kind]
 * (the parent applies translate / rotate / scale). No external images, no <svg> root.
 */
import type { ReactElement } from "react";
import type { AssetStatus, EquipmentKind, Medium } from "@/twin/types";

export interface EquipmentProps {
  /** Tag drawn with the symbol, e.g. "TK-301". */
  label?: string;
  /** 0..1 liquid level for vessels (animated). */
  level?: number;
  /** Tints liquid / accents with the medium colour. */
  medium?: Medium;
  /** Animates impellers, fans, carousels, belts, radio waves. */
  running?: boolean;
  status?: AssetStatus;
  selected?: boolean;
  /** Linked-selection / hover highlight from the other view. */
  highlighted?: boolean;
  /** Added devices: green outline = recommended spot, red = unsafe. */
  placement?: "recommended" | "unsafe" | "neutral";
  /** e.g. "2,000 L". */
  capacityLabel?: string;
  /** Instrument bubble letters, e.g. "LT", "TT", "CT" (ISA-5.1). */
  letters?: string;
  /** Smaller, label-free rendering for the Purdue map and lists. */
  compact?: boolean;
}

export type EquipmentComponent = (props: EquipmentProps) => ReactElement;

/** Default footprint (floor units) of each symbol at scale 1. Used for layout and hit-testing. */
export const FOOTPRINT: Record<EquipmentKind, { w: number; h: number }> = {
  vertical_tank: { w: 64, h: 64 },
  bullet_tank: { w: 120, h: 48 },
  agitated_tank: { w: 72, h: 72 },
  pump: { w: 34, h: 28 },
  valve: { w: 26, h: 22 },
  instrument: { w: 22, h: 22 },
  ro_skid: { w: 96, h: 56 },
  uv_reactor: { w: 70, h: 26 },
  carbo_cooler: { w: 90, h: 60 },
  heat_exchanger: { w: 60, h: 40 },
  rotary_filler: { w: 130, h: 130 },
  conveyor: { w: 160, h: 22 },
  labeler: { w: 70, h: 60 },
  palletizer: { w: 96, h: 90 },
  chiller_compressor: { w: 84, h: 54 },
  condenser: { w: 120, h: 56 },
  plc_cabinet: { w: 34, h: 44 },
  hmi: { w: 34, h: 30 },
  workstation: { w: 40, h: 34 },
  server_rack: { w: 34, h: 52 },
  firewall: { w: 40, h: 28 },
  network_switch: { w: 44, h: 18 },
  wifi_ap: { w: 30, h: 30 },
  ip_camera: { w: 30, h: 24 },
  gateway: { w: 32, h: 24 },
  laptop: { w: 34, h: 26 },
  phone: { w: 16, h: 28 },
  usb_drive: { w: 26, h: 12 },
  generic_device: { w: 30, h: 30 },
};
