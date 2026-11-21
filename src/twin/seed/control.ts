/** Restricted control room, site operations network, and the physical OT DMZ. */
import type { Asset } from "../types";
import { makeAsset, wired } from "./asset";

const operations = (seed: Parameters<typeof makeAsset>[2]) => makeAsset("control_room", "Site operations", seed);
const dmz = (seed: Parameters<typeof makeAsset>[2]) => makeAsset("control_room", "OT DMZ", { level: 3.5, ...seed });

export const CONTROL_ASSETS: Asset[] = [
  operations({
    id: "SCADA-03", name: "Line 3 SCADA server", kind: "server_rack", at: [153, 429], criticality: 4,
    description: "Collects tagged values from the six cell PLCs. Operators use authenticated sessions. Safety and production permissives run locally.",
    level: 2, ip: "10.30.3.20", protocols: ["OPC UA", "EtherNet/IP", "HTTPS"],
    cyber: wired("SCADA server", "2.7.0", { os: "Hardened server OS" }),
  }),
  operations({
    id: "HIST-03", name: "Site process historian", kind: "server_rack", at: [205, 429], criticality: 3,
    description: "Records process samples from SCADA for batch and quality traceability. A mutually authenticated, read-only OPC UA service supplies the DMZ replica.",
    level: 3, ip: "10.30.3.21", protocols: ["OPC UA"], cyber: wired("Process historian", "6.3.2", { os: "Hardened server OS" }),
  }),
  operations({
    id: "OPS-01", name: "Line operator workstation", kind: "workstation", at: [90, 529], criticality: 3,
    level: 2, ip: "10.30.3.31", protocols: ["HTTPS"], cyber: wired("SCADA operator station", "4.1.4", { os: "Managed operator OS" }),
  }),
  operations({
    id: "OPS-02", name: "Backup operator workstation", kind: "workstation", at: [147, 529], criticality: 3,
    level: 2, ip: "10.30.3.32", protocols: ["HTTPS"], cyber: wired("SCADA operator station", "4.1.4", { os: "Managed operator OS" }),
  }),
  operations({
    id: "ENG-03", name: "OT engineering workstation", kind: "workstation", at: [203, 529], criticality: 4,
    description: "PLC project backup and maintenance. Receives signed packages from the DMZ and accepts recorded, approved jump sessions during maintenance windows.",
    level: 3, ip: "10.30.3.30", protocols: ["HTTPS", "RDP"],
    cyber: wired("OT engineering station", "4.1.4", { os: "Managed engineering OS", remoteAccess: true }),
  }),
  operations({
    id: "SW-OT", name: "Routed OT core switch", kind: "network_switch", at: [90, 461], criticality: 4,
    description: "Routes each production cell separately using default-deny ACLs with source-address validation. Carries the site operations LAN to the DMZ boundary.",
    level: 3, conduit: "C-DMZ-OPS", ip: "10.30.3.1", protocols: ["IEEE 802.1Q", "SNMPv3"],
    cyber: wired("Routed OT core", "8.6.2", { ports: ["RJ45", "SFP+"] }),
    connections: [
      { to: "SCADA-03", medium: "network" }, { to: "HIST-03", medium: "network" },
      { to: "OPS-01", medium: "network" }, { to: "OPS-02", medium: "network" },
      { to: "ENG-03", medium: "network" },
      { to: "SW-WT", medium: "network", label: "Water cell uplink" },
      { to: "SW-SY", medium: "network", label: "Syrup cell uplink" },
      { to: "SW-BL", medium: "network", label: "Blend cell uplink" },
      { to: "SW-F3", medium: "network", label: "Filler cell uplink" },
      { to: "SW-PK", medium: "network", label: "Packaging cell uplink" },
      { to: "SW-UT", medium: "network", label: "Utility cell uplink" },
    ],
  }),
  dmz({
    id: "FW-DMZ", name: "IT/OT DMZ firewall", kind: "firewall", at: [279, 428], criticality: 4,
    description: "Three isolated interfaces face Enterprise, OT DMZ and Site operations. Default-deny policy brokers all IT/OT exchange through named DMZ services.",
    conduit: "C-DMZ-OPS", ip: "10.30.35.1", protocols: ["IEEE 802.1Q", "Syslog over TLS"],
    cyber: wired("Three-zone firewall", "9.4.2", { ports: ["RJ45", "SFP+"] }),
    connections: [
      { to: "SW-OT", medium: "network", label: "Site operations firewall interface" },
      { to: "SW-DMZ", medium: "network", label: "DMZ firewall interface" },
    ],
  }),
  dmz({
    id: "SW-DMZ", name: "DMZ access switch", kind: "network_switch", at: [278, 473], criticality: 3,
    ip: "10.30.35.2", protocols: ["IEEE 802.1Q", "SNMPv3"], cyber: wired("Managed DMZ switch", "5.0.3"),
    connections: [{ to: "HIST-DMZ", medium: "network" }, { to: "JMP-DMZ", medium: "network" }],
  }),
  dmz({
    id: "HIST-DMZ", name: "Historian replica", kind: "server_rack", at: [248, 524], criticality: 3,
    description: "Read-only mirror for enterprise reporting. ERP queries the local HTTPS copy.",
    conduit: "C-ENT-DMZ", ip: "10.30.35.20", protocols: ["OPC UA", "HTTPS"],
    cyber: wired("Historian replica", "6.3.2", { os: "Hardened server OS" }),
  }),
  dmz({
    id: "JMP-DMZ", name: "Patch repository and jump host", kind: "server_rack", at: [294, 524], criticality: 4,
    description: "Approved maintenance sessions require MFA, are time limited and recorded. The separate repository service offers signed packages for engineering to pull.",
    conduit: "C-ENT-DMZ", ip: "10.30.35.21", protocols: ["HTTPS", "RDP"],
    cyber: wired("Maintenance broker", "5.6.3", { os: "Hardened server OS", remoteAccess: true }),
  }),
];
