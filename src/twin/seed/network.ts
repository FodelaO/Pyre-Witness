/** Purdue zone boundaries and the permitted traffic on each IEC 62443 conduit. */
import type { Conduit } from "../types";

export const SEED_CONDUITS: Conduit[] = [
  {
    id: "C-WAN-ENT",
    name: "Internet to enterprise edge",
    from: "Internet / Cloud",
    to: "Enterprise",
    enforcedBy: "FW-EDGE",
    allows: ["HTTPS 443 outbound via the enterprise edge", "IKEv2 500/4500 only to the managed vendor VPN gateway"],
  },
  {
    id: "C-ENT-DMZ",
    name: "Enterprise to DMZ",
    from: "Enterprise",
    to: "OT DMZ",
    enforcedBy: "FW-DMZ",
    allows: ["HTTPS 443 from ERP to historian replica (read only)", "HTTPS 443 from approved VPN pool to MFA jump portal"],
  },
  {
    id: "C-DMZ-OPS",
    name: "DMZ to site operations",
    from: "OT DMZ",
    to: "Site operations",
    enforcedBy: "FW-DMZ",
    allows: [
      "OPC UA 4840 from DMZ replica to site historian (read only, mutual certificates)",
      "HTTPS 443 from OT engineering to signed patch repository",
      "RDP 3389 from approved jump sessions to engineering workstation (time limited and recorded)",
    ],
  },
  {
    id: "C-OPS-WATER", name: "Operations to water treatment", from: "Site operations", to: "Cell Water", enforcedBy: "SW-OT",
    allows: ["OPC UA TCP 4840 from SCADA-03 to PLC-WT (read only)"],
  },
  {
    id: "C-OPS-SYRUP", name: "Operations to syrup room", from: "Site operations", to: "Cell Syrup", enforcedBy: "SW-OT",
    allows: ["OPC UA TCP 4840 from SCADA-03 to PLC-SY (read only)"],
  },
  {
    id: "C-OPS-BLEND", name: "Operations to blending", from: "Site operations", to: "Cell Blend", enforcedBy: "SW-OT",
    allows: ["OPC UA TCP 4840 from SCADA-03 to PLC-BL (read only)"],
  },
  {
    id: "C-OPS-F3", name: "Operations to filler 3", from: "Site operations", to: "Cell F3", enforcedBy: "SW-OT",
    allows: ["EtherNet/IP TCP 44818 from SCADA-03 to PLC-F3 for supervision"],
  },
  {
    id: "C-OPS-PACK", name: "Operations to packaging", from: "Site operations", to: "Cell Pack", enforcedBy: "SW-OT",
    allows: ["OPC UA TCP 4840 from SCADA-03 to PLC-PK for supervision"],
  },
  {
    id: "C-OPS-UTIL", name: "Operations to utilities", from: "Site operations", to: "Cell Utilities", enforcedBy: "SW-OT",
    allows: ["OPC UA TCP 4840 from SCADA-03 to PLC-UT (read only)"],
  },
  // WEAKNESS: A legacy unmanaged L2 cross-link bypasses the routed intercell policy.
  {
    id: "C-F3-PACK", name: "Legacy filler-to-packaging link", from: "Cell F3", to: "Cell Pack", enforcedBy: null,
    allows: ["Shared Layer 2 broadcast domain; no intercell ACL on the legacy link"],
  },
];
