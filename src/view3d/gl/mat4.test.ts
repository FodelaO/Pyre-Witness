/** Matrix helpers and world -> screen projection. */
import { describe, expect, it } from "vitest";
import {
  identity, lookAt, multiply, perspective, projectToScreen, rotationY, scaling, segmentMatrix, transformPoint, translation,
  type Vec3,
} from "./mat4";

const close = (a: readonly number[], b: readonly number[], digits = 5) => a.forEach((value, i) => expect(value).toBeCloseTo(b[i], digits));

describe("mat4", () => {
  it("multiplies in column-major order: translation applies after scaling", () => {
    const m = multiply(translation(10, 0, 0), scaling(2, 2, 2));
    close(transformPoint(m, [1, 1, 1]), [12, 2, 2]);
    close(multiply(identity(), m), m);
  });

  it("rotates +x towards -z for a positive yaw", () => {
    close(transformPoint(rotationY(Math.PI / 2), [1, 0, 0]), [0, 0, -1]);
  });

  it("maps the unit Y segment onto a pipe segment", () => {
    const a: Vec3 = [3, 4.4, 5];
    const b: Vec3 = [13, 4.4, 5];
    const m = segmentMatrix(a, b, 0.17);
    close(transformPoint(m, [0, 0, 0]), a);
    close(transformPoint(m, [0, 1, 0]), b);
    const rim = transformPoint(m, [1, 0.5, 0]);
    expect(Math.hypot(rim[0] - 8, rim[1] - 4.4, rim[2] - 5)).toBeCloseTo(0.17, 5);
  });

  it("handles vertical segments (pipe drops)", () => {
    const m = segmentMatrix([2, 0, 2], [2, 6, 2], 0.1);
    close(transformPoint(m, [0, 1, 0]), [2, 6, 2]);
    expect(m.every(Number.isFinite)).toBe(true);
  });
});

describe("projectToScreen", () => {
  const eye: Vec3 = [80, 60, 140];
  const target: Vec3 = [80, 0, 48];
  const viewProjection = multiply(perspective((32 * Math.PI) / 180, 1440 / 900, 1, 1000), lookAt(eye, target));

  it("puts the look-at target at the centre of the viewport", () => {
    const p = projectToScreen(viewProjection, target, 1440, 900);
    expect(p.visible).toBe(true);
    expect(p.x).toBeCloseTo(720, 3);
    expect(p.y).toBeCloseTo(450, 3);
    expect(p.depth).toBeCloseTo(Math.hypot(60, 92), 3);
  });

  it("keeps screen axes: +x is right, up is up, nearer is lower on screen", () => {
    const centre = projectToScreen(viewProjection, target, 1440, 900);
    expect(projectToScreen(viewProjection, [100, 0, 48], 1440, 900).x).toBeGreaterThan(centre.x);
    expect(projectToScreen(viewProjection, [80, 8, 48], 1440, 900).y).toBeLessThan(centre.y);
    expect(projectToScreen(viewProjection, [80, 0, 70], 1440, 900).y).toBeGreaterThan(centre.y);
  });

  it("hides points behind the camera", () => {
    const behind = projectToScreen(viewProjection, [80, 120, 232], 1440, 900);
    expect(behind.visible).toBe(false);
    expect(behind.depth).toBeLessThanOrEqual(0);
  });

  it("hides points far outside the viewport", () => {
    expect(projectToScreen(viewProjection, [900, 0, 48], 1440, 900).visible).toBe(false);
  });
});
