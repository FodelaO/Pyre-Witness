/** Classifies object evidence available on a Twin asset after capture. */
import type { Asset, EquipmentKind } from "@/twin/types";
import type { RuleContext } from "./context";

const ELECTRICAL_KINDS: ReadonlySet<EquipmentKind> = new Set([
  "plc_cabinet", "hmi", "workstation", "server_rack", "firewall", "network_switch", "wifi_ap", "ip_camera",
  "gateway", "laptop", "phone", "pump", "uv_reactor", "rotary_filler", "conveyor", "labeler", "palletizer",
  "chiller_compressor", "condenser",
]);

const LIGHTER = /\blighter\b(?![- ](?:than|weight|shade|color|colour|finish|material)\b)/i;
const AEROSOL = /\baerosol(?:s)?\b(?![- ](?:free|resistant|rated|filter)\b)/i;
const BATTERY = /\b(?:batter(?:y|ies)|li[ -]?ion|lithium[ -]ion|rechargeable|power[ -]bank)\b/i;
const ELECTRICAL = /\b(?:electric(?:al)?|electronic|powered|plug[ -]in|mains[ -]operated|corded|hardwired|flashlight|charger|transformer|inverter|multimeter|soldering iron|heat gun)\b/i;
const NEGATED_POWER = /\b(?:battery[ -]free|batteryless|non[ -](?:electric(?:al)?|electronic|powered)|unpowered|(?:no|without) (?:a )?(?:batter(?:y|ies)|electric(?:al)? power))\b/gi;

type IgnitionEvidence = "lighter" | "lighter fuel" | "aerosol" | "battery-powered item" | "electrical equipment";

export function isElectricalEquipmentKind(kind: EquipmentKind): boolean {
  return ELECTRICAL_KINDS.has(kind);
}

export function ignitionEvidence(asset: Asset): IgnitionEvidence | undefined {
  // The asset retains the captured type in description and the observed material in specs.
  const type = `${asset.name} ${asset.description ?? ""}`;
  const material = asset.specs?.material ?? "";
  if (AEROSOL.test(type) || /\baerosol[ -]+propellant\b/i.test(material)) return "aerosol";
  if (LIGHTER.test(type)) return "lighter";
  if (/\blighter[ -]+(?:fuel|fluid)\b/i.test(material)) return "lighter fuel";
  const label = `${type} ${material}`.replace(NEGATED_POWER, "");
  if (BATTERY.test(label)) return "battery-powered item";
  if (isElectricalEquipmentKind(asset.physical.kind) || ELECTRICAL.test(label)
    || asset.physical.connections.some(({ medium, active }) => medium === "power" && active !== false)) {
    return "electrical equipment";
  }
}

export function isPassiveObject(asset: Asset, ctx?: RuleContext): boolean {
  if (asset.physical.kind !== "generic_device" || asset.cyber || asset.process || asset.physical.connections.length) return false;
  if (ctx?.hasNetworkLink(asset) || ctx?.hasPowerLink(asset)) return false;
  const source = ignitionEvidence(asset);
  return source !== "electrical equipment" && source !== "battery-powered item";
}
