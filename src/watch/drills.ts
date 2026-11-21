/** Tabletop events used to fill gaps in the public feeds. */
import { estimateLoss } from "@/econ/model";
import type { LossScenario } from "@/econ/types";
import type { Twin } from "@/twin/types";
import type { LiveItem } from "./liveTypes";
import { classifyVuln, type VulnType } from "./vulnType";

interface WatchDrill {
  type: Exclude<VulnType, "advisory">;
  title: string;
  assetId: string;
  consequence: LossScenario["consequence"];
}

const drills: readonly WatchDrill[] = [
  { type: "ransomware", title: "Ransomware makes the line SCADA host unavailable", assetId: "SCADA-03", consequence: "processStop" },
  { type: "plcFirmware", title: "A firmware fault takes the filler controller offline", assetId: "PLC-F3", consequence: "processStop" },
  { type: "remoteAccess", title: "Suspected remote access causes DMZ firewall isolation", assetId: "FW-DMZ", consequence: "device" },
  { type: "wireless", title: "Office Wi-Fi access point is quarantined after an integrity alert", assetId: "AP-IT", consequence: "device" },
  { type: "softwareUpdate", title: "A compromised vendor update forces engineering workstation recovery", assetId: "ENG-03", consequence: "device" },
  { type: "newSoftware", title: "An unapproved remote-support tool is found on the filler HMI", assetId: "HMI-F3", consequence: "device" },
  { type: "foodRecall", title: "Undeclared ingredient on shipped labels triggers a recall", assetId: "LBL-3", consequence: "productRecall" },
];

export function missingWatchDrills(items: readonly LiveItem[], twin: Twin) {
  const liveTypes = new Set(items.map(classifyVuln));
  return drills.flatMap((drill) => {
    if (liveTypes.has(drill.type)) return [];
    const asset = twin.assets.find(({ id }) => id === drill.assetId);
    if (!asset) return [];
    const id = `drill:${drill.type}`;
    const estimate = estimateLoss(twin, {
      id,
      assetId: asset.id,
      consequence: drill.consequence,
      trigger: { kind: "watch", id, label: `Drill · ${drill.title}` },
    });
    return [{ ...drill, asset, estimate }];
  });
}
