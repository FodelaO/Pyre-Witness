/**
 * Renderable parts: one primitive instance with a world matrix, colour and a shader pattern.
 * `Frame` places parts in an asset's local frame (origin at its floor position, rotated with it).
 * World units are metres: x = floor x / 10, z = floor y / 10, y up.
 */
import type { Prim } from "./gl/geometry";
import { PATTERN } from "./gl/shaders";
import { multiply, rotationX, rotationY, rotationZ, scaling, segmentMatrix, translation, type Mat4, type Vec3 } from "./gl/mat4";
import type { Rgb } from "./palette";

/** opaque = lit bodies · blend = translucent · glow = drawn last, unlit (attack arcs) · pick = id pass only. */
export type Layer = "opaque" | "blend" | "glow" | "pick";

export interface Part {
  prim: Prim;
  m: Mat4;
  color: Rgb;
  alpha: number;
  /** 0 = fully lit, 1 = unlit (screens, beacons, media bands). */
  emissive: number;
  pattern: number;
  param: number;
  /** Edge line strength 0..1 in steel; 1..2 draws the edge in the part's own colour. */
  edge: number;
  /** Radians per second around the vertical axis through `pivot` (world x, z). */
  spin: number;
  pivot: [number, number];
  layer: Layer;
}

export interface PartStyle {
  color: Rgb;
  alpha?: number;
  emissive?: number;
  pattern?: number;
  param?: number;
  edge?: number;
  spin?: number;
  /** With spin: orbit the asset centre (filler posts) instead of turning in place. */
  orbit?: boolean;
  layer?: Layer;
  /** Extra local yaw (radians) and tilt about the local X axis. */
  yaw?: number;
  tilt?: number;
}

export const UNITS_PER_METRE = 10;
export const toWorld = (x: number, y: number, height = 0): Vec3 => [x / UNITS_PER_METRE, height, y / UNITS_PER_METRE];

function finish(prim: Prim, m: Mat4, style: PartStyle, pivot: [number, number]): Part {
  const alpha = style.alpha ?? 1;
  return {
    prim,
    m,
    color: style.color,
    alpha,
    emissive: style.emissive ?? 0,
    pattern: style.pattern ?? PATTERN.plain,
    param: style.param ?? 0,
    edge: style.edge ?? (alpha < 1 ? 0 : 0.95),
    spin: style.spin ?? 0,
    pivot,
    layer: style.layer ?? (alpha < 1 ? "blend" : "opaque"),
  };
}

/** A straight tube between two world points (pipes, cables, posts, arcs). */
export function tube(a: Vec3, b: Vec3, radius: number, style: PartStyle): Part {
  return finish("tube", segmentMatrix(a, b, radius), { edge: 0, ...style }, [0, 0]);
}

/** Parts placed directly in world space (floor slabs, zones, joints). */
export function worldPart(prim: Prim, position: Vec3, size: Vec3, style: PartStyle): Part {
  return finish(prim, multiply(translation(...position), scaling(...size)), style, [position[0], position[2]]);
}

/** Local frame of one asset: +x along its footprint width, +z along its depth, y up. */
export class Frame {
  readonly parts: Part[] = [];
  private readonly base: Mat4;

  constructor(readonly x: number, readonly z: number, rotationDeg = 0) {
    // Twin rotation is clockwise seen from above with floor y pointing down the screen (+z).
    this.base = multiply(translation(x, 0, z), rotationY(-rotationDeg * Math.PI / 180));
  }

  private place(prim: Prim, at: Vec3, size: Vec3, style: PartStyle, axis?: Mat4): Part {
    let local = translation(...at);
    if (style.yaw) local = multiply(local, rotationY(style.yaw));
    if (style.tilt) local = multiply(local, rotationX(style.tilt));
    if (axis) local = multiply(local, axis);
    const m = multiply(this.base, multiply(local, scaling(...size)));
    // Spinning parts turn about their own vertical axis unless they orbit the asset centre.
    const part = finish(prim, m, style, style.orbit ? [this.x, this.z] : [m[12], m[14]]);
    this.parts.push(part);
    return part;
  }

  /** Box of full size (sx, sy, sz) with its base centre at (x, y, z). */
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, style: PartStyle) {
    return this.place("box", [x, y, z], [sx, sy, sz], style);
  }
  /** Upright cylinder: base centre (x, y, z), radius, height. */
  cyl(x: number, y: number, z: number, radius: number, height: number, style: PartStyle) {
    return this.place("cylinder", [x, y, z], [radius, height, radius], style);
  }
  /** Horizontal cylinder along local X, centred on (x, y, z). */
  cylX(x: number, y: number, z: number, radius: number, length: number, style: PartStyle) {
    return this.place("cylinder", [x - length / 2, y, z], [radius, length, radius], style, rotationZ(-Math.PI / 2));
  }
  /** Horizontal cylinder along local Z, centred on (x, y, z). */
  cylZ(x: number, y: number, z: number, radius: number, length: number, style: PartStyle) {
    return this.place("cylinder", [x, y, z - length / 2], [radius, length, radius], style, rotationX(Math.PI / 2));
  }
  /** Dished head: base centre (x, y, z), radius, rise. */
  dome(x: number, y: number, z: number, radius: number, rise: number, style: PartStyle) {
    return this.place("dome", [x, y, z], [radius, rise, radius], style);
  }
  /** Ellipsoid centred on (x, y, z). */
  sphere(x: number, y: number, z: number, rx: number, ry: number, rz: number, style: PartStyle) {
    return this.place("sphere", [x, y, z], [rx, ry, rz], style);
  }
  cone(x: number, y: number, z: number, radius: number, height: number, style: PartStyle) {
    return this.place("cone", [x, y, z], [radius, height, radius], style);
  }
  /** Flat quad on the XZ plane centred on (x, y, z). */
  quad(x: number, y: number, z: number, sx: number, sz: number, style: PartStyle) {
    return this.place("quad", [x, y, z], [sx, 1, sz], { edge: 0, ...style });
  }
}
