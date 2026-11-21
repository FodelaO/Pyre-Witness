/** Classifies watch feed items without inferring plant exposure. */
import type { LiveItem } from "./liveTypes";

export const VULN_LABELS = {
  ransomware: "Ransomware",
  plcFirmware: "PLC firmware",
  remoteAccess: "Remote access",
  wireless: "Wireless",
  softwareUpdate: "Software update",
  newSoftware: "New network software",
  foodRecall: "Food safety recall",
  advisory: "Advisory",
} as const;

export type VulnType = keyof typeof VULN_LABELS;

const ransomware = /\bransomware\b/i;
const controller = /\b(?:plcs?|pac|programmable (?:logic|automation) controllers?|simatic\s+s7|modicon|(?:compact|control)logix|micro(?:logix|800))\b/i;
const newSoftware = /\b(?:new software\s+(?:on|found|detected|installed|discovered)|(?:new|unapproved|unauthorized|unrecognised|unrecognized) (?:software|application|tool|package)(?:\s+(?:was|has been))?\s+(?:found|detected|installed|discovered))\b/i;
const supplyChain = /\b(?:supply[ -]chain (?:attack|compromise|incident)|(?:malicious|compromised|tampered|trojanized|trojanised)\s+(?:(?:software|firmware|vendor|signed)\s+)?(?:update|installer|software package)|(?:update|installer)\s+(?:channel|server|mechanism))\b/i;
const wireless = /\b(?:wireless|wi[ -]?fi|wlan|bluetooth|zigbee|802\.11|wpa[23])\b/i;
const remoteAccess = /\b(?:remote[ -](?:access|desktop|support|management)|vpns?|rdp|vnc|teamviewer|anydesk|screenconnect)\b/i;

export function classifyVuln(item: Pick<LiveItem, "source" | "title" | "summary" | "product" | "ransomwareCampaign">): VulnType {
  const headline = `${item.title} ${item.product ?? ""}`;
  const text = `${headline} ${item.summary}`;
  if (item.source === "openfda" || /\b(?:food|beverage|bottled water) (?:safety )?recall\b/i.test(text)) return "foodRecall";
  if (newSoftware.test(text)) return "newSoftware";
  if (ransomware.test(text) || item.ransomwareCampaign) return "ransomware";
  if (supplyChain.test(text)) return "softwareUpdate";
  if (controller.test(text) && /\bfirmware\b/i.test(text)) return "plcFirmware";
  if (wireless.test(text)) return "wireless";
  if (remoteAccess.test(text)) return "remoteAccess";
  return "advisory";
}
