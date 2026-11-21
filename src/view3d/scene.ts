/**
 * Pure mapping from the digital twin to 3D scene nodes. No WebGL here: the renderer packs the
 * parts, the overlay reads the anchors. Positions, footprints, rotations, pipe routes, media,
 * levels, running state, findings and placements are twin data; heights are illustrative.
 */
import { FOOTPRINT } from "@/equipment/types";
import { routePoints } from "@/floor/routing";
import { isDigitalEntry, lensAssetClass } from "@/layers/lensClassification";
import type { LensMode } from "@/layers/lensStore";
import type { Area, Asset, EntryPoint, Medium, RuleFinding, Twin } from "@/twin/types";
import { buildBody, hasBody } from "./bodies";
import { PATTERN } from "./gl/shaders";
import type { Vec3 } from "./gl/mat4";
import { DEFAULT_PALETTE, mix, type Palette, type Rgb } from "./palette";
import { Frame, toWorld, tube, UNITS_PER_METRE, worldPart, type Part } from "./parts";

/** Main process equipment: tagged at whole-plant zoom (tanks, filler, labeller, palletiser, coolers). */
const MAIN_KINDS: ReadonlySet<string> = new Set([
  "vertical_tank", "bullet_tank", "agitated_tank", "rotary_filler", "labeler", "palletizer", "carbo_cooler",
]);
export const MAIN_TAG_BOOST = 390;

export const HEIGHTS_CAPTION = "3D view · heights illustrative";

export type SceneNodeType = "ground" | "building" | "area" | "zone" | "asset" | "pipe" | "link" | "entry";

export interface SceneNode {
  /** Twin id for areas, assets and entry points; synthetic ("pipe:P-101:0") for the rest. */
  id: string;
  type: SceneNodeType;
  parts: Part[];
  /** World point the HTML label hangs from. */
  anchor: Vec3;
  /** Other points inside a room if the preferred room label overlaps a crew plate. */
  labelAlternates?: readonly Vec3[];
  /** Floor-level centre and horizontal radius, for framing the camera. */
  center: Vec3;
  radius: number;
  /** Illustrative body height in metres. */
  height: number;
  label?: string;
  /** Plain-language name from the twin (shown next to the tag when focused). */
  name?: string;
  /** Larger = more important when labels collide. */
  priority: number;
  /** Gets a picking id: hover, click and linked selection apply. */
  pickable: boolean;
  /** Equipment kind for assets, medium for pipes and links. */
  detail?: string;
  /** Meaning colour applied to the node, if any. */
  state?: "alarm" | "attention" | "ok";
  /** Receded by the current lens (control / IT gear in Material, process gear in Data). */
  ghost?: boolean;
}

export interface Scene {
  nodes: SceneNode[];
  byId: Map<string, SceneNode>;
  /** Centre and half-diagonal of the plant, for the default camera. */
  center: Vec3;
  radius: number;
  /** Half width and half depth of the drawing canvas in metres. */
  extent: [number, number];
  caption: string;
}

export interface SceneOptions {
  palette?: Palette;
  /** Rules-engine findings: the worst severity per asset tints its floor ring. */
  findings?: readonly RuleFinding[];
}

const m = (units: number) => units / UNITS_PER_METRE;

/** Pipe-rack tier per medium (metres): overlapping 2D routes stay readable as stacked pipes. */
export const RACK_HEIGHT: Record<Medium, number> = {
  water: 4.4, syrup: 4.75, product: 5.1, co2: 5.45, cip: 5.8, glycol: 6.15, ammonia: 6.5, power: 6.85, network: 7.4,
};
const UTILITY: ReadonlySet<Medium> = new Set<Medium>(["glycol", "ammonia", "power"]);
/** Below this route length (metres) a pipe runs directly at nozzle height instead of the rack. */
const SHORT_RUN = 14;

export function footprintOf(asset: Asset): { w: number; d: number } {
  const base = FOOTPRINT[asset.physical.kind] ?? FOOTPRINT.generic_device;
  const scale = asset.physical.scale ?? 1;
  return { w: m(base.w * scale), d: m(base.h * scale) };
}

function groundNode(twin: Twin, pal: Palette): SceneNode {
  const { w, h } = twin.plant.canvas;
  const center: Vec3 = [m(w) / 2, 0, m(h) / 2];
  return {
    id: "ground", type: "ground", anchor: center, center, radius: m(w), height: 0, priority: 0, pickable: false,
    parts: [worldPart("quad", [center[0], pal.daylight ? -0.85 : -0.03, center[2]], [900, 1, 900], {
      color: mix(pal.bg, pal.floor, 0.55), pattern: PATTERN.grid, edge: 0,
    })],
  };
}

function wallParts(b: Area["bounds"], height: number, thickness: number, color: Rgb, alpha: number, edge: number): Part[] {
  const x0 = m(b.x), z0 = m(b.y), w = m(b.w), d = m(b.h);
  const style = { color, alpha, edge, pattern: PATTERN.wall };
  return [
    worldPart("box", [x0 + w / 2, 0, z0], [w, height, thickness], style),
    worldPart("box", [x0 + w / 2, 0, z0 + d], [w, height, thickness], style),
    worldPart("box", [x0, 0, z0 + d / 2], [thickness, height, d], style),
    worldPart("box", [x0 + w, 0, z0 + d / 2], [thickness, height, d], style),
  ];
}

function buildingNode(twin: Twin, pal: Palette): SceneNode {
  const b = twin.plant.building;
  const center: Vec3 = [m(b.x + b.w / 2), 0, m(b.y + b.h / 2)];
  const depth = pal.daylight ? 0.8 : 0.04;
  return {
    id: "building", type: "building", anchor: center, center, radius: Math.hypot(m(b.w), m(b.h)) / 2, height: 0.9,
    priority: 0, pickable: false,
    parts: [
      worldPart("box", [center[0], 0.02 - depth, center[2]], [m(b.w), depth, m(b.h)], {
        color: pal.slab, edge: pal.daylight ? 1 : 0.75, emissive: pal.daylight ? 0.55 : 0,
      }),
      ...wallParts(b, 0.9, 0.22, pal.eqStroke, pal.daylight ? 0.62 : 0.2, pal.daylight ? 1 : 0.55),
    ],
  };
}

function statusColor(status: Area["status"], pal: Palette): Rgb | null {
  return status === "alarm" ? pal.alarm : status === "attention" ? pal.attention : null;
}

function areaNode(area: Area, pal: Palette): SceneNode {
  const b = area.bounds;
  const center: Vec3 = [m(b.x + b.w / 2), 0, m(b.y + b.h / 2)];
  const size: [number, number] = [m(b.w), m(b.h)];
  const parts: Part[] = [];
  const tone = statusColor(area.status, pal);
  const overlay = area.kind === "context";
  const front = m(b.y + b.h) - 0.7;

  if (!overlay) {
    const fill = area.kind === "process" ? pal.processPlate : pal.supportPlate;
    parts.push(worldPart("box", [center[0], 0, center[2]], [size[0], 0.08, size[1]], {
      color: fill, edge: 0.5, emissive: pal.daylight ? 1 : 0,
    }));
    // Low walls keep the room boundary visible without hiding its equipment.
    parts.push(...wallParts(b, 0.4, 0.1, tone ?? pal.eqStroke, tone || pal.daylight ? 0.5 : 0.22,
      tone ? 1.95 : pal.daylight ? 0.92 : 0.4));
  } else if (area.attrs.hazard) {
    // Hazard overlay (NH3...): hatched in the attention colour, as on the 2D floor.
    parts.push(worldPart("quad", [center[0], 0.11, center[2]], [size[0], 1, size[1]], {
      color: pal.attention, alpha: 0.3, pattern: PATTERN.hatch, edge: 1.75,
    }));
  } else if (area.attrs.washdown) {
    parts.push(worldPart("quad", [center[0], 0.105, center[2]], [size[0], 1, size[1]], {
      color: pal.water, alpha: pal.daylight ? 0.14 : 0.22, pattern: PATTERN.dots, edge: 1.4,
    }));
  } else {
    // Outside / public context (corridor, parking lot): quiet hatch, no walls.
    parts.push(worldPart("quad", [center[0], 0.02, center[2]], [size[0], 1, size[1]], {
      color: pal.eqStroke, alpha: area.attrs.publicAccess ? 0.1 : 0.05, pattern: PATTERN.hatch, edge: 0.3,
    }));
  }

  return {
    id: area.id,
    type: overlay ? "zone" : "area",
    parts,
    // Put room names at the front edge, clear of the equipment tags above the bodies.
    anchor: [center[0], overlay ? 0.2 : 0.25, front - (overlay ? 0.5 : 0)],
    labelAlternates: overlay ? undefined : [
      [m(b.x + b.w * 0.3), 0.25, front],
      [m(b.x + b.w * 0.7), 0.25, front],
      [center[0], 0.18, center[2]],
      [center[0], 0.18, m(b.y) + 1.2],
    ],
    center,
    radius: Math.hypot(size[0], size[1]) / 2,
    height: 0.4,
    label: area.name,
    priority: overlay ? 40 : 480,
    pickable: false,
    detail: area.kind,
    state: area.status === "alarm" ? "alarm" : area.status === "attention" ? "attention" : undefined,
  };
}

/** Worst finding per asset. The Material lens is about the physical plant: cyber findings wait for Both / Data, as in 2D. */
function worstSeverity(findings: readonly RuleFinding[], lens: LensMode): Map<string, number> {
  const worst = new Map<string, number>();
  for (const finding of findings) {
    if (lens === "material" && finding.kind === "cyber") continue;
    worst.set(finding.assetId, Math.max(worst.get(finding.assetId) ?? 0, finding.severity));
  }
  return worst;
}

/** Same grouping as the 2D floor: control / IT gear recedes in Material, process gear recedes in Data. */
export function isGhosted(asset: Asset, lens: LensMode): boolean {
  if (asset.origin === "added") return false;
  const group = lensAssetClass(asset);
  return (lens === "material" && group === "lens-ghost-in-material") || (lens === "data" && group === "lens-ghost-in-data");
}

/** ISA-101: colour only for meaning. Returns null for a normal asset. */
function assetState(asset: Asset, severity: number): SceneNode["state"] {
  // A captured device says where it stands first: as dropped (unsafe) or in the recommended spot.
  if (asset.origin === "added" && asset.placement === "unsafe") return "alarm";
  if (asset.origin === "added" && asset.placement === "recommended") return "ok";
  if (asset.status === "alarm" || severity >= 4) return "alarm";
  if (asset.status === "attention" || severity >= 2) return "attention";
  return undefined;
}

function assetNode(asset: Asset, pal: Palette, severity: number, ghost: boolean): SceneNode {
  const { x, y, rotation, kind } = asset.physical;
  const { w, d } = footprintOf(asset);
  const frame = new Frame(m(x), m(y), rotation);
  const medium = asset.process?.medium ? pal.media[asset.process.medium] : null;
  const level = typeof asset.process?.levelPct === "number" ? asset.process.levelPct / 100 : null;
  const height = buildBody(kind, {
    f: frame, w, d, pal, medium, level,
    running: asset.process?.running === true && asset.status !== "offline",
  });
  const state = assetState(asset, severity);
  const stateColor = state === "alarm" ? pal.alarm : state === "attention" ? pal.attention : state === "ok" ? pal.ok : null;
  const reach = Math.max(w, d);
  const ring = reach * 1.45 + 1.4;
  const added = asset.origin === "added";
  if (ghost) {
    // Out of this lens: still there and still pickable, but it recedes into the floor.
    for (const part of frame.parts) {
      part.color = mix(part.color, pal.daylight ? pal.processPlate : pal.floor, pal.daylight ? 0.54 : 0.66);
      part.emissive *= 0.25;
      part.edge *= 0.38;
    }
  }

  // Soft contact shadow, focus ring (shown by the shader for the selected / hovered id), pick hull.
  const slim = kind === "instrument" || kind === "wifi_ap" || kind === "ip_camera" || kind === "valve";
  const shade = slim ? 0.55 : 1.4;
  frame.quad(0, 0.095, 0, w * shade + 0.7, d * shade + 0.7, { color: [0, 0, 0], alpha: ghost ? 0.2 : 0.46, pattern: PATTERN.shadow, layer: "blend" });
  frame.quad(0, 0.13, 0, ring, ring, { color: pal.info, alpha: 0.999, pattern: PATTERN.focusRing, layer: "blend" });
  frame.box(0, 0, 0, w + 0.5, Math.max(height, 1.2), d + 0.5, { color: [0, 0, 0], layer: "pick", edge: 0 });

  if (stateColor) {
    frame.quad(0, 0.12, 0, ring * 0.9, ring * 0.9, { color: stateColor, pattern: PATTERN.statusRing, layer: "blend" });
  }
  if (added) {
    // New device from a capture: its outline carries the placement colour, with a locator mast.
    const tint = stateColor ?? pal.eqAccent;
    // Landing marker, readable at whole-plant zoom: a wide ring in the placement colour (alarm as
    // dropped when the rules engine flags it, ok once it stands in the recommended spot, neutral
    // accent while it is not assessed yet).
    const landing = Math.max(ring * 1.75, 8.5);
    if (!stateColor) frame.quad(0, 0.12, 0, ring * 0.9, ring * 0.9, { color: tint, pattern: PATTERN.statusRing, layer: "blend" });
    frame.quad(0, 0.145, 0, landing, landing, { color: tint, pattern: PATTERN.statusRing, layer: "blend" });
    for (const part of frame.parts) if (part.layer === "opaque" && part.edge > 0) { part.color = mix(part.color, tint, 0.35); part.edge = 1.95; }
    frame.cyl(0, height + 0.2, 0, 0.04, 3.2, { color: tint, emissive: 1, edge: 0 });
    frame.sphere(0, height + 3.6, 0, 0.26, 0.26, 0.26, { color: tint, emissive: 1, edge: 0 });
  }

  const area = w * d;
  return {
    id: asset.id,
    type: "asset",
    parts: frame.parts,
    anchor: [m(x), height + (added ? 4.1 : 0.45), m(y)],
    center: [m(x), 0, m(y)],
    radius: reach / 2,
    height,
    label: asset.id === "TEST-901" ? "TEST-901 · TEST SCENARIO" : asset.id,
    name: asset.name,
    priority: ghost && !state ? 1 : (added ? 5000 : 0) + (state ? 600 : 0) + (hasBody(kind) ? 0 : 300) + (MAIN_KINDS.has(kind) ? MAIN_TAG_BOOST : 0) + area * 4 + asset.criticality * 6,
    pickable: true,
    detail: kind,
    state,
    ghost: ghost || undefined,
  };
}

/** Height where a pipe meets a body: on top of low equipment, through the shell of tall vessels. */
function nozzle(bodyHeight: number, runHeight: number): number {
  return bodyHeight >= runHeight + 0.3 ? runHeight : Math.max(0.3, bodyHeight * 0.92);
}

function pipeNodes(twin: Twin, heights: ReadonlyMap<string, number>, pal: Palette, lens: LensMode): SceneNode[] {
  const byId = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const nodes: SceneNode[] = [];
  const dataOnly = lens === "data";

  for (const source of twin.assets) {
    source.physical.connections.forEach((connection, index) => {
      if (connection.medium === "network") return;
      const target = byId.get(connection.to);
      if (!target) return;
      // Same orthogonal route the 2D floor draws.
      const route = routePoints(source.physical, target.physical, connection.via);
      if (route.length < 2) return;

      let length = 0;
      for (let i = 1; i < route.length; i++) length += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
      const sourceTop = heights.get(source.id) ?? 1;
      const targetTop = heights.get(target.id) ?? 1;
      const tier = RACK_HEIGHT[connection.medium];
      const run = m(length) < SHORT_RUN
        ? Math.min(tier, Math.max(0.9, Math.min(sourceTop, targetTop) * 0.7) + (tier - RACK_HEIGHT.water) * 0.25)
        : tier;

      const active = connection.active !== false && source.process?.running === true && source.status !== "offline";
      const base = pal.media[connection.medium];
      const color = dataOnly ? mix(base, pal.floor, 0.72) : connection.active === false ? mix(base, pal.floor, 0.5) : base;
      const radius = (UTILITY.has(connection.medium) ? 0.12 : 0.17) * (pal.daylight ? 1.28 : 1);
      const style = { color, pattern: PATTERN.flow, param: active && !dataOnly ? 1 : 0 };
      const joint = { color: mix(color, pal.floor, 0.25), emissive: 0.5, edge: 0 };

      const points: Vec3[] = [];
      const first = route[0];
      const last = route[route.length - 1];
      const startY = nozzle(sourceTop, run);
      const endY = nozzle(targetTop, run);
      if (startY < run) points.push(toWorld(first.x, first.y, startY));
      for (const point of route) points.push(toWorld(point.x, point.y, run));
      if (endY < run) points.push(toWorld(last.x, last.y, endY));

      const parts: Part[] = [];
      for (let i = 1; i < points.length; i++) {
        parts.push(tube(points[i - 1], points[i], radius, style));
        if (i < points.length - 1) parts.push(worldPart("sphere", points[i], [radius * 1.08, radius * 1.08, radius * 1.08], joint));
      }
      const mid = points[Math.floor(points.length / 2)];
      nodes.push({
        id: `pipe:${source.id}:${index}`, type: "pipe", parts, anchor: mid, center: [mid[0], 0, mid[2]], radius: m(length) / 2,
        height: run, priority: 0, pickable: false, detail: connection.medium,
      });
    });
  }
  return nodes;
}

/** Points along a parabola from a to b whose apex rises `lift` above the higher end. */
export function arcPoints(a: Vec3, b: Vec3, lift: number, steps: number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t + lift * 4 * t * (1 - t),
      a[2] + (b[2] - a[2]) * t,
    ]);
  }
  return points;
}

/** Network cabling: thin arcs above the equipment. Only in the Both and Data lenses. */
function linkNodes(twin: Twin, heights: ReadonlyMap<string, number>, pal: Palette, lens: LensMode): SceneNode[] {
  if (lens === "material") return [];
  const byId = new Map(twin.assets.map((asset) => [asset.id, asset]));
  const color = lens === "data" ? mix(pal.network, pal.eqAccent, 0.45) : mix(pal.network, pal.eqAccent, 0.15);
  const nodes: SceneNode[] = [];
  for (const source of twin.assets) {
    source.physical.connections.forEach((connection, index) => {
      if (connection.medium !== "network" || connection.to === source.id) return;
      const target = byId.get(connection.to);
      if (!target) return;
      const a = toWorld(source.physical.x, source.physical.y, heights.get(source.id) ?? 1);
      const b = toWorld(target.physical.x, target.physical.y, heights.get(target.id) ?? 1);
      const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const points = arcPoints(a, b, 1.6 + span * 0.1, Math.max(6, Math.min(14, Math.round(span / 3))));
      const parts = points.slice(1).map((point, i) => tube(points[i], point, lens === "data" ? 0.05 : 0.04, { color, emissive: 0.85 }));
      const mid = points[Math.floor(points.length / 2)];
      nodes.push({
        id: `link:${source.id}:${index}`, type: "link", parts, anchor: mid, center: [mid[0], 0, mid[2]], radius: span / 2,
        height: mid[1], priority: 0, pickable: false, detail: "network",
      });
    });
  }
  return nodes;
}

/** Entry points (Internet, vendor remote, nearby RF...) as small beacons at the plant edge. */
function entryNode(entry: EntryPoint, pal: Palette, ghost: boolean): SceneNode {
  const frame = new Frame(m(entry.x), m(entry.y));
  const tone = ghost ? mix(pal.eqAccent, pal.floor, 0.7) : pal.eqAccent;
  frame.cyl(0, 0, 0, 0.5, 0.12, { color: pal.steelDark, edge: 0.6 });
  frame.cyl(0, 0.12, 0, 0.06, 2.6, { color: pal.steelLight, edge: 0 });
  if (entry.kind === "rf") {
    frame.cone(0, 2.72, 0, 0.5, 0.8, { color: tone, emissive: 0.85, edge: 0.9 });
  } else if (entry.kind === "internet" || entry.kind === "remote") {
    frame.sphere(0, 3.1, 0, 0.5, 0.5, 0.5, { color: tone, emissive: 0.85, edge: 0.9 });
  } else {
    frame.box(0, 2.72, 0, 0.7, 0.7, 0.7, { color: tone, emissive: 0.85, edge: 0.9, yaw: Math.PI / 4 });
  }
  frame.quad(0, 0.13, 0, 3.6, 3.6, { color: pal.info, alpha: 0.999, pattern: PATTERN.focusRing, layer: "blend" });
  frame.box(0, 0, 0, 1.6, 3.7, 1.6, { color: [0, 0, 0], layer: "pick", edge: 0 });
  return {
    id: entry.id, type: "entry", parts: frame.parts, anchor: [m(entry.x), 4.0, m(entry.y)], center: [m(entry.x), 0, m(entry.y)],
    radius: 1, height: 3.6, label: entry.name, priority: 320, pickable: true, detail: entry.kind, ghost: ghost || undefined,
  };
}

export function sceneFromTwin(twin: Twin, lens: LensMode, options: SceneOptions = {}): Scene {
  const pal = options.palette ?? DEFAULT_PALETTE;
  const severity = worstSeverity(options.findings ?? [], lens);
  const nodes: SceneNode[] = [groundNode(twin, pal), buildingNode(twin, pal)];

  for (const area of twin.areas) nodes.push(areaNode(area, pal));

  const assets = twin.assets.map((asset) => assetNode(asset, pal, severity.get(asset.id) ?? 0, isGhosted(asset, lens)));
  const heights = new Map(assets.map((node) => [node.id, node.height]));
  nodes.push(...pipeNodes(twin, heights, pal, lens), ...linkNodes(twin, heights, pal, lens), ...assets);
  // Digital entry points (Internet, vendor remote, nearby RF) belong to the data picture, as in 2D:
  // in Material they recede (unlabelled) but stay, so a selected asset's attack path has an origin.
  for (const entry of twin.entryPoints) nodes.push(entryNode(entry, pal, lens === "material" && isDigitalEntry(entry)));

  // Framing bounds: everything that is drawn (building, outdoor zones, entry points).
  const b = twin.plant.building;
  let minX = b.x, maxX = b.x + b.w, minY = b.y, maxY = b.y + b.h;
  for (const { bounds } of twin.areas) {
    minX = Math.min(minX, bounds.x);
    maxX = Math.max(maxX, bounds.x + bounds.w);
    minY = Math.min(minY, bounds.y);
    maxY = Math.max(maxY, bounds.y + bounds.h);
  }
  for (const entry of twin.entryPoints) {
    minX = Math.min(minX, entry.x);
    maxX = Math.max(maxX, entry.x);
    minY = Math.min(minY, entry.y);
    maxY = Math.max(maxY, entry.y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return {
    nodes,
    byId: new Map(nodes.map((node) => [node.id, node])),
    center: [m(minX + w / 2), 0, m(minY + h / 2)],
    radius: Math.hypot(m(w), m(h)) / 2,
    extent: [m(w) / 2, m(h) / 2],
    caption: HEIGHTS_CAPTION,
  };
}
