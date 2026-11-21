/** Twin -> 3D scene mapping: what is drawn must be the twin, nothing more. */
import { describe, expect, it } from "vitest";
import { FOOTPRINT } from "@/equipment/types";
import { routePoints } from "@/floor/routing";
import { evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import type { Asset, AttackPath, Twin } from "@/twin/types";
import { arcParts, attackSegments, mergePaths, pathIsActive } from "./attackArcs";
import { packParts, FLOATS_PER_INSTANCE } from "./gl/instances";
import { transformPoint } from "./gl/mat4";
import { PATTERN } from "./gl/shaders";
import { DEFAULT_PALETTE } from "./palette";
import { footprintOf, HEIGHTS_CAPTION, RACK_HEIGHT, sceneFromTwin } from "./scene";

const twin = SEED_TWIN;
const withAsset = (asset: Asset): Twin => ({ ...twin, assets: [...twin.assets, asset] });
const patchAsset = (id: string, fn: (asset: Asset) => Asset): Twin => ({ ...twin, assets: twin.assets.map((a) => (a.id === id ? fn(a) : a)) });
const template = twin.assets.find((asset) => asset.physical.kind === "hmi") as Asset;

function device(overrides: Partial<Asset> & { kind?: string; x?: number; y?: number; rotation?: number }): Asset {
  return {
    ...template,
    id: "NEW-1",
    name: "Captured device",
    origin: "added",
    process: undefined,
    ...overrides,
    physical: {
      ...template.physical,
      connections: [],
      x: overrides.x ?? 600,
      y: overrides.y ?? 500,
      rotation: overrides.rotation ?? 0,
      kind: (overrides.kind ?? "phone") as Asset["physical"]["kind"],
    },
  };
}

describe("sceneFromTwin", () => {
  const scene = sceneFromTwin(twin, "material");

  it("draws every asset once, at its twin position, pickable and tagged", () => {
    const assets = scene.nodes.filter((node) => node.type === "asset");
    expect(assets).toHaveLength(twin.assets.length);
    for (const asset of twin.assets) {
      const node = scene.byId.get(asset.id);
      expect(node?.type).toBe("asset");
      expect(node?.pickable).toBe(true);
      expect(node?.label).toBe(asset.id);
      expect(node?.center[0]).toBeCloseTo(asset.physical.x / 10, 6);
      expect(node?.center[2]).toBeCloseTo(asset.physical.y / 10, 6);
      expect(node?.height).toBeGreaterThan(0.5);
      expect(node?.parts.some((part) => part.layer === "pick")).toBe(true);
    }
  });

  it("sizes bodies from FOOTPRINT and the asset scale (10 units = 1 m)", () => {
    const skid = twin.assets.find((asset) => asset.id === "RO-101") as Asset;
    const { w, d } = footprintOf(skid);
    expect(w).toBeCloseTo((FOOTPRINT.ro_skid.w * 0.88) / 10, 6);
    expect(d).toBeCloseTo((FOOTPRINT.ro_skid.h * 0.88) / 10, 6);
    expect(scene.byId.get("RO-101")?.radius).toBeCloseTo(w / 2, 6);
  });

  it("draws areas as slabs with 0.4 m walls and overlay zones as floor patterns", () => {
    for (const area of twin.areas) expect(scene.byId.get(area.id)?.label).toBe(area.name);
    const room = scene.byId.get("filler3");
    expect(room?.type).toBe("area");
    const walls = room?.parts.filter((part) => part.pattern === PATTERN.wall) ?? [];
    expect(walls).toHaveLength(4);
    for (const wall of walls) expect(transformPoint(wall.m, [0, 1, 0])[1]).toBeCloseTo(0.4, 6);
    expect(scene.byId.get("nh3_hazard")?.parts[0].pattern).toBe(PATTERN.hatch);
    expect(scene.byId.get("nh3_hazard")?.parts[0].color).toEqual(DEFAULT_PALETTE.attention);
    expect(scene.byId.get("washdown")?.parts[0].pattern).toBe(PATTERN.dots);
    expect(scene.byId.get("washdown")?.type).toBe("zone");
  });

  it("rotates the filler carousel only while the line runs", () => {
    const spinning = scene.byId.get("FIL-3")?.parts.filter((part) => part.spin !== 0) ?? [];
    expect(spinning.length).toBeGreaterThan(12);
    const stopped = sceneFromTwin(patchAsset("FIL-3", (a) => ({ ...a, process: { ...a.process, running: false } })), "material");
    expect(stopped.byId.get("FIL-3")?.parts.some((part) => part.spin !== 0)).toBe(false);
    const offline = sceneFromTwin(patchAsset("FIL-3", (a) => ({ ...a, status: "offline" })), "material");
    expect(offline.byId.get("FIL-3")?.parts.some((part) => part.spin !== 0)).toBe(false);
  });

  it("shows a level band in the medium colour only when the twin reports a level", () => {
    const tank = twin.assets.find((asset) => asset.id === "TK-101") as Asset;
    expect(tank.process?.levelPct).toBeTypeOf("number");
    const lit = (id: string, s = scene) => s.byId.get(id)?.parts.filter((part) => part.emissive > 0.8 && part.color === DEFAULT_PALETTE.media.water) ?? [];
    expect(lit("TK-101").length).toBe(2);
    const band = lit("TK-101")[0];
    const body = scene.byId.get("TK-101")?.parts[0];
    const bandY = transformPoint(band.m, [0, 0.5, 0])[1];
    const shellTop = transformPoint(body!.m, [0, 1, 0])[1];
    expect(bandY / shellTop).toBeGreaterThan(0.6);
    expect(bandY / shellTop).toBeLessThan(0.8);
    const noLevel = sceneFromTwin(patchAsset("TK-101", (a) => ({ ...a, process: { ...a.process, levelPct: undefined } })), "material");
    expect(lit("TK-101", noLevel)).toHaveLength(0);
  });

  it("routes pipes along the 2D floor route, coloured by medium, flowing when active", () => {
    const connections = twin.assets.flatMap((a) => a.physical.connections.filter((c) => c.medium !== "network"));
    const pipes = scene.nodes.filter((node) => node.type === "pipe");
    expect(pipes).toHaveLength(connections.length);

    const skid = twin.assets.find((asset) => asset.id === "RO-101") as Asset;
    const index = skid.physical.connections.findIndex((c) => c.medium === "water");
    const connection = skid.physical.connections[index];
    const target = twin.assets.find((asset) => asset.id === connection.to) as Asset;
    const route = routePoints(skid.physical, target.physical, connection.via);
    const pipe = scene.byId.get(`pipe:RO-101:${index}`);
    const tubes = pipe?.parts.filter((part) => part.prim === "tube") ?? [];
    expect(tubes.every((part) => part.color === DEFAULT_PALETTE.media.water && part.pattern === PATTERN.flow)).toBe(true);
    expect(tubes.every((part) => part.param === 1)).toBe(true);
    const corners = tubes.flatMap((part) => [transformPoint(part.m, [0, 0, 0]), transformPoint(part.m, [0, 1, 0])]);
    for (const point of route) {
      expect(corners.some((corner) => Math.abs(corner[0] - point.x / 10) < 1e-6 && Math.abs(corner[2] - point.y / 10) < 1e-6)).toBe(true);
    }
    expect(Math.max(...corners.map((corner) => corner[1]))).toBeLessThanOrEqual(RACK_HEIGHT.water + 1e-6);
  });

  it("stops the flow bands on isolated lines and stopped sources", () => {
    const stopped = sceneFromTwin(patchAsset("P-101", (a) => ({ ...a, process: { ...a.process, running: false } })), "material");
    const tubes = stopped.byId.get("pipe:P-101:0")?.parts.filter((part) => part.prim === "tube") ?? [];
    expect(tubes.length).toBeGreaterThan(0);
    expect(tubes.every((part) => part.param === 0)).toBe(true);
  });

  it("shows network links only in the Both and Data lenses", () => {
    const links = twin.assets.flatMap((a) => a.physical.connections.filter((c) => c.medium === "network" && c.to !== a.id));
    expect(scene.nodes.filter((node) => node.type === "link")).toHaveLength(0);
    for (const lens of ["both", "data"] as const) {
      const s = sceneFromTwin(twin, lens);
      expect(s.nodes.filter((node) => node.type === "link")).toHaveLength(links.length);
      expect(s.nodes.filter((node) => node.type === "pipe")).toHaveLength(scene.nodes.filter((node) => node.type === "pipe").length);
      expect(s.nodes.filter((node) => node.type === "asset")).toHaveLength(twin.assets.length);
    }
  });

  it("places an entry-point beacon for every exposure origin", () => {
    for (const entry of twin.entryPoints) {
      const node = scene.byId.get(entry.id);
      expect(node?.type).toBe("entry");
      expect(node?.label).toBe(entry.name);
      expect(node?.pickable).toBe(true);
    }
  });

  it("keeps equipment in steel: saturated colour only for meaning", () => {
    const { steel, steelDark, steelLight, eqAccent, eqStroke } = DEFAULT_PALETTE;
    const neutral = (c: number[]) => Math.max(...c) - Math.min(...c) < 0.2;
    expect([steel, steelDark, steelLight, eqAccent, eqStroke].every(neutral)).toBe(true);
    const pump = scene.byId.get("P-101");
    expect(pump?.state).toBeUndefined();
    for (const part of pump?.parts.filter((p) => p.layer === "opaque") ?? []) expect(neutral(part.color)).toBe(true);
  });

  it("marks finding severity with the attention / alarm colours", () => {
    const risk = evaluateTwin(twin);
    const marked = sceneFromTwin(twin, "both", { findings: risk.findings });
    const worst = risk.findings.reduce((a, b) => (b.severity > a.severity ? b : a));
    const node = marked.byId.get(worst.assetId);
    expect(node?.state).toBe(worst.severity >= 4 ? "alarm" : "attention");
    expect(node?.parts.some((part) => part.pattern === PATTERN.statusRing)).toBe(true);
    expect(sceneFromTwin(twin, "both").byId.get(worst.assetId)?.parts.some((part) => part.pattern === PATTERN.statusRing)).toBe(false);
  });

  it("follows the lens like the 2D floor: cyber findings and control gear recede in Material", () => {
    const risk = evaluateTwin(twin);
    const cyber = risk.findings.find((finding) => finding.kind === "cyber");
    const material = sceneFromTwin(twin, "material", { findings: risk.findings });
    const data = sceneFromTwin(twin, "data", { findings: risk.findings });
    if (cyber) {
      const onlyCyber = risk.findings.filter((f) => f.assetId === cyber.assetId).every((f) => f.kind === "cyber");
      if (onlyCyber) expect(material.byId.get(cyber.assetId)?.state).toBeUndefined();
      expect(data.byId.get(cyber.assetId)?.state).toBeDefined();
    }
    // A PLC cabinet is data-lens gear, a tank is material-lens gear, an instrument belongs to both.
    expect(material.byId.get("PLC-F3")?.ghost).toBe(true);
    expect(material.byId.get("TK-101")?.ghost).toBeUndefined();
    expect(data.byId.get("PLC-F3")?.ghost).toBeUndefined();
    expect(data.byId.get("TK-101")?.ghost).toBe(true);
    for (const lens of ["material", "both", "data"] as const) {
      const s = sceneFromTwin(twin, lens);
      expect(s.byId.get("LT-101")?.ghost).toBeUndefined();
      if (lens === "both") expect(s.nodes.some((node) => node.ghost)).toBe(false);
      // Receded gear stays in the scene and stays pickable (linked selection must still work).
      expect(s.byId.get("PLC-F3")?.pickable).toBe(true);
    }
    expect(material.byId.get("internet")?.ghost).toBe(true);
    expect(material.byId.get("visitor")?.ghost).toBeUndefined();
    expect(data.byId.get("internet")?.ghost).toBeUndefined();
  });

  it("never recedes a device added by a capture", () => {
    const s = sceneFromTwin(withAsset(device({ kind: "phone", placement: "unsafe" })), "material");
    expect(s.byId.get("NEW-1")?.ghost).toBeUndefined();
    expect(s.byId.get("NEW-1")?.state).toBe("alarm");
  });

  it("shows a new device as dropped (alarm) vs recommended (ok)", () => {
    const unsafe = sceneFromTwin(withAsset(device({ placement: "unsafe" })), "material").byId.get("NEW-1");
    const good = sceneFromTwin(withAsset(device({ placement: "recommended" })), "material").byId.get("NEW-1");
    expect(unsafe?.state).toBe("alarm");
    expect(good?.state).toBe("ok");
    expect(unsafe?.parts.find((part) => part.pattern === PATTERN.statusRing)?.color).toEqual(DEFAULT_PALETTE.alarm);
    expect(good?.parts.find((part) => part.pattern === PATTERN.statusRing)?.color).toEqual(DEFAULT_PALETTE.ok);
    expect(unsafe!.priority).toBeGreaterThan(scene.byId.get("FIL-3")!.priority);
  });

  it("renders an unknown kind as a labelled box instead of failing", () => {
    const s = sceneFromTwin(withAsset(device({ kind: "quantum_widget", origin: "seed" })), "material");
    const node = s.byId.get("NEW-1");
    expect(node?.label).toBe("NEW-1");
    const body = node?.parts.filter((part) => part.layer === "opaque") ?? [];
    expect(body).toHaveLength(1);
    expect(body[0].prim).toBe("box");
  });

  it("rotates a body with physical.rotation (clockwise seen from above)", () => {
    const part = (rotation: number) => {
      const s = sceneFromTwin(withAsset(device({ kind: "conveyor", origin: "seed", rotation })), "material");
      return s.byId.get("NEW-1")!.parts.find((p) => p.pattern === PATTERN.chevron)!;
    };
    const along = transformPoint(part(0).m, [0.5, 0, 0]);
    const turned = transformPoint(part(90).m, [0.5, 0, 0]);
    expect(along[0] - 60).toBeGreaterThan(5);
    expect(Math.abs(along[2] - 50)).toBeLessThan(1e-6);
    expect(Math.abs(turned[0] - 60)).toBeLessThan(1e-6);
    expect(turned[2] - 50).toBeGreaterThan(5);
  });

  it("says that heights are illustrative", () => {
    expect(scene.caption).toBe(HEIGHTS_CAPTION);
    expect(scene.caption).toMatch(/heights illustrative/);
  });

  it("packs every part into 28-float instances with the node's pick number", () => {
    const groups = scene.nodes.map((node, i) => ({ pickNumber: node.pickable ? i + 1 : 0, parts: node.parts }));
    const batches = packParts(groups);
    const total = scene.nodes.reduce((sum, node) => sum + node.parts.length, 0);
    expect(batches.reduce((sum, batch) => sum + batch.count, 0)).toBe(total);
    for (const batch of batches) {
      expect(batch.data.length).toBe(batch.count * FLOATS_PER_INSTANCE);
      expect(batch.data.every(Number.isFinite)).toBe(true);
    }
    const picks = batches.filter((batch) => batch.layer === "pick");
    expect(picks.reduce((sum, batch) => sum + batch.count, 0)).toBe(twin.assets.length + twin.entryPoints.length);
    for (const batch of picks) for (let i = 0; i < batch.count; i++) expect(batch.data[i * FLOATS_PER_INSTANCE + 23]).toBeGreaterThan(0);
  });
});

describe("attack arcs", () => {
  const risk = evaluateTwin(twin);
  const scene = sceneFromTwin(twin, "both", { findings: risk.findings });

  it("comes only from the rules engine report (and the run's self-check)", () => {
    expect(risk.paths.length).toBeGreaterThan(0);
    const segments = attackSegments(risk.paths);
    const steps = new Set(risk.paths.flatMap((path) => path.steps.map((s) => s.from + ">" + s.to + ">" + s.via)));
    expect(segments.length).toBe(steps.size);
    for (const segment of segments) expect(steps.has(segment.key)).toBe(true);
    expect(attackSegments([])).toEqual([]);
  });

  it("orders hops so a path draws progressively from its entry", () => {
    const path = risk.paths.find((p) => p.steps.length >= 3) as AttackPath;
    const segments = attackSegments([path]);
    expect(segments.map((segment) => segment.hop)).toEqual(path.steps.map((_, i) => i));
    const parts = arcParts(segments, scene, new Set(segments.map((s) => s.key)), () => 2, DEFAULT_PALETTE);
    const cores = parts.filter((part) => part.prim === "tube" && part.alpha === 1);
    expect(cores.every((part) => part.pattern === PATTERN.arc && part.layer === "glow" && part.pivot[0] === 2)).toBe(true);
    expect(cores.every((part) => part.color === DEFAULT_PALETTE.alarm)).toBe(true);
    const params = cores.map((part) => part.param);
    expect(params).toEqual([...params].sort((a, b) => a - b));
    expect(Math.max(...params)).toBeLessThan(path.steps.length);
    expect(parts.filter((part) => part.prim === "cone")).toHaveLength(path.steps.length);
  });

  it("emphasises paths by the same rule as the 2D floor", () => {
    const path = risk.paths[0];
    expect(pathIsActive(path, new Set([path.target]), null)).toBe(true);
    expect(pathIsActive(path, new Set(["not-a-node"]), null)).toBe(false);
    expect(pathIsActive({ ...path, causedBy: "NEW-1" }, new Set(), "NEW-1")).toBe(true);
  });

  it("merges self-check paths without duplicating ids", () => {
    const extra: AttackPath = { ...risk.paths[0], id: "selfcheck-1" };
    expect(mergePaths(risk.paths, [risk.paths[0], extra], null)).toHaveLength(risk.paths.length + 1);
  });
});
