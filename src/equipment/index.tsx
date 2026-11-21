/**
 * Equipment registry: kind -> SVG component. Each kind lives in ./kinds/<kind>.tsx.
 * Do not add logic here; edit the kind files.
 */
import type { ReactElement } from "react";
import type { EquipmentKind } from "@/twin/types";
import type { EquipmentComponent, EquipmentProps } from "./types";
import vertical_tank from "./kinds/vertical_tank";
import bullet_tank from "./kinds/bullet_tank";
import agitated_tank from "./kinds/agitated_tank";
import pump from "./kinds/pump";
import valve from "./kinds/valve";
import instrument from "./kinds/instrument";
import ro_skid from "./kinds/ro_skid";
import uv_reactor from "./kinds/uv_reactor";
import carbo_cooler from "./kinds/carbo_cooler";
import heat_exchanger from "./kinds/heat_exchanger";
import rotary_filler from "./kinds/rotary_filler";
import conveyor from "./kinds/conveyor";
import labeler from "./kinds/labeler";
import palletizer from "./kinds/palletizer";
import chiller_compressor from "./kinds/chiller_compressor";
import condenser from "./kinds/condenser";
import plc_cabinet from "./kinds/plc_cabinet";
import hmi from "./kinds/hmi";
import workstation from "./kinds/workstation";
import server_rack from "./kinds/server_rack";
import firewall from "./kinds/firewall";
import network_switch from "./kinds/network_switch";
import wifi_ap from "./kinds/wifi_ap";
import ip_camera from "./kinds/ip_camera";
import gateway from "./kinds/gateway";
import laptop from "./kinds/laptop";
import phone from "./kinds/phone";
import usb_drive from "./kinds/usb_drive";
import generic_device from "./kinds/generic_device";

export const EQUIPMENT: Record<EquipmentKind, EquipmentComponent> = {
  vertical_tank,
  bullet_tank,
  agitated_tank,
  pump,
  valve,
  instrument,
  ro_skid,
  uv_reactor,
  carbo_cooler,
  heat_exchanger,
  rotary_filler,
  conveyor,
  labeler,
  palletizer,
  chiller_compressor,
  condenser,
  plc_cabinet,
  hmi,
  workstation,
  server_rack,
  firewall,
  network_switch,
  wifi_ap,
  ip_camera,
  gateway,
  laptop,
  phone,
  usb_drive,
  generic_device,
};

export function Equipment({ kind, ...props }: EquipmentProps & { kind: EquipmentKind }): ReactElement {
  const Component = EQUIPMENT[kind] ?? EQUIPMENT.generic_device;
  return <Component {...props} />;
}

export { FOOTPRINT } from "./types";
export type { EquipmentComponent, EquipmentProps } from "./types";
