/** Orbit camera: clamping, framing, default fit, drop-in settle, label declutter. */
import { describe, expect, it } from "vitest";
import {
  cameraMatrices, clampPose, defaultPose, dropOffset, floorBox, eyeOf, framePose, LIMITS, mixPose, orbit, pan, zoom, type Pose,
} from "./camera";
import { projectToScreen } from "./gl/mat4";
import { declutter } from "./labels";

const bounds = { center: [80, 0, 50] as [number, number, number], radius: 94, extent: [80, 50] as [number, number] };
const base: Pose = { target: [80, 0, 50], yaw: -0.2, pitch: 0.8, distance: 180 };

describe("orbit camera", () => {
  it("never goes under the floor, however far the user drags", () => {
    let pose = base;
    for (let i = 0; i < 400; i++) pose = orbit(pose, 7, -30);
    expect(pose.pitch).toBe(LIMITS.minPitch);
    expect(eyeOf(pose)[1]).toBeGreaterThan(0);
    for (let i = 0; i < 400; i++) pose = orbit(pose, 0, 30);
    expect(pose.pitch).toBe(LIMITS.maxPitch);
  });

  it("clamps zoom and keeps the target on or above the floor", () => {
    expect(zoom(base, 1e-6).distance).toBe(LIMITS.minDistance);
    expect(zoom(base, 1e6).distance).toBe(LIMITS.maxDistance);
    expect(clampPose({ ...base, target: [80, -12, 50] }).target[1]).toBe(0);
    expect(eyeOf(clampPose({ ...base, pitch: -1, distance: 1 }))[1]).toBeGreaterThan(0);
  });

  it("pans along the floor and stays near the plant", () => {
    const moved = pan(base, 120, 0, 900, bounds);
    expect(moved.target[1]).toBe(0);
    expect(moved.target[0]).toBeLessThan(base.target[0]);
    let far = base;
    for (let i = 0; i < 200; i++) far = pan(far, -500, 0, 900, bounds);
    expect(far.target[0]).toBeLessThanOrEqual(bounds.center[0] + bounds.radius * 1.15 + 1e-6);
  });

  it("fits the whole plant in the default pose at common aspect ratios", () => {
    for (const [width, height] of [[1440, 900], [1920, 1080], [900, 900]]) {
      const pose = defaultPose(bounds, width / height);
      const { viewProjection } = cameraMatrices(pose, width / height);
      for (const corner of [[0, 0, 0], [160, 0, 0], [160, 0, 100], [0, 0, 100]] as [number, number, number][]) {
        const p = projectToScreen(viewProjection, corner, width, height);
        expect(p.depth).toBeGreaterThan(0);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(height);
      }
    }
  });

  it("frames a node at the centre of the screen, keeping the viewing direction", () => {
    const pose = framePose(base, [12.2, 0, 16.2], 3.2, 9);
    expect(pose.yaw).toBe(base.yaw);
    expect(pose.distance).toBeLessThan(base.distance);
    const { viewProjection } = cameraMatrices(pose, 1.6);
    const p = projectToScreen(viewProjection, pose.target, 1440, 900);
    expect(p.x).toBeCloseTo(720, 2);
    expect(p.y).toBeCloseTo(450, 2);
  });

  it("interpolates poses the short way around", () => {
    const a = { ...base, yaw: 3.0 };
    const b = { ...base, yaw: -3.0 };
    const mid = mixPose(a, b, 0.5);
    expect(Math.abs(mid.yaw - 3.0)).toBeLessThan(0.3);
    expect(mixPose(a, b, 0).distance).toBe(a.distance);
  });
});

describe("device drop-in", () => {
  it("starts above, lands, settles at zero", () => {
    expect(dropOffset(0)).toBe(16);
    expect(dropOffset(0.3)).toBeGreaterThan(dropOffset(0.5));
    expect(dropOffset(0.62)).toBeCloseTo(0, 5);
    expect(dropOffset(0.8)).toBeGreaterThan(0);
    expect(dropOffset(0.8)).toBeLessThan(1);
    expect(dropOffset(1)).toBeCloseTo(0, 5);
    expect(dropOffset(5)).toBeCloseTo(0, 5);
  });
});

describe("label declutter", () => {
  const box = (id: string, x: number, priority: number, forced = false) => ({ id, x, y: 100, width: 60, height: 20, priority, forced });

  it("keeps the higher priority label when two collide", () => {
    const shown = declutter([box("low", 100, 1), box("high", 120, 9), box("apart", 400, 1)]);
    expect([...shown].sort()).toEqual(["apart", "high"]);
  });

  it("always keeps forced labels (selected, hovered, crew)", () => {
    const shown = declutter([box("selected", 100, 0, true), box("big", 110, 500)]);
    expect(shown.has("selected")).toBe(true);
    expect(shown.has("big")).toBe(false);
  });

  it("frames the plant at about 85% of the stage width, clear of the bottom strip, for narrow and wide stages", () => {
    for (const [width, height] of [[906, 771], [1332, 951], [1440, 900], [700, 700]]) {
      const pose = defaultPose(bounds, width / height, { bottom: 50 / height });
      const box = floorBox(pose, bounds, width / height);
      expect(box).not.toBeNull();
      if (!box) continue;
      expect(box.maxX - box.minX).toBeGreaterThan(0.83);
      expect(box.maxX - box.minX).toBeLessThan(0.87);
      expect(Math.abs((box.minX + box.maxX) / 2 - 0.5)).toBeLessThan(0.01);
      expect(box.minY).toBeGreaterThan(0.08);
      expect(box.maxY * height).toBeLessThan(height - 50);
    }
  });
});
