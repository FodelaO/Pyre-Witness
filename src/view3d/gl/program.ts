/** Compiles and links a WebGL2 program and caches its uniform locations. */

export interface Program {
  handle: WebGLProgram;
  uniform: (name: string) => WebGLUniformLocation | null;
  dispose: () => void;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL2: could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    throw new Error("WebGL2 shader compile failed: " + log);
  }
  return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program {
  const handle = gl.createProgram();
  if (!handle) throw new Error("WebGL2: could not create a program");
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(handle, vs);
  gl.attachShader(handle, fs);
  gl.linkProgram(handle);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(handle) ?? "unknown error";
    gl.deleteProgram(handle);
    throw new Error("WebGL2 program link failed: " + log);
  }
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    handle,
    uniform(name) {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(handle, name));
      return cache.get(name) ?? null;
    },
    dispose: () => gl.deleteProgram(handle),
  };
}
