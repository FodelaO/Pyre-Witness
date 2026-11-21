/** Unit primitive meshes (triangles + crisp edge lines) for the instanced plant renderer. */

export const PRIMS = ["box", "cylinder", "tube", "dome", "sphere", "quad", "cone"] as const;
export type Prim = (typeof PRIMS)[number];

export interface Mesh {
  /** xyz per vertex. */
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  /** xyz pairs drawn with gl.LINES in the edge pass. */
  edges: Float32Array;
}

class Builder {
  positions: number[] = [];
  normals: number[] = [];
  indices: number[] = [];
  edges: number[] = [];

  vertex(p: number[], n: number[]): number {
    this.positions.push(p[0], p[1], p[2]);
    this.normals.push(n[0], n[1], n[2]);
    return this.positions.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) {
    this.indices.push(a, b, c);
  }
  quad(a: number, b: number, c: number, d: number) {
    this.indices.push(a, b, c, a, c, d);
  }
  line(a: number[], b: number[]) {
    this.edges.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  ring(y: number, radius: number, segments: number) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      this.line([Math.cos(a0) * radius, y, Math.sin(a0) * radius], [Math.cos(a1) * radius, y, Math.sin(a1) * radius]);
    }
  }
  mesh(): Mesh {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      indices: new Uint16Array(this.indices),
      edges: new Float32Array(this.edges),
    };
  }
}

/** x, z in [-0.5, 0.5], y in [0, 1]: scale is the full size, origin at the base centre. */
function box(): Mesh {
  const b = new Builder();
  const faces: Array<{ n: number[]; corners: number[][] }> = [
    { n: [0, 1, 0], corners: [[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]] },
    { n: [0, -1, 0], corners: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]] },
    { n: [0, 0, 1], corners: [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]] },
    { n: [0, 0, -1], corners: [[0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]] },
    { n: [1, 0, 0], corners: [[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]] },
    { n: [-1, 0, 0], corners: [[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]] },
  ];
  for (const { n, corners } of faces) {
    const [a, c, d, e] = corners.map((corner) => b.vertex(corner, n));
    b.quad(a, c, d, e);
  }
  for (const y of [0, 1]) {
    b.line([-0.5, y, -0.5], [0.5, y, -0.5]);
    b.line([0.5, y, -0.5], [0.5, y, 0.5]);
    b.line([0.5, y, 0.5], [-0.5, y, 0.5]);
    b.line([-0.5, y, 0.5], [-0.5, y, -0.5]);
  }
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) b.line([x, 0, z], [x, 1, z]);
  return b.mesh();
}

/** Radius 1 in XZ, y in [0, 1]. */
function cylinder(segments: number, caps: boolean, edgeRings: boolean): Mesh {
  const b = new Builder();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const n = [Math.cos(a), 0, Math.sin(a)];
    b.vertex([n[0], 0, n[2]], n);
    b.vertex([n[0], 1, n[2]], n);
  }
  for (let i = 0; i < segments; i++) {
    const k = i * 2;
    b.quad(k, k + 1, k + 3, k + 2);
  }
  if (caps) {
    for (const [y, ny] of [[1, 1], [0, -1]]) {
      const centre = b.vertex([0, y, 0], [0, ny, 0]);
      const first = centre + 1;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        b.vertex([Math.cos(a), y, Math.sin(a)], [0, ny, 0]);
      }
      for (let i = 0; i < segments; i++) {
        if (ny > 0) b.tri(centre, first + i + 1, first + i);
        else b.tri(centre, first + i, first + i + 1);
      }
    }
  }
  if (edgeRings) {
    b.ring(0, 1, segments);
    b.ring(1, 1, segments);
  }
  return b.mesh();
}

/** Latitude bands of a radius-1 sphere between two polar angles (0 = +Y pole). */
function sphereBands(b: Builder, rings: number, segments: number, from: number, to: number) {
  const start = b.positions.length / 3;
  for (let r = 0; r <= rings; r++) {
    const polar = from + ((to - from) * r) / rings;
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const n = [Math.sin(polar) * Math.cos(a), Math.cos(polar), Math.sin(polar) * Math.sin(a)];
      b.vertex(n, n);
    }
  }
  const row = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const k = start + r * row + s;
      b.quad(k, k + 1, k + row + 1, k + row);
    }
  }
}

/** Hemisphere, radius 1, base at y = 0: scale Y to flatten a tank head. */
function dome(): Mesh {
  const b = new Builder();
  sphereBands(b, 5, 20, 0, Math.PI / 2);
  b.ring(0, 1, 20);
  const steps = 8;
  for (const turn of [0, Math.PI / 2]) {
    for (let i = 0; i < steps * 2; i++) {
      const p0 = -Math.PI / 2 + (i / (steps * 2)) * Math.PI;
      const p1 = -Math.PI / 2 + ((i + 1) / (steps * 2)) * Math.PI;
      const at = (p: number) => [Math.sin(p) * Math.cos(turn), Math.cos(p), Math.sin(p) * Math.sin(turn)];
      b.line(at(p0), at(p1));
    }
  }
  return b.mesh();
}

/** Radius 1, centred on the origin. */
function sphere(): Mesh {
  const b = new Builder();
  sphereBands(b, 8, 14, 0, Math.PI);
  b.ring(0, 1, 14);
  return b.mesh();
}

/** Flat XZ quad at y = 0, x and z in [-0.5, 0.5]. */
function quad(): Mesh {
  const b = new Builder();
  const n = [0, 1, 0];
  const corners = [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5]];
  const [a, c, d, e] = corners.map((corner) => b.vertex(corner, n));
  b.quad(a, c, d, e);
  for (let i = 0; i < 4; i++) b.line(corners[i], corners[(i + 1) % 4]);
  return b.mesh();
}

/** Base radius 1 at y = 0, apex at y = 1. */
function cone(segments = 12): Mesh {
  const b = new Builder();
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const n = [Math.cos(mid) * 0.7, 0.7, Math.sin(mid) * 0.7];
    const v0 = b.vertex([Math.cos(a0), 0, Math.sin(a0)], n);
    const v1 = b.vertex([Math.cos(a1), 0, Math.sin(a1)], n);
    const top = b.vertex([0, 1, 0], n);
    b.tri(v0, top, v1);
  }
  b.ring(0, 1, segments);
  return b.mesh();
}

export function buildMesh(prim: Prim): Mesh {
  switch (prim) {
    case "box": return box();
    case "cylinder": return cylinder(24, true, true);
    case "tube": return cylinder(8, false, false);
    case "dome": return dome();
    case "sphere": return sphere();
    case "quad": return quad();
    case "cone": return cone();
  }
}
