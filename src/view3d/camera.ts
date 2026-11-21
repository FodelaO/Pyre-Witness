/** Orbit camera maths for the 3D plant: pose, clamping (never under the floor), framing, easing. */
import { lerp, lerp3, lookAt, multiply, perspective, projectToScreen, type Mat4, type Vec3 } from "./gl/mat4";

export interface Pose {
  /** Point on (or just above) the floor the camera looks at. */
  target: Vec3;
  /** Radians around the vertical axis. 0 looks from the south edge, like the 2D floor. */
  yaw: number;
  /** Elevation above the horizon in radians. */
  pitch: number;
  distance: number;
}

export const FOV_Y = (32 * Math.PI) / 180;
export const LIMITS = { minPitch: 0.14, maxPitch: 1.52, minDistance: 7, maxDistance: 420 } as const;

export interface PlantBounds {
  center: Vec3;
  radius: number;
  /** Half width (x) and half depth (z) of the floor rectangle, when known. */
  extent?: [number, number];
}

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

/** Keeps the camera above the floor, within zoom range and near the plant. */
export function clampPose(pose: Pose, bounds?: PlantBounds): Pose {
  const target: Vec3 = [pose.target[0], clamp(pose.target[1], 0, 30), pose.target[2]];
  if (bounds) {
    const reach = bounds.radius * 1.15;
    target[0] = clamp(target[0], bounds.center[0] - reach, bounds.center[0] + reach);
    target[2] = clamp(target[2], bounds.center[2] - reach, bounds.center[2] + reach);
  }
  return {
    target,
    yaw: pose.yaw,
    pitch: clamp(pose.pitch, LIMITS.minPitch, LIMITS.maxPitch),
    distance: clamp(pose.distance, LIMITS.minDistance, LIMITS.maxDistance),
  };
}

export function eyeOf(pose: Pose): Vec3 {
  const horizontal = Math.cos(pose.pitch) * pose.distance;
  return [
    pose.target[0] + Math.sin(pose.yaw) * horizontal,
    pose.target[1] + Math.sin(pose.pitch) * pose.distance,
    pose.target[2] + Math.cos(pose.yaw) * horizontal,
  ];
}

export interface CameraMatrices {
  viewProjection: Mat4;
  eye: Vec3;
}

export function cameraMatrices(pose: Pose, aspect: number): CameraMatrices {
  const eye = eyeOf(pose);
  const near = Math.max(0.4, pose.distance * 0.02);
  const projection = perspective(FOV_Y, Math.max(0.1, aspect), near, pose.distance * 4 + 900);
  return { viewProjection: multiply(projection, lookAt(eye, pose.target)), eye };
}

export interface FitOptions {
  /** Share of the viewport width the plant should span (0..1). */
  fill?: number;
  /** Shares of the viewport height kept free above (tags, tall tanks) and below (caption, tools). */
  top?: number;
  bottom?: number;
}

export const HOME_VIEW = { yaw: -0.2, pitch: 0.7, fill: 0.85, top: 0.09, bottom: 0.09 } as const;

/** Screen-space box (0..1 on both axes) of the plant floor rectangle, or null if a corner is behind the eye. */
export function floorBox(pose: Pose, bounds: PlantBounds, aspect: number): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const [halfW, halfD] = bounds.extent ?? [bounds.radius * 0.85, bounds.radius * 0.53];
  const [cx, , cz] = bounds.center;
  const { viewProjection } = cameraMatrices(pose, aspect);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = projectToScreen(viewProjection, [cx + sx * halfW, 0, cz + sz * halfD], 1, 1);
    if (p.depth <= 0) return null;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Whole plant in view, from the south-west, like the 2D drawing tipped back. The plant floor spans
 * `fill` of the real viewport width (or the free height, whichever limits first) and is centred in
 * the free area, so the same framing works for a wide window and for a narrow stage between docks.
 */
export function defaultPose(bounds: PlantBounds, aspect: number, options: FitOptions = {}): Pose {
  const fill = clamp(options.fill ?? HOME_VIEW.fill, 0.3, 0.98);
  const top = clamp(options.top ?? HOME_VIEW.top, 0, 0.4);
  const bottom = clamp(options.bottom ?? HOME_VIEW.bottom, 0, 0.4);
  const [cx, , cz] = bounds.center;
  const pose: Pose = { target: [cx, 0, cz], yaw: HOME_VIEW.yaw, pitch: HOME_VIEW.pitch, distance: bounds.radius * 2.4 };
  const tanHalf = Math.tan(FOV_Y / 2);
  const right: Vec3 = [Math.cos(pose.yaw), 0, -Math.sin(pose.yaw)];
  const forward: Vec3 = [-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)];
  for (let step = 0; step < 24; step++) {
    const box = floorBox(pose, bounds, aspect);
    if (!box) {
      pose.distance *= 1.5;
      continue;
    }
    // Distance: perspective size is close to inversely proportional to distance.
    const scale = Math.max((box.maxX - box.minX) / fill, (box.maxY - box.minY) / (1 - top - bottom));
    pose.distance = clamp(pose.distance * scale, LIMITS.minDistance, LIMITS.maxDistance);
    // Centre: slide the target across the floor until the box sits in the middle of the free area.
    const dx = (box.minX + box.maxX) / 2 - 0.5;
    const dy = (box.minY + box.maxY) / 2 - (top + (1 - top - bottom) / 2);
    const across = dx * 2 * pose.distance * tanHalf * aspect;
    const along = (dy * 2 * pose.distance * tanHalf) / Math.sin(pose.pitch);
    pose.target = [
      pose.target[0] + right[0] * across - forward[0] * along,
      0,
      pose.target[2] + right[2] * across - forward[2] * along,
    ];
    if (Math.abs(scale - 1) < 0.002 && Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) break;
  }
  return clampPose(pose);
}

/** Pose that frames one node (asset, entry point or area), keeping the current viewing angle. */
export function framePose(current: Pose, center: Vec3, radius: number, height: number): Pose {
  return clampPose({
    target: [center[0], Math.min(height * 0.4, 4), center[2]],
    yaw: current.yaw,
    pitch: clamp(current.pitch, 0.42, 0.95),
    distance: clamp(radius * 6 + height * 2 + 26, 34, 150),
  });
}

/** Drag to orbit: pixels to radians. */
export function orbit(pose: Pose, dx: number, dy: number): Pose {
  return clampPose({ ...pose, yaw: pose.yaw - dx * 0.0045, pitch: pose.pitch + dy * 0.004 });
}

/** Drag to pan across the floor plane: the point under the cursor follows the pointer. */
export function pan(pose: Pose, dx: number, dy: number, viewportHeight: number, bounds?: PlantBounds): Pose {
  const perPixel = (2 * pose.distance * Math.tan(FOV_Y / 2)) / Math.max(1, viewportHeight);
  const right: Vec3 = [Math.cos(pose.yaw), 0, -Math.sin(pose.yaw)];
  const forward: Vec3 = [-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)];
  const depth = perPixel / Math.max(0.35, Math.sin(pose.pitch));
  return clampPose({
    ...pose,
    target: [
      pose.target[0] - right[0] * dx * perPixel + forward[0] * dy * depth,
      pose.target[1],
      pose.target[2] - right[2] * dx * perPixel + forward[2] * dy * depth,
    ],
  }, bounds);
}

/** factor > 1 moves away. */
export function zoom(pose: Pose, factor: number): Pose {
  return clampPose({ ...pose, distance: pose.distance * factor });
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOutCubic = (t: number) => {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  // Take the short way around when yaws differ by more than half a turn.
  let delta = (b.yaw - a.yaw) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return {
    target: lerp3(a.target, b.target, t),
    yaw: a.yaw + delta * t,
    pitch: lerp(a.pitch, b.pitch, t),
    distance: lerp(a.distance, b.distance, t),
  };
}

/** Height offset of a device dropping in from above: falls, then one small settle bounce. */
export function dropOffset(t: number, fromHeight = 16): number {
  const c = clamp(t, 0, 1);
  if (c < 0.62) {
    const fall = c / 0.62;
    return fromHeight * (1 - fall * fall);
  }
  const settle = (c - 0.62) / 0.38;
  return Math.sin(settle * Math.PI) * 0.7 * (1 - settle);
}
