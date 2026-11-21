/** Assigns equipment and entry markers to their lens visibility groups. */
import type { Asset, EntryPoint, EquipmentKind } from "@/twin/types";

const dataKinds: ReadonlySet<EquipmentKind> = new Set([
  "plc_cabinet", "hmi", "workstation", "server_rack", "firewall", "network_switch",
  "wifi_ap", "ip_camera", "gateway", "laptop", "phone", "usb_drive",
]);

export function lensAssetClass({ physical, cyber, process }: Asset) {
  if (physical.kind === "instrument") return "";
  const data = dataKinds.has(physical.kind) || (physical.kind === "generic_device" && !!cyber && !process);
  return data ? "lens-ghost-in-material" : "lens-ghost-in-data";
}

export function isDigitalEntry({ kind }: EntryPoint) {
  return kind === "internet" || kind === "remote" || kind === "rf";
}
