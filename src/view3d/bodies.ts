/**
 * Procedural 3D bodies, one per equipment kind, built from boxes, cylinders and domes.
 * Plan size comes from FOOTPRINT (real twin data); every height is ILLUSTRATIVE (the twin has
 * no heights) and derived from the kind and its footprint.
 */
import type { EquipmentKind } from "@/twin/types";
import { PATTERN } from "./gl/shaders";
import { mix, type Palette, type Rgb } from "./palette";
import type { Frame } from "./parts";

export interface BodyContext {
  f: Frame;
  /** Footprint in metres along local x (w) and z (d), scale applied. */
  w: number;
  d: number;
  pal: Palette;
  running: boolean;
  /** 0..1 when the asset reports a level, else null. */
  level: number | null;
  /** Colour of the medium inside, when the twin names one. */
  medium: Rgb | null;
}

/** Builds the parts into c.f and returns the body height in metres. */
type BodyBuilder = (c: BodyContext) => number;

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

/** Level band around a vertical vessel plus a sight strip on its front. Real data: levelPct. */
function levelBand({ f, pal, level, medium }: BodyContext, radius: number, height: number) {
  if (level === null) return;
  const color = medium ?? pal.eqAccent;
  const usable = height - 0.5;
  const y = 0.25 + usable * clamp(level, 0, 1);
  f.cyl(0, y - 0.1, 0, radius * 1.012, 0.2, { color, emissive: 0.9, edge: 0 });
  f.box(0, 0.25, radius, 0.3, usable, 0.1, { color: pal.steelDark, edge: 0.5 });
  f.box(0, 0.25, radius + 0.03, 0.18, usable * clamp(level, 0.02, 1), 0.1, { color, emissive: 0.9, edge: 0 });
}

const verticalTank: BodyBuilder = (c) => {
  const { f, w, d, pal } = c;
  const r = Math.min(w, d) * 0.45;
  const h = clamp(r * 2.5, 2.4, 9);
  const rise = r * 0.36;
  f.cyl(0, 0, 0, r, h, { color: pal.steel });
  f.dome(0, h, 0, r, rise, { color: pal.steelLight });
  f.cyl(0, h + rise * 0.9, 0, 0.3, 0.3, { color: pal.steelDark, edge: 0.6 });
  levelBand(c, r, h);
  return h + rise + 0.2;
};

const agitatedTank: BodyBuilder = (c) => {
  const { f, w, d, pal, running } = c;
  const r = Math.min(w, d) * 0.45;
  const h = clamp(r * 2.1, 2.4, 8);
  const rise = r * 0.32;
  f.cyl(0, 0, 0, r, h, { color: pal.steel });
  f.dome(0, h, 0, r, rise, { color: pal.steelLight });
  f.cyl(0, h + rise * 0.85, 0, 0.42, 1.0, { color: pal.steelDark });
  f.box(0, h + rise * 0.85 + 1.0, 0, 0.9, 0.12, 0.2, { color: pal.steelLight, spin: running ? 1.4 : 0, edge: 0.6 });
  levelBand(c, r, h);
  return h + rise + 1.1;
};

const bulletTank: BodyBuilder = ({ f, w, d, pal }) => {
  const r = d * 0.4;
  const yc = r + 0.55;
  const shell = w - r * 1.1;
  f.cylX(0, yc, 0, r, shell, { color: pal.steel });
  f.sphere(-shell / 2, yc, 0, r * 0.55, r, r, { color: pal.steelLight, edge: 0 });
  f.sphere(shell / 2, yc, 0, r * 0.55, r, r, { color: pal.steelLight, edge: 0 });
  for (const x of [-shell * 0.3, shell * 0.3]) f.box(x, 0, 0, 0.45, yc - r * 0.35, r * 1.5, { color: pal.steelDark });
  return yc + r;
};

const pump: BodyBuilder = ({ f, w, d, pal }) => {
  const r = d * 0.26;
  f.box(0, 0, 0, w * 0.92, 0.22, d * 0.72, { color: pal.steelDark });
  f.cylX(-w * 0.14, 0.22 + r, 0, r, w * 0.5, { color: pal.steel });
  f.cylZ(w * 0.27, 0.22 + r * 1.15, 0, r * 1.25, d * 0.3, { color: pal.steelLight });
  return 0.22 + r * 2.5;
};

const compressor: BodyBuilder = ({ f, w, d, pal }) => {
  const r = d * 0.27;
  f.box(0, 0, 0, w, 0.3, d * 0.82, { color: pal.steelDark });
  f.cylX(-w * 0.2, 0.3 + r, 0, r, w * 0.46, { color: pal.steel });
  f.box(w * 0.24, 0.3, 0, w * 0.36, r * 2.3, d * 0.62, { color: pal.steelLight });
  f.cylX(w * 0.03, 0.3 + r, 0, r * 0.5, w * 0.12, { color: pal.steelDark, edge: 0.5 });
  return 0.3 + r * 2.3;
};

const valve: BodyBuilder = ({ f, w, pal }) => {
  f.cyl(0, 0, 0, 0.08, 0.9, { color: pal.steelDark, edge: 0.4 });
  f.cylX(0, 0.9, 0, 0.26, w * 0.7, { color: pal.steel });
  f.cyl(0, 0.9, 0, 0.06, 0.85, { color: pal.steelLight, edge: 0.4 });
  f.cyl(0, 1.75, 0, 0.45, 0.08, { color: pal.steelLight });
  return 1.85;
};

const instrument: BodyBuilder = ({ f, pal }) => {
  f.cyl(0, 0, 0, 0.07, 1.55, { color: pal.steelDark, edge: 0.4 });
  f.sphere(0, 1.8, 0, 0.36, 0.36, 0.36, { color: pal.steelLight, edge: 0.9 });
  return 2.15;
};

const roSkid: BodyBuilder = ({ f, w, d, pal }) => {
  f.box(0, 0, 0, w, 0.28, d, { color: pal.steelDark });
  for (let i = 0; i < 3; i++) f.cylX(-w * 0.08, 0.72 + i * 0.74, -d * 0.16, 0.3, w * 0.8, { color: pal.steelLight });
  for (const x of [-w * 0.44, w * 0.28]) f.box(x, 0.28, -d * 0.16, 0.14, 2.3, 0.8, { color: pal.steelDark, edge: 0.5 });
  f.box(w * 0.34, 0.28, d * 0.26, w * 0.24, 1.7, d * 0.3, { color: pal.steel });
  return 2.75;
};

const uvReactor: BodyBuilder = ({ f, w, d, pal }) => {
  const r = d * 0.3;
  for (const x of [-w * 0.3, w * 0.3]) f.box(x, 0, 0, 0.2, 1.25, d * 0.5, { color: pal.steelDark, edge: 0.5 });
  f.cylX(0, 1.25 + r * 0.6, 0, r, w * 0.92, { color: pal.steelLight });
  f.box(0, 1.25 + r * 1.5, 0, w * 0.3, 0.3, d * 0.4, { color: pal.steel });
  return 1.55 + r * 1.6;
};

const carboCooler: BodyBuilder = ({ f, w, d, pal }) => {
  f.box(0, 0, 0, w * 0.94, 2.1, d * 0.8, { color: pal.steel });
  f.cylX(0, 2.1 + 0.75, 0, 0.75, w * 0.8, { color: pal.steelLight });
  f.cyl(w * 0.2, 2.1 + 1.45, 0, 0.2, 0.6, { color: pal.steelDark, edge: 0.5 });
  return 4.2;
};

const heatExchanger: BodyBuilder = ({ f, w, d, pal }) => {
  const r = d * 0.3;
  const yc = 1.1 + r;
  for (const x of [-w * 0.28, w * 0.28]) f.box(x, 0, 0, 0.3, yc - r * 0.4, r * 1.5, { color: pal.steelDark, edge: 0.5 });
  f.cylX(0, yc, 0, r, w * 0.88, { color: pal.steel });
  for (const x of [-w * 0.44, w * 0.44]) f.cylX(x, yc, 0, r * 1.14, 0.16, { color: pal.steelLight });
  return yc + r * 1.14;
};

const rotaryFiller: BodyBuilder = ({ f, w, d, pal, running }) => {
  const r = Math.min(w, d) * 0.46;
  const spin = running ? 0.55 : 0;
  // Low drum, a turning carousel with a ring of filling valves, a centre column and a small bowl.
  f.cyl(0, 0, 0, r, 0.85, { color: pal.steel });
  f.cyl(0, 0.85, 0, r * 0.94, 0.14, { color: pal.steelLight, spin });
  f.cyl(0, 0.99, 0, r * 0.2, 2.1, { color: pal.steel });
  f.cyl(0, 2.55, 0, r * 0.42, 0.5, { color: pal.steelLight, spin });
  f.dome(0, 3.05, 0, r * 0.42, 0.3, { color: pal.steelLight, edge: 0.5 });
  const posts = 24;
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    f.cyl(Math.cos(a) * r * 0.82, 0.99, Math.sin(a) * r * 0.82, 0.11, 1.25, { color: pal.eqAccent, spin, orbit: true, edge: 0.5 });
  }
  return 3.4;
};

const conveyor: BodyBuilder = ({ f, w, d, pal, running }) => {
  for (const x of [-w * 0.42, 0, w * 0.42]) f.box(x, 0, 0, 0.16, 0.74, d * 0.6, { color: pal.steelDark, edge: 0.4 });
  f.box(0, 0.74, 0, w, 0.22, d * 0.82, { color: pal.steel });
  f.quad(0, 0.975, 0, w * 0.985, d * 0.62, { color: pal.steelDark, pattern: PATTERN.chevron, param: running ? 1 : 0, layer: "opaque" });
  return 0.98;
};

const labeler: BodyBuilder = ({ f, w, d, pal, running }) => {
  f.box(0, 0, 0, w * 0.9, 1.6, d * 0.85, { color: pal.steel });
  f.cyl(0, 1.6, 0, Math.min(w, d) * 0.28, 0.55, { color: pal.steelLight, spin: running ? 0.9 : 0 });
  f.box(0, 2.15, 0, Math.min(w, d) * 0.5, 0.1, 0.2, { color: pal.eqAccent, spin: running ? 0.9 : 0, edge: 0.5 });
  return 2.25;
};

const palletizer: BodyBuilder = ({ f, w, d, pal }) => {
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    f.box(x * w * 0.46, 0, z * d * 0.46, 0.26, 3.2, 0.26, { color: pal.steelDark });
  }
  f.box(0, 3.2, 0, w, 0.24, d, { color: pal.steel });
  f.box(0, 0, 0, w * 0.5, 0.16, d * 0.5, { color: pal.steelDark, edge: 0.5 });
  f.box(0, 0.16, 0, w * 0.44, 1.3, d * 0.44, { color: pal.steelLight });
  f.box(0, 2.3, 0, 0.3, 0.9, 0.3, { color: pal.steel, edge: 0.5 });
  return 3.44;
};

const condenser: BodyBuilder = ({ f, w, d, pal, running }) => {
  f.box(0, 0, 0, w, 2.3, d * 0.9, { color: pal.steel });
  for (const x of [-w * 0.32, 0, w * 0.32]) {
    f.cyl(x, 2.3, 0, d * 0.3, 0.22, { color: pal.steelDark });
    f.box(x, 2.52, 0, d * 0.52, 0.05, 0.22, { color: pal.steelLight, edge: 0.5, spin: running ? 2.2 : 0 });
  }
  return 2.6;
};

/** Thin lit strip on the front (+z) face: door lines, rack LEDs, port rows. */
function strip({ f, pal }: BodyContext, y: number, z: number, sx: number, sy: number, bright = 0.75) {
  f.box(0, y, z, sx, sy, 0.03, { color: mix(pal.eqStroke, pal.eqAccent, 0.5), emissive: bright, edge: 0 });
}

const plcCabinet: BodyBuilder = (c) => {
  const { f, w, d, pal } = c;
  const depth = d * 0.5;
  f.box(0, 0, 0, w * 0.8, 2.1, depth, { color: pal.steel });
  strip(c, 0.14, depth / 2, 0.035, 1.82);
  f.box(w * 0.12, 1.0, depth / 2 + 0.01, 0.06, 0.26, 0.06, { color: pal.eqAccent, edge: 0 });
  return 2.1;
};

const screenTone = (pal: Palette): Rgb => mix(pal.eqStroke, pal.eqAccent, 0.55);

const hmi: BodyBuilder = ({ f, w, pal }) => {
  const width = Math.max(1.3, w * 0.55);
  f.box(0, 0, 0, 0.34, 1.05, 0.34, { color: pal.steelDark });
  f.box(0, 1.0, 0, width, 0.95, 0.12, { color: pal.steel, tilt: -0.38 });
  f.box(0, 1.06, 0.035, width * 0.86, 0.8, 0.1, { color: screenTone(pal), emissive: 0.92, tilt: -0.38, edge: 0 });
  return 2.0;
};

const workstation: BodyBuilder = ({ f, w, d, pal }) => {
  f.box(0, 0, 0, w * 0.95, 0.75, d * 0.7, { color: pal.steelDark });
  f.box(0, 0.75, -d * 0.12, 0.2, 0.2, 0.2, { color: pal.steel, edge: 0.4 });
  f.box(0, 0.9, -d * 0.12, w * 0.6, 0.78, 0.09, { color: pal.steel, tilt: -0.12 });
  f.box(0, 0.95, -d * 0.12 + 0.03, w * 0.53, 0.66, 0.07, { color: screenTone(pal), emissive: 0.92, tilt: -0.12, edge: 0 });
  return 1.7;
};

const serverRack: BodyBuilder = (c) => {
  const { f, w, d, pal } = c;
  const depth = d * 0.72;
  f.box(0, 0, 0, w * 0.74, 2.2, depth, { color: pal.steel });
  for (let i = 0; i < 5; i++) strip(c, 0.35 + i * 0.38, depth / 2, w * 0.54, 0.05, 0.7);
  return 2.2;
};

const firewall: BodyBuilder = (c) => {
  const { f, w, d, pal } = c;
  const depth = d * 0.7;
  f.box(0, 0, 0, w * 0.8, 1.3, depth, { color: pal.steel });
  strip(c, 0.95, depth / 2, w * 0.6, 0.06);
  strip(c, 0.3, depth / 2, w * 0.6, 0.03, 0.5);
  strip(c, 0.6, depth / 2, w * 0.6, 0.03, 0.5);
  return 1.3;
};

const networkSwitch: BodyBuilder = (c) => {
  const { f, w, d, pal } = c;
  const depth = Math.max(0.9, d * 0.9);
  f.box(0, 0, 0, 0.3, 0.7, 0.3, { color: pal.steelDark, edge: 0.4 });
  f.box(0, 0.7, 0, w * 0.85, 0.42, depth, { color: pal.steel });
  strip(c, 0.86, depth / 2, w * 0.66, 0.08);
  return 1.12;
};

const wifiAp: BodyBuilder = ({ f, pal }) => {
  f.cyl(0, 0, 0, 0.07, 2.8, { color: pal.steelDark, edge: 0.4 });
  f.cyl(0, 2.8, 0, 0.6, 0.14, { color: pal.steelLight });
  f.dome(0, 2.94, 0, 0.3, 0.14, { color: pal.eqAccent, edge: 0.4 });
  return 3.1;
};

const ipCamera: BodyBuilder = ({ f, pal }) => {
  f.cyl(0, 0, 0, 0.07, 2.6, { color: pal.steelDark, edge: 0.4 });
  f.box(0, 2.5, 0.2, 0.4, 0.34, 0.85, { color: pal.steelLight, tilt: 0.3 });
  f.cylZ(0, 2.5, 0.72, 0.13, 0.2, { color: pal.steelDark, edge: 0.6 });
  return 2.95;
};

const gateway: BodyBuilder = (c) => {
  const { f, w, d, pal } = c;
  f.box(0, 0, 0, 0.28, 1.0, 0.28, { color: pal.steelDark, edge: 0.4 });
  f.box(0, 1.0, 0, w * 0.62, 0.4, d * 0.62, { color: pal.steel });
  strip(c, 1.14, d * 0.31, w * 0.4, 0.06);
  for (const x of [-w * 0.2, w * 0.2]) f.cyl(x, 1.4, -d * 0.2, 0.035, 0.75, { color: pal.eqAccent, edge: 0 });
  return 2.15;
};

const laptop: BodyBuilder = ({ f, w, d, pal }) => {
  const width = Math.max(1.4, w * 0.6);
  const depth = Math.max(1.0, d * 0.6);
  f.box(0, 0, 0, 0.5, 0.8, 0.5, { color: pal.steelDark, edge: 0.4 });
  f.box(0, 0.8, 0, width, 0.07, depth, { color: pal.steel });
  f.box(0, 0.86, -depth / 2, width, depth * 0.95, 0.06, { color: pal.steel, tilt: -0.3 });
  f.box(0, 0.9, -depth / 2 + 0.03, width * 0.9, depth * 0.82, 0.05, { color: screenTone(pal), emissive: 0.92, tilt: -0.3, edge: 0 });
  return 1.95;
};

const phone: BodyBuilder = ({ f, pal }) => {
  f.box(0, 0, 0, 0.3, 0.9, 0.3, { color: pal.steelDark, edge: 0.4 });
  f.box(0, 0.9, 0, 0.62, 1.15, 0.1, { color: pal.steel, tilt: -0.3 });
  f.box(0, 0.96, 0.03, 0.52, 1.0, 0.08, { color: screenTone(pal), emissive: 0.92, tilt: -0.3, edge: 0 });
  return 2.05;
};

const usbDrive: BodyBuilder = ({ f, w, d, pal }) => {
  const len = Math.max(1.2, w * 0.55);
  const depth = Math.max(0.5, d * 0.5);
  f.box(0, 0, 0, 0.3, 0.9, 0.3, { color: pal.steelDark, edge: 0.4 });
  f.box(-len * 0.15, 0.9, 0, len * 0.7, 0.22, depth, { color: pal.steel });
  f.box(len * 0.35, 0.94, 0, len * 0.3, 0.14, depth * 0.7, { color: pal.eqAccent });
  return 1.15;
};

/** Anything without a dedicated body: an honest plain box (its tag is always labelled). */
const genericBox: BodyBuilder = ({ f, w, d, pal }) => {
  f.box(0, 0, 0, w * 0.8, 1.4, d * 0.8, { color: pal.steel });
  return 1.4;
};

const BUILDERS: Partial<Record<EquipmentKind, BodyBuilder>> = {
  vertical_tank: verticalTank,
  agitated_tank: agitatedTank,
  bullet_tank: bulletTank,
  pump,
  valve,
  instrument,
  ro_skid: roSkid,
  uv_reactor: uvReactor,
  carbo_cooler: carboCooler,
  heat_exchanger: heatExchanger,
  rotary_filler: rotaryFiller,
  conveyor,
  labeler,
  palletizer,
  chiller_compressor: compressor,
  condenser,
  plc_cabinet: plcCabinet,
  hmi,
  workstation,
  server_rack: serverRack,
  firewall,
  network_switch: networkSwitch,
  wifi_ap: wifiAp,
  ip_camera: ipCamera,
  gateway,
  laptop,
  phone,
  usb_drive: usbDrive,
};

/** True when the kind has its own procedural body (otherwise it renders as a labelled box). */
export function hasBody(kind: string): boolean {
  return kind in BUILDERS;
}

export function buildBody(kind: string, context: BodyContext): number {
  const builder = (BUILDERS as Record<string, BodyBuilder | undefined>)[kind] ?? genericBox;
  return builder(context);
}
