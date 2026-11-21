/** Enterprise endpoints, wireless access, and the internet perimeter. */
import type { Asset } from "../types";
import { makeAsset, wired } from "./asset";

const enterprise = (seed: Parameters<typeof makeAsset>[2]) => makeAsset("corporate_office", "Enterprise", { level: 4, ...seed });

export const ENTERPRISE_ASSETS: Asset[] = [
  enterprise({
    id: "FW-EDGE", name: "Enterprise internet edge firewall", kind: "firewall", at: [105, 790], criticality: 4,
    description: "Internet boundary with egress filtering and a dedicated authenticated vendor VPN pool. Vendor sessions reach only the approved DMZ portal.",
    conduit: "C-WAN-ENT", ip: "10.40.4.1", protocols: ["IKEv2", "IPsec", "Syslog over TLS"],
    cyber: wired("Internet edge firewall", "9.4.2", { ports: ["RJ45", "SFP+"], remoteAccess: true }),
    connections: [{ to: "SW-IT", medium: "network" }],
  }),
  enterprise({
    id: "SW-IT", name: "Corporate access switch", kind: "network_switch", at: [174, 790], criticality: 3,
    conduit: "C-ENT-DMZ", ip: "10.40.4.2", protocols: ["IEEE 802.1Q", "SNMPv3"], cyber: wired("Corporate access switch", "5.0.3"),
    connections: [
      { to: "FW-DMZ", medium: "network", label: "Enterprise firewall interface" },
      { to: "ERP-01", medium: "network" }, { to: "IT-WS1", medium: "network" },
      { to: "IT-WS2", medium: "network" }, { to: "AP-IT", medium: "network" },
    ],
  }),
  enterprise({
    id: "ERP-01", name: "Production reporting ERP", kind: "server_rack", at: [238, 791], criticality: 3,
    description: "Consumes released batch records from the DMZ replica over HTTPS.",
    ip: "10.40.4.20", protocols: ["HTTPS"], cyber: wired("ERP server", "7.2.1", { os: "Managed server OS" }),
  }),
  enterprise({
    id: "IT-WS1", name: "Planning workstation", kind: "workstation", at: [298, 798], criticality: 2,
    ip: "10.40.4.31", protocols: ["HTTPS"], cyber: wired("Office workstation", "4.1.4", { os: "Managed desktop OS" }),
  }),
  enterprise({
    id: "IT-WS2", name: "Shipping workstation", kind: "workstation", at: [358, 798], criticality: 2,
    ip: "10.40.4.32", protocols: ["HTTPS"], cyber: wired("Office workstation", "4.1.4", { os: "Managed desktop OS" }),
  }),
  enterprise({
    id: "AP-IT", name: "Office Wi-Fi access point", kind: "wifi_ap", at: [420, 811], criticality: 2,
    description: "Enterprise-only Wi-Fi authenticated with device certificates. The RF footprint reaches the south parking area.",
    ip: "10.40.4.40", protocols: ["WPA3-Enterprise", "802.1X"], cyber: wired("Office access point", "7.1.1", { radios: ["wifi"] }),
  }),
];
