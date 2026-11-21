/**
 * Hand-written WebGL2 renderer for the plant: instanced primitives, one directional light with
 * hemisphere ambient, distance fog, crisp gl.LINES edges, an offscreen id pass for picking,
 * and full resource disposal. No dependencies.
 */
import type { Layer } from "../parts";
import type { Palette } from "../palette";
import { buildMesh, PRIMS, type Prim } from "./geometry";
import { FLOATS_PER_INSTANCE, type Batch } from "./instances";
import type { Mat4, Vec3 } from "./mat4";
import { decodePickId } from "./pickId";
import { createProgram, type Program } from "./program";
import { FRAGMENT, MAX_HIGHLIGHTS, PASS, VERTEX } from "./shaders";

export interface FrameState {
  viewProjection: Mat4;
  eye: Vec3;
  /** Seconds since the view mounted. */
  time: number;
  /** 0 freezes rotation and flow (prefers-reduced-motion), 1 animates. */
  motion: number;
  fog: [number, number];
  selected: number;
  hovered: number;
  highlights: readonly number[];
  /** Pick number of the device currently dropping in, and its height offset. */
  dropId: number;
  dropY: number;
  /** Brightness of everything that is not in focus (1 = no dimming). */
  dim: number;
}

interface GpuMesh {
  vertices: WebGLBuffer;
  indices: WebGLBuffer;
  indexCount: number;
  edges: WebGLBuffer;
  edgeVertexCount: number;
}

interface GpuBatch {
  layer: Layer;
  prim: Prim;
  count: number;
  instances: WebGLBuffer;
  fill: WebGLVertexArrayObject;
  edge: WebGLVertexArrayObject;
}

const LIGHT: Vec3 = [-0.36, 0.82, 0.44];
const PICK_SCALE = 0.5;

export function isWebGL2Available(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    const ok = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  lost = false;
  private program!: Program;
  private meshes = new Map<Prim, GpuMesh>();
  private groups = new Map<string, Batch[]>();
  private gpu = new Map<string, GpuBatch[]>();
  private pickFbo: WebGLFramebuffer | null = null;
  private pickColor: WebGLTexture | null = null;
  private pickDepth: WebGLRenderbuffer | null = null;
  private pickSize: [number, number] = [0, 0];
  private readonly pixel = new Uint8Array(4);
  private readonly highlightBuffer = new Float32Array(MAX_HIGHLIGHTS);
  private disposed = false;

  constructor(readonly canvas: HTMLCanvasElement, private palette: Palette, private readonly onRestore: () => void) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
    this.init();
  }

  private handleLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
  };

  private handleRestored = () => {
    if (this.disposed) return;
    this.lost = false;
    this.meshes.clear();
    this.gpu.clear();
    this.pickFbo = this.pickColor = this.pickDepth = null;
    this.pickSize = [0, 0];
    this.init();
    for (const [name, batches] of this.groups) this.upload(name, batches);
    this.onRestore();
  };

  private init() {
    const gl = this.gl;
    this.program = createProgram(gl, VERTEX, FRAGMENT);
    for (const prim of PRIMS) {
      const mesh = buildMesh(prim);
      const interleaved = new Float32Array((mesh.positions.length / 3) * 6);
      for (let i = 0; i < mesh.positions.length / 3; i++) {
        interleaved.set(mesh.positions.subarray(i * 3, i * 3 + 3), i * 6);
        interleaved.set(mesh.normals.subarray(i * 3, i * 3 + 3), i * 6 + 3);
      }
      const vertices = gl.createBuffer() as WebGLBuffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
      const edges = gl.createBuffer() as WebGLBuffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, edges);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.edges, gl.STATIC_DRAW);
      const indices = gl.createBuffer() as WebGLBuffer;
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      this.meshes.set(prim, { vertices, indices, indexCount: mesh.indices.length, edges, edgeVertexCount: mesh.edges.length / 3 });
    }
  }

  /** True when WebGL runs on a CPU rasteriser (SwiftShader, llvmpipe...): too slow to animate. */
  isSoftware(): boolean {
    const info = this.gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(info ? this.gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : this.gl.getParameter(this.gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  }

  setPalette(palette: Palette) {
    this.palette = palette;
  }

  /** Replaces one named group of batches ("scene", "arcs"). CPU copies are kept for context restore. */
  setBatches(name: string, batches: Batch[]) {
    this.groups.set(name, batches);
    if (!this.lost) this.upload(name, batches);
  }

  private bindInstanceAttributes() {
    const gl = this.gl;
    const stride = FLOATS_PER_INSTANCE * 4;
    for (let i = 0; i < 7; i++) {
      const location = 2 + i;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, stride, i * 16);
      gl.vertexAttribDivisor(location, 1);
    }
  }

  private upload(name: string, batches: Batch[]) {
    const gl = this.gl;
    this.release(name);
    const out: GpuBatch[] = [];
    for (const batch of batches) {
      const mesh = this.meshes.get(batch.prim);
      if (!mesh || batch.count === 0) continue;
      const instances = gl.createBuffer() as WebGLBuffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferData(gl.ARRAY_BUFFER, batch.data, gl.STATIC_DRAW);

      const fill = gl.createVertexArray() as WebGLVertexArrayObject;
      gl.bindVertexArray(fill);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      this.bindInstanceAttributes();

      const edge = gl.createVertexArray() as WebGLVertexArrayObject;
      gl.bindVertexArray(edge);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.edges);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      this.bindInstanceAttributes();

      gl.bindVertexArray(null);
      out.push({ layer: batch.layer, prim: batch.prim, count: batch.count, instances, fill, edge });
    }
    this.gpu.set(name, out);
  }

  private release(name: string) {
    const gl = this.gl;
    for (const batch of this.gpu.get(name) ?? []) {
      gl.deleteBuffer(batch.instances);
      gl.deleteVertexArray(batch.fill);
      gl.deleteVertexArray(batch.edge);
    }
    this.gpu.delete(name);
  }

  /** Sizes the drawing buffer to CSS size x device pixel ratio (capped at 2). Returns true if it changed. */
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): boolean {
    const ratio = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));
    if (this.canvas.width === width && this.canvas.height === height) return false;
    this.canvas.width = width;
    this.canvas.height = height;
    return true;
  }

  private setUniforms(frame: FrameState, pass: number) {
    const gl = this.gl;
    const p = this.program;
    const pal = this.palette;
    gl.useProgram(p.handle);
    gl.uniformMatrix4fv(p.uniform("uViewProj"), false, frame.viewProjection);
    gl.uniform1f(p.uniform("uTime"), frame.time);
    gl.uniform1f(p.uniform("uMotion"), frame.motion);
    gl.uniform1f(p.uniform("uDropId"), frame.dropId);
    gl.uniform1f(p.uniform("uDropY"), frame.dropY);
    gl.uniform1i(p.uniform("uPass"), pass);
    gl.uniform3fv(p.uniform("uEye"), frame.eye);
    const l = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform3f(p.uniform("uLightDir"), LIGHT[0] / l, LIGHT[1] / l, LIGHT[2] / l);
    gl.uniform3fv(p.uniform("uBg"), pal.bg);
    gl.uniform1i(p.uniform("uDaylight"), pal.daylight ? 1 : 0);
    if (pal.daylight) {
      gl.uniform3f(p.uniform("uSky"), 0.57, 0.59, 0.61);
      gl.uniform3f(p.uniform("uGround"), 0.32, 0.34, 0.37);
    } else {
      gl.uniform3f(p.uniform("uSky"), 0.62, 0.68, 0.78);
      gl.uniform3f(p.uniform("uGround"), 0.3, 0.33, 0.4);
    }
    gl.uniform2f(p.uniform("uFog"), frame.fog[0], frame.fog[1]);
    gl.uniform3fv(p.uniform("uEdgeColor"), pal.outline);
    gl.uniform3fv(p.uniform("uSelColor"), pal.info);
    gl.uniform3fv(p.uniform("uHoverColor"), pal.eqAccent);
    gl.uniform1f(p.uniform("uSel"), frame.selected);
    gl.uniform1f(p.uniform("uHover"), frame.hovered);
    gl.uniform1f(p.uniform("uDim"), frame.dim);
    this.highlightBuffer.fill(0);
    for (let i = 0; i < Math.min(MAX_HIGHLIGHTS, frame.highlights.length); i++) this.highlightBuffer[i] = frame.highlights[i];
    gl.uniform1fv(p.uniform("uHi[0]"), this.highlightBuffer);
  }

  private drawLayer(layer: Layer, edges: boolean) {
    const gl = this.gl;
    for (const batches of this.gpu.values()) {
      for (const batch of batches) {
        if (batch.layer !== layer) continue;
        const mesh = this.meshes.get(batch.prim) as GpuMesh;
        if (edges) {
          if (mesh.edgeVertexCount === 0) continue;
          gl.bindVertexArray(batch.edge);
          gl.vertexAttrib3f(1, 0, 1, 0);
          gl.drawArraysInstanced(gl.LINES, 0, mesh.edgeVertexCount, batch.count);
        } else {
          gl.bindVertexArray(batch.fill);
          gl.drawElementsInstanced(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0, batch.count);
        }
      }
    }
  }

  render(frame: FrameState) {
    if (this.lost || this.disposed) return;
    const gl = this.gl;
    const bg = this.palette.bg;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);

    // Opaque bodies, pushed back slightly so their edge lines sit on top without z-fighting.
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    this.setUniforms(frame, PASS.fill);
    this.drawLayer("opaque", false);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    // Translucent floor markings, walls and rings first, then linework over everything.
    gl.uniform1i(this.program.uniform("uPass"), PASS.fill);
    this.drawLayer("blend", false);
    gl.uniform1i(this.program.uniform("uPass"), PASS.edge);
    this.drawLayer("blend", true);
    this.drawLayer("opaque", true);

    // Attack arcs last: a solid alarm-coloured core inside a faint wider halo.
    gl.uniform1i(this.program.uniform("uPass"), PASS.fill);
    this.drawLayer("glow", false);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  private ensurePickTarget() {
    const gl = this.gl;
    const width = Math.max(1, Math.round(this.canvas.width * PICK_SCALE));
    const height = Math.max(1, Math.round(this.canvas.height * PICK_SCALE));
    if (this.pickFbo && this.pickSize[0] === width && this.pickSize[1] === height) return;
    if (this.pickColor) gl.deleteTexture(this.pickColor);
    if (this.pickDepth) gl.deleteRenderbuffer(this.pickDepth);
    if (!this.pickFbo) this.pickFbo = gl.createFramebuffer();
    this.pickColor = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickColor);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.pickDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickColor, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.pickSize = [width, height];
  }

  /** Id pass: returns the pick number under a CSS-pixel position (0 = nothing). */
  pick(frame: FrameState, cssX: number, cssY: number, cssWidth: number, cssHeight: number): number {
    if (this.lost || this.disposed || cssWidth <= 0 || cssHeight <= 0) return 0;
    const gl = this.gl;
    this.ensurePickTarget();
    const [width, height] = this.pickSize;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    this.setUniforms(frame, PASS.pick);
    this.drawLayer("pick", false);
    const x = Math.min(width - 1, Math.max(0, Math.floor((cssX / cssWidth) * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor((1 - cssY / cssHeight) * height)));
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    return this.pixel[3] === 0 ? 0 : decodePickId(this.pixel[0], this.pixel[1], this.pixel[2]);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    for (const name of [...this.gpu.keys()]) this.release(name);
    for (const mesh of this.meshes.values()) {
      gl.deleteBuffer(mesh.vertices);
      gl.deleteBuffer(mesh.indices);
      gl.deleteBuffer(mesh.edges);
    }
    this.meshes.clear();
    this.groups.clear();
    if (this.pickColor) gl.deleteTexture(this.pickColor);
    if (this.pickDepth) gl.deleteRenderbuffer(this.pickDepth);
    if (this.pickFbo) gl.deleteFramebuffer(this.pickFbo);
    this.program.dispose();
    // Free the GPU context now instead of waiting for garbage collection.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
