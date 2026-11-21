/** Assumed bill of materials for the simulated plant, joined to the current twin's exposure. */
import type { Twin } from "@/twin/types";
import type { InventoryEntry } from "./types";

type Product = Pick<InventoryEntry, "vendor" | "product" | "version" | "vendorAliases" | "productAliases">;

const stratix: Product = {
  vendor: "Rockwell Automation", product: "Stratix 5700", version: "15.2(8)E3",
  vendorAliases: ["Allen-Bradley", "Rockwell"], productAliases: ["Stratix 5400 and 5700"],
};
const scalance: Product = {
  vendor: "Siemens", product: "SCALANCE XC-200", version: "4.4.1", productAliases: ["SCALANCE XC200"],
};
const cont = {
  vendor: "Rockwell Automation", product: "CompactLogix 5380", version: "35.011",
  vendorAliases: ["Allen-Bradley", "Rockwell"], productAliases: ["CompactLogix 5380 Controllers", "1769 CompactLogix 5380"],
} satisfies Product;
const powerflex: Product = {
  vendor: "Rockwell Automation", product: "PowerFlex 525", version: "7.001",
  vendorAliases: ["Allen-Bradley", "Rockwell"], productAliases: ["PowerFlex 520-Series"],
};
const historian: Product = {
  vendor: "AVEVA", product: "PI Data Archive", version: "3.4.455.1195", vendorAliases: ["OSIsoft"],
  productAliases: ["PI Server", "OSIsoft PI Data Archive", "AVEVA PI System"],
};
const catalyst: Product = {
  vendor: "Cisco", product: "Catalyst 9300", version: "17.9.5", productAliases: ["IOS XE", "Catalyst 9000"],
};

export const ASSUMED_BOM: Readonly<Record<string, Product>> = {
  "PLC-WT": cont,
  "PLC-SY": cont,
  "PLC-F3": {
    vendor: "Rockwell Automation", product: "ControlLogix 5580", version: "35.011",
    vendorAliases: ["Allen-Bradley", "Rockwell"], productAliases: ["ControlLogix 5580 Controllers", "1756-L8"],
  },
  "PLC-BL": { vendor: "Siemens", product: "SIMATIC S7-1500", version: "3.1.3", productAliases: ["S7-1500"] },
  "PLC-PK": { vendor: "Siemens", product: "SIMATIC S7-1200", version: "4.6.1", productAliases: ["S7-1200"] },
  "PLC-UT": { vendor: "Schneider Electric", product: "Modicon M580 Safety", version: "4.20", productAliases: ["Modicon M580"] },
  "HMI-F3": {
    vendor: "Rockwell Automation", product: "PanelView Plus 7", version: "12.105",
    vendorAliases: ["Allen-Bradley", "Rockwell"], productAliases: ["PanelView Plus 7 Performance"],
  },
  "HMI-PK": { vendor: "Siemens", product: "SIMATIC HMI Unified Comfort Panel", version: "19.0.0", productAliases: ["Unified Comfort Panel", "Unified Comfort Panels"] },
  "SCADA-03": { vendor: "Inductive Automation", product: "Ignition", version: "8.1.38", productAliases: ["Ignition SCADA"] },
  "HIST-03": historian,
  "HIST-DMZ": historian,
  "JMP-DMZ": { vendor: "Microsoft", product: "Windows Server 2022", version: "10.0.20348", productAliases: ["Windows Server", "Remote Desktop Gateway"] },
  "FW-EDGE": { vendor: "Fortinet", product: "FortiOS", version: "7.2.9", productAliases: ["FortiGate"] },
  "FW-DMZ": { vendor: "Palo Alto Networks", product: "PAN-OS", version: "11.1.4", productAliases: ["PAN OS"] },
  "SW-WT": stratix,
  "SW-SY": stratix,
  "SW-F3": stratix,
  "SW-BL": scalance,
  "SW-PK": scalance,
  "SW-UT": { vendor: "Schneider Electric", product: "ConneXium Industrial Managed Switch", version: "9.0.18", productAliases: ["ConneXium"] },
  "SW-OT": catalyst,
  "SW-DMZ": catalyst,
  "SW-IT": catalyst,
  "AP-IT": { vendor: "HPE Aruba Networking", product: "Aruba AP-515", version: "8.10.0.10", vendorAliases: ["Aruba", "HPE"], productAliases: ["ArubaOS", "Aruba InstantOS", "AP-515"] },
  "GW-PK": { vendor: "Sierra Wireless", product: "AirLink RV50X", version: "4.17.0", vendorAliases: ["Semtech"], productAliases: ["RV50X", "AirLink ALEOS", "ALEOS"] },
  "P-102": powerflex,
  "P-203": powerflex,
  "LBL-3": { vendor: "Siemens", product: "SINAMICS G120", version: "4.7.13", productAliases: ["SINAMICS G120C"] },
  "C-1": { vendor: "Danfoss", product: "VLT AutomationDrive FC 302", version: "8.46", productAliases: ["AutomationDrive", "FC 302"] },
  "C-2": { vendor: "Danfoss", product: "VLT AutomationDrive FC 302", version: "8.46", productAliases: ["AutomationDrive", "FC 302"] },
};

export function inventoryFor(assetId: string): Readonly<Product> | undefined {
  return Object.hasOwn(ASSUMED_BOM, assetId) ? ASSUMED_BOM[assetId] : undefined;
}

export function inventoryForTwin(twin: Twin): InventoryEntry[] {
  const internetEdges = new Set(twin.conduits
    .filter(({ from, to }) => [from, to].includes("Internet / Cloud"))
    .map(({ enforcedBy }) => enforcedBy));

  return twin.assets.flatMap((asset) => {
    const { id, cyber, network, origin } = asset;
    const assumed = origin === "seed" ? inventoryFor(id) : undefined;
    const vendor = cyber?.vendor?.trim();
    const model = cyber?.model?.trim();
    const product = vendor && model && vendor.toLowerCase() !== "fictional plant inventory" ? {
      ...(assumed?.vendor === vendor && assumed.product === model ? assumed : {}),
      vendor, product: model, version: cyber?.firmware?.trim() || undefined,
    } : assumed;
    if (!product) return [];
    return [{
      ...product,
      assetId: id,
      identity: origin === "seed" ? "assumed" : "capture",
      criticality: asset.criticality,
      exposure: {
        level: network.level,
        zone: network.area,
        conduit: network.conduit,
        protocols: network.protocols ?? [],
        internetFacing: network.level === 5 || internetEdges.has(id),
        remoteAccess: cyber?.remoteAccess ?? false,
        cloudConnected: cyber?.cloudConnected ?? false,
        radios: cyber?.radios ?? [],
      },
    }];
  });
}
