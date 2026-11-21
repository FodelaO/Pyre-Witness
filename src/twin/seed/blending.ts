/** Continuous cola blending, carbonation, and the isolated filler CIP circuit. */
import type { Asset } from "../types";
import { makeAsset, point, wired } from "./asset";

const blend = (seed: Parameters<typeof makeAsset>[2]) => makeAsset("blending", "Cell Blend", seed);
const sanitary = { material: "316L stainless steel", foodGrade: true, ipRating: "IP69K" };

export const BLENDING_ASSETS: Asset[] = [
  blend({
    id: "BL-301", name: "Agitated cola blend tank", kind: "agitated_tank", at: [850, 185], criticality: 4,
    description: "Treated water is deaerated in the inlet skid. Mass metering doses finished syrup and water to 10.6 °Bx. Low-shear agitation maintains a homogeneous buffer before carbonation.",
    connections: [{ to: "CC-301", medium: "product", label: "Still cola to carbonator" }],
    process: { medium: "product", capacityL: 4000, levelPct: 60, running: true,
      telemetry: [
        point("LT-301", "Blend tank level", 60, "%", 35, 82),
        point("FT-303", "Direct blend-water mass flow", 15103.2, "kg/h", 14700, 15500),
        point("FT-304", "Still cola mass flow", 18792, "kg/h", 18300, 19200),
      ] },
    specs: { ...sanitary, capacity: "4,000 L" },
  }),
  blend({
    id: "CC-301", name: "Carbo-cooler and saturator", kind: "carbo_cooler", at: [1050, 185], criticality: 4,
    description: "Integrated booster, hygienic glycol plate cooler, and pressurized CO₂ saturator. CO₂ injection trims to measured dissolved volumes at 2–4 °C.",
    connections: [
      { to: "P-301", medium: "product", via: [[1020, 185], [1020, 252]], label: "Cold carbonated cola" },
      { to: "EV-401", medium: "glycol", via: [[1050, 234], [1147, 234], [1147, 248], [1338, 248], [1338, 274]], label: "Glycol return at 1 °C" },
    ],
    process: { medium: "product", running: true, telemetry: [point("TT-302", "Warm cola inlet", 22, "°C", 18, 23)] },
    specs: { ...sanitary, capacity: "420 kW design" },
  }),
  blend({
    id: "P-301", name: "Carbonated product transfer pump", kind: "pump", at: [952, 252], criticality: 4,
    description: "Flooded suction and controlled discharge preserve counter-pressure to the filler bowl.",
    connections: [{ to: "FIL-3", medium: "product", via: [[952, 366], [560, 366]], label: "Pressurized cola to Filler 3" }],
    process: { medium: "product", running: true, telemetry: [point("FT-301", "Filler feed flow", 18, "m³/h", 17.6, 18.4)] },
    specs: sanitary,
  }),
  blend({
    id: "DT-301", name: "Blend density transmitter", kind: "instrument", at: [927, 208], criticality: 4,
    description: "Temperature-compensated Brix from the degassed blend upstream of CO₂ injection.",
    process: { medium: "product", telemetry: [point("DT-301", "Cola soluble solids", 10.6, "°Bx", 10.5, 10.7)] },
  }),
  blend({
    id: "QT-301", name: "Dissolved CO₂ analyzer", kind: "instrument", at: [997, 124], criticality: 4,
    process: { medium: "product", telemetry: [point("QT-301", "Dissolved CO₂", 3.7, "vol", 3.6, 3.8)] },
  }),
  blend({
    id: "TT-301", name: "Cola outlet temperature transmitter", kind: "instrument", at: [1050, 124], criticality: 4,
    process: { medium: "product", telemetry: [point("TT-301", "Cold cola outlet", 3, "°C", 2, 4)] },
  }),
  blend({
    id: "PT-301", name: "Carbonator pressure transmitter", kind: "instrument", at: [987, 229], criticality: 4,
    process: { medium: "product", telemetry: [point("PT-301", "Saturator pressure", 2.6, "bar(g)", 2.4, 2.9)] },
  }),
  blend({
    id: "TK-311", name: "CIP caustic tank", kind: "vertical_tank", at: [1074, 301], criticality: 4,
    description: "Insulated caustic make-up and recovery tank. The 2.0% w/w setpoint is verified before starting the isolated cleaning cycle.",
    connections: [{ to: "P-311", medium: "cip", active: false, label: "Caustic draw" }],
    process: { medium: "cip", capacityL: 3000, levelPct: 65, running: false,
      telemetry: [point("LT-311", "Caustic inventory", 65, "%", 40, 85), point("AT-311", "Last make-up sample", 2, "% w/w NaOH", 1.8, 2.2)] },
    specs: { ...sanitary, capacity: "3,000 L" },
  }),
  blend({
    id: "P-311", name: "CIP supply pump", kind: "pump", at: [986, 301], criticality: 4,
    description: "Stopped in production. Circulation setpoint 22 m³/h during cleaning.",
    connections: [{ to: "V-311", medium: "cip", active: false, label: "CIP header" }],
    process: { medium: "cip", running: false, telemetry: [point("FT-311", "CIP supply in production", 0, "m³/h", 0, 0)] },
    specs: sanitary,
  }),
  blend({
    id: "V-311", name: "CIP-to-product isolation valve", kind: "valve", at: [917, 301], criticality: 5, safetyCritical: true,
    description: "Normally closed, fail-closed mixproof branch to the filler feed. Closing proof is hardwired through ZSC-311 to PLC-BL and PLC-F3. Production permissive requires closure proof. CIP start additionally requires filler isolated and product feed stopped.",
    connections: [{ to: "FIL-3", medium: "cip", via: [[917, 371], [530, 371], [530, 520]], active: false, label: "Isolated CIP supply to filler feed" }],
    process: { medium: "cip", running: false }, specs: sanitary,
  }),
  blend({
    id: "ZSC-311", name: "CIP valve closed proof", kind: "instrument", at: [865, 318], criticality: 5, safetyCritical: true,
    description: "Hardwired closed position feedback. Loss of proof blocks filler production.",
    process: { medium: "cip", telemetry: [point("ZSC-311", "Closed proof in production", 1, "state", 1, 1)] },
  }),
  blend({
    id: "CT-210", name: "CIP return conductivity transmitter", kind: "instrument", at: [820, 292], criticality: 4,
    description: "Temperature-compensated conductivity verifies solution strength during the alkaline phase and rinse endpoint before product release. The displayed reading is retained from the last final rinse.",
    connections: [{ to: "TK-311", medium: "cip", via: [[820, 342], [1074, 342]], active: false, label: "Isolated CIP recovery return" }],
    process: { medium: "cip", running: false, telemetry: [point("CT-210", "Last final rinse return", 0.12, "mS/cm", 0, 0.2)] },
  }),
  blend({
    id: "TT-311", name: "CIP supply temperature transmitter", kind: "instrument", at: [1025, 269], criticality: 4,
    description: "Last verified cleaning sample. Caustic is heated to 75–80 °C for the validated wash phase.",
    process: { medium: "cip", telemetry: [point("TT-311", "Last caustic wash supply", 77, "°C", 75, 80)] },
  }),
  blend({
    id: "PLC-BL", name: "Blending and CIP controller", kind: "plc_cabinet", at: [874, 258], criticality: 5, safetyCritical: true,
    description: "Owns blend ratio, carbonation supervision and CIP sequencing. Local hardwired feedback gates product/CIP mode. The site OPC UA endpoint is read only.",
    level: 1, ip: "10.30.13.10", protocols: ["OPC UA"], cyber: wired("Blend PLC", "3.5.1"),
  }),
  blend({
    id: "SW-BL", name: "Blend cell switch", kind: "network_switch", at: [920, 130], criticality: 3,
    level: 1, conduit: "C-OPS-BLEND", ip: "10.30.13.2", protocols: ["IEEE 802.1Q", "SNMPv3"],
    cyber: wired("Industrial access switch", "4.0.3"),
    connections: [{ to: "PLC-BL", medium: "network" }],
  }),
];
