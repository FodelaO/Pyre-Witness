/**
 * Pyre Witness — digital twin data model. SINGLE SOURCE OF TRUTH for every feature.
 *
 * Every asset has BOTH a physical presence (plant floor) and a network presence (Purdue map).
 * Shared contract: do not rename or reshape exports without coordinating (see AGENTS.md).
 * Floor coordinates: SVG user units in a 1600 x 1000 canvas, 10 units = 1 metre.
 */

// ───────────────────────────── Purdue model ─────────────────────────────

/** Purdue Enterprise Reference Architecture levels. 3.5 is the IT/OT DMZ. */
export type PurdueLevel = 0 | 1 | 2 | 3 | 3.5 | 4 | 5;

export const PURDUE_LEVELS: ReadonlyArray<{ level: PurdueLevel; name: string; blurb: string }> = [
  { level: 5, name: "Internet / Cloud", blurb: "Vendor clouds, remote access, public internet" },
  { level: 4, name: "Enterprise IT", blurb: "ERP, e-mail, office network" },
  { level: 3.5, name: "IT/OT DMZ", blurb: "Brokered access between IT and OT" },
  { level: 3, name: "Site operations", blurb: "MES, historian, engineering" },
  { level: 2, name: "Area supervisory", blurb: "HMI, SCADA, line supervision" },
  { level: 1, name: "Basic control", blurb: "PLCs, drives, safety controllers" },
  { level: 0, name: "Physical process", blurb: "Sensors, actuators, vessels, machines" },
];

// ───────────────────────────── Media (pipes & cables) ─────────────────────────────

export type Medium =
  | "water"
  | "syrup"
  | "product"
  | "co2"
  | "glycol"
  | "ammonia"
  | "cip"
  | "power"
  | "network";

export const MEDIA: Record<Medium, { label: string; cssVar: string; process: boolean }> = {
  water: { label: "Water", cssVar: "--pw-m-water", process: true },
  syrup: { label: "Syrup", cssVar: "--pw-m-syrup", process: true },
  product: { label: "Product (cola)", cssVar: "--pw-m-product", process: true },
  co2: { label: "CO2", cssVar: "--pw-m-co2", process: true },
  glycol: { label: "Glycol", cssVar: "--pw-m-glycol", process: true },
  ammonia: { label: "NH3", cssVar: "--pw-m-ammonia", process: true },
  cip: { label: "CIP caustic", cssVar: "--pw-m-cip", process: true },
  power: { label: "Power", cssVar: "--pw-m-power", process: false },
  network: { label: "Network", cssVar: "--pw-m-network", process: false },
};

// ───────────────────────────── Areas ─────────────────────────────

export type AreaId =
  // production + support areas
  | "water_treatment"
  | "syrup_room"
  | "blending"
  | "filler3"
  | "packaging"
  | "utilities"
  | "control_room"
  | "corporate_office"
  | "crew_office"
  // physical context zones (overlays / outside)
  | "parking_lot"
  | "visitor_corridor"
  | "nh3_hazard"
  | "washdown";

export interface AreaAttrs {
  /** Visitors or outsiders can physically be here without a badge. */
  publicAccess: boolean;
  outdoor: boolean;
  /** Badge-controlled room (e.g. the restricted control room). */
  restricted: boolean;
  /** Food-grade high-pressure washdown zone: needs IP69K-class ingress protection and 316L/hygienic design. */
  washdown: boolean;
  /** Classified hazard present in this zone. */
  hazard: null | "NH3" | "CO2" | "caustic";
  /** Open product / product-contact surfaces present. */
  foodContact: boolean;
}

export interface Area {
  id: AreaId;
  name: string;
  /** process = makes product, support = rooms/offices/utilities, context = overlay or outside zone. */
  kind: "process" | "support" | "context";
  /** Axis-aligned bounds in floor units. */
  bounds: { x: number; y: number; w: number; h: number };
  attrs: AreaAttrs;
  /** Purdue levels of equipment that normally lives here (placement hint). */
  typicalLevels: PurdueLevel[];
  status: "normal" | "attention" | "alarm";
  /** Short status tag shown on the floor, e.g. "Running 36,000 bph". */
  statusNote?: string;
}

// ───────────────────────────── Equipment kinds (SVG component library) ─────────────────────────────

export const EQUIPMENT_KINDS = [
  // process
  "vertical_tank",
  "bullet_tank",
  "agitated_tank",
  "pump",
  "valve",
  "instrument",
  "ro_skid",
  "uv_reactor",
  "carbo_cooler",
  "heat_exchanger",
  "rotary_filler",
  "conveyor",
  "labeler",
  "palletizer",
  "chiller_compressor",
  "condenser",
  // control, IT and devices
  "plc_cabinet",
  "hmi",
  "workstation",
  "server_rack",
  "firewall",
  "network_switch",
  "wifi_ap",
  "ip_camera",
  "gateway",
  "laptop",
  "phone",
  "usb_drive",
  "generic_device",
] as const;

export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

// ───────────────────────────── Assets ─────────────────────────────

export interface Connection {
  /** Target asset id. */
  to: string;
  medium: Medium;
  /** Optional routing waypoints in floor units (orthogonal pipe runs). */
  via?: [number, number][];
  /** False = line is isolated / valve closed (no flow animation). Default true. */
  active?: boolean;
  label?: string;
}

export interface PhysicalPresence {
  area: AreaId;
  /** Centre of the symbol, floor units. */
  x: number;
  y: number;
  /** Degrees clockwise. */
  rotation: number;
  kind: EquipmentKind;
  /** Scale multiplier on the symbol's default footprint. Default 1. */
  scale?: number;
  connections: Connection[];
}

export interface NetworkPresence {
  level: PurdueLevel;
  /** Network zone / cell name in IEC 62443 terms, e.g. "Cell F3", "OT DMZ", "Enterprise". */
  area: string;
  /** Conduit id this asset talks through (see Conduit), or null if isolated / not networked. */
  conduit: string | null;
  ip?: string;
  protocols?: string[];
}

export type Radio = "wifi" | "bluetooth" | "cellular" | "zigbee" | "lora" | "nfc";

export const RADIOS: readonly Radio[] = ["wifi", "bluetooth", "cellular", "zigbee", "lora", "nfc"];

/** Cyber-relevant facts the deterministic rules engine reasons over. */
export interface CyberProfile {
  vendor?: string;
  model?: string;
  firmware?: string;
  os?: string;
  radios: Radio[];
  /** Exposed physical ports, e.g. "RJ45", "USB-A", "RS-485", "SD". */
  ports: string[];
  removableStorage: boolean;
  /** Talks to a vendor cloud or the public internet. */
  cloudConnected: boolean;
  defaultCredentials: boolean;
  /** Vendor / remote maintenance access path exists. */
  remoteAccess: boolean;
  /** Under plant asset management + patching. */
  managed: boolean;
}

export interface TelemetryPoint {
  /** ISA-5.1 style tag, e.g. "LT-301". */
  tag: string;
  label: string;
  value: number;
  unit: string;
  /** Normal operating band. Outside it = anomaly. */
  lo?: number;
  hi?: number;
}

export interface ProcessProfile {
  medium?: Medium;
  capacityL?: number;
  /** 0..100 */
  levelPct?: number;
  running?: boolean;
  telemetry?: TelemetryPoint[];
}

export interface AssetSpecs {
  capacity?: string | null;
  material?: string | null;
  foodGrade?: boolean | null;
  /** e.g. "ATEX Zone 2", "Class I Div 2", or null when not rated. */
  hazardRating?: string | null;
  /** e.g. "IP69K". */
  ipRating?: string | null;
}

export type AssetStatus = "ok" | "attention" | "alarm" | "offline";

export interface Asset {
  /** Stable id, also the displayed tag: "TK-301", "PLC-F3", "HMI-F3". */
  id: string;
  name: string;
  description?: string;
  physical: PhysicalPresence;
  network: NetworkPresence;
  cyber?: CyberProfile;
  process?: ProcessProfile;
  specs?: AssetSpecs;
  /** Consequence if compromised or failed. 5 = safety critical. */
  criticality: 1 | 2 | 3 | 4 | 5;
  safetyCritical?: boolean;
  /**
   * Independent safeguards installed on or for this asset that do not depend on the network,
   * e.g. "hardwired-interlock", "emergency-ventilation", "port-lock", "locked-cabinet",
   * "independent-gas-detection". Rules and simulations treat a matching safeguard as a control.
   */
  protections?: string[];
  origin: "seed" | "added";
  /** For added devices: green (recommended) / red (unsafe) outline on the floor. */
  placement?: "recommended" | "unsafe" | "neutral";
  status: AssetStatus;
}

// ───────────────────────────── Network conduits & entry points ─────────────────────────────

export interface Conduit {
  id: string;
  name: string;
  /** Network zone names (NetworkPresence.area) joined by this conduit. */
  from: string;
  to: string;
  /** Asset id of the firewall / switch enforcing it, or null if unenforced (flat). */
  enforcedBy: string | null;
  /** Human-readable allowed flows, e.g. "OPC UA 4840 historian -> DMZ replica". */
  allows: string[];
}

export type EntryPointId = "internet" | "parking_rf" | "visitor" | "vendor_remote" | "supply_chain" | "insider";

/** Where an attacker or a hazard can come from. Pseudo-nodes used as attack-path origins. */
export interface EntryPoint {
  id: EntryPointId;
  name: string;
  kind: "internet" | "rf" | "physical" | "remote" | "supply";
  /** Position of its icon on the floor. */
  x: number;
  y: number;
  area?: AreaId;
  /** For rf: how far (floor units) a signal usefully reaches from this point. */
  reach?: number;
}

export interface Twin {
  plant: {
    name: string;
    line: string;
    fictional: true;
    canvas: { w: number; h: number };
    /** Outer wall of the building, floor units. Everything outside is "outdoors". */
    building: { x: number; y: number; w: number; h: number };
  };
  areas: Area[];
  assets: Asset[];
  conduits: Conduit[];
  entryPoints: EntryPoint[];
}

// ───────────────────────────── Risk, rules, attack paths ─────────────────────────────

export interface Technique {
  /** MITRE ATT&CK for ICS technique id, e.g. "T0860". */
  id: string;
  name: string;
}

export type Severity = 1 | 2 | 3 | 4 | 5;

export type AttackVia = "rf" | "network" | "physical" | "usb" | "internet" | "remote" | "process";

export interface AttackStep {
  /** Asset id or EntryPoint id. */
  from: string;
  to: string;
  via: AttackVia;
  technique?: Technique;
  note: string;
}

export interface AttackPath {
  id: string;
  /** Compact, e.g. "Nearby RF -> HMI-F3 -> PLC-F3". */
  title: string;
  entry: string;
  target: string;
  steps: AttackStep[];
  severity: Severity;
  likelihood: Severity;
  /** Physical consequence in plain words. */
  impact: string;
  /** rules = deterministic engine, model = proposed by the reasoning model (then verified). */
  source: "rules" | "model";
  /** Asset id of the device that introduced this path, if any. */
  causedBy?: string;
  ruleIds?: string[];
}

export interface RuleFinding {
  ruleId: string;
  title: string;
  severity: Severity;
  assetId: string;
  kind: "cyber" | "physical" | "compliance";
  detail: string;
  /** e.g. "IEC 62443-3-3 SR 5.1", "NIST SP 800-82r3 5.2", "OSHA 29 CFR 1910.119". */
  references: string[];
  technique?: Technique;
  fix?: string;
}

export type RiskBand = "low" | "guarded" | "elevated" | "high" | "critical";

export interface RiskReport {
  /** 0..100, higher is worse. */
  score: number;
  band: RiskBand;
  findings: RuleFinding[];
  paths: AttackPath[];
  /** Risk contribution per area, 0..100. */
  byArea: Partial<Record<AreaId, number>>;
  computedAt: number;
}

// ───────────────────────────── Mitigations (human-approved changes) ─────────────────────────────

export type MitigationEffect =
  | {
      type: "move_asset";
      assetId: string;
      area: AreaId;
      level: PurdueLevel;
      networkArea: string;
      conduit: string | null;
      x?: number;
      y?: number;
    }
  | { type: "disable_radio"; assetId: string; radio: Radio }
  | { type: "patch_cyber"; assetId: string; patch: Partial<CyberProfile> }
  | { type: "remove_connection"; assetId: string; to: string; medium: Medium }
  | { type: "remove_asset"; assetId: string }
  | { type: "enforce_conduit"; conduitId: string; enforcedBy: string; allows: string[] }
  | { type: "set_area_attr"; areaId: AreaId; patch: Partial<AreaAttrs> }
  /** Physical change: install an independent safeguard on an asset (see Asset.protections). */
  | { type: "add_protection"; assetId: string; protection: string }
  | { type: "note"; text: string };

export interface Mitigation {
  id: string;
  title: string;
  kind: "physical" | "software" | "procedural";
  description: string;
  /** Asset / conduit / area ids this touches. */
  targets: string[];
  effects: MitigationEffect[];
  /** Nothing is applied to the twin until a human approves it. */
  status: "proposed" | "approved" | "applied" | "rejected";
  /** Who proposed it: a crew member id or "threat-watch". */
  proposedBy: string;
  /** Projected change in risk score if applied (negative = safer). */
  riskDelta?: number;
}

export type ViewMode = "floor" | "purdue" | "split";
