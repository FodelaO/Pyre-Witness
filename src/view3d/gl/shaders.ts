/** GLSL ES 3.00 sources: one instanced program used for the fill, edge and picking passes. */

/** Fragment patterns selected per instance (misc.y). Keep in sync with the switch in FRAGMENT. */
export const PATTERN = {
  plain: 0,
  /** Tube with bands moving along its length (param 1 = flowing, 0 = isolated). */
  flow: 1,
  /** Conveyor belt top with chevrons (param 1 = running). */
  chevron: 2,
  /** Diagonal floor hatch in world space (hazard zones). */
  hatch: 3,
  /** Ground plane with a drawing grid. */
  grid: 4,
  /** Soft contact shadow blob on a quad. */
  shadow: 5,
  /** Floor ring that only appears for the selected / hovered / highlighted id. */
  focusRing: 6,
  /** Floor ring that is always visible (finding severity, new device placement). */
  statusRing: 7,
  /** Attack arc segment: param = hop position, extra.y = birth time in seconds. */
  arc: 8,
  /** Dotted floor (washdown zones). */
  dots: 9,
  /** Low translucent wall fading upwards. */
  wall: 10,
} as const;

export const PASS = { fill: 0, edge: 1, pick: 2 } as const;

/** Highlight ids accepted per frame (hovered attack path nodes, area members...). */
export const MAX_HIGHLIGHTS = 32;

export const VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec4 aM0;
layout(location = 3) in vec4 aM1;
layout(location = 4) in vec4 aM2;
layout(location = 5) in vec4 aM3;
layout(location = 6) in vec4 aColor;
layout(location = 7) in vec4 aMisc;   // emissive, pattern, param, id
layout(location = 8) in vec4 aExtra;  // spin rad/s, pivot x, pivot z, edge strength

uniform mat4 uViewProj;
uniform float uTime;
uniform float uMotion;
uniform float uDropId;
uniform float uDropY;

out vec3 vWorld;
out vec3 vNormal;
out vec3 vLocal;
out vec3 vScale;
out vec4 vColor;
out vec4 vMisc;
out vec4 vExtra;

void main() {
  mat4 model = mat4(aM0, aM1, aM2, aM3);
  vec3 s2 = vec3(dot(aM0.xyz, aM0.xyz), dot(aM1.xyz, aM1.xyz), dot(aM2.xyz, aM2.xyz));
  vec4 world = model * vec4(aPos, 1.0);
  vec3 normal = mat3(model) * (aNormal / max(s2, vec3(1e-8)));
  if (aExtra.x != 0.0) {
    float angle = aExtra.x * uTime * uMotion;
    float c = cos(angle);
    float s = sin(angle);
    vec2 p = world.xz - aExtra.yz;
    world.xz = aExtra.yz + vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    normal.xz = vec2(c * normal.x - s * normal.z, s * normal.x + c * normal.z);
  }
  // A newly placed device drops in; its floor markings (patterns 5-7) stay on the floor.
  if (uDropId > 0.5 && abs(aMisc.w - uDropId) < 0.5 && (aMisc.y < 4.5 || aMisc.y > 7.5)) world.y += uDropY;
  vWorld = world.xyz;
  vNormal = normal;
  vLocal = aPos;
  vScale = sqrt(s2);
  vColor = aColor;
  vMisc = aMisc;
  vExtra = aExtra;
  gl_Position = uViewProj * world;
}
`;

export const FRAGMENT = `#version 300 es
precision highp float;

in vec3 vWorld;
in vec3 vNormal;
in vec3 vLocal;
in vec3 vScale;
in vec4 vColor;
in vec4 vMisc;
in vec4 vExtra;

uniform int uPass;
uniform float uTime;
uniform float uMotion;
uniform vec3 uEye;
uniform vec3 uLightDir;
uniform vec3 uBg;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec2 uFog;
uniform vec3 uEdgeColor;
uniform vec3 uSelColor;
uniform vec3 uHoverColor;
uniform float uSel;
uniform float uHover;
uniform float uHi[${MAX_HIGHLIGHTS}];
uniform float uDim;

out vec4 outColor;

bool same(float a, float b) { return a > 0.5 && abs(a - b) < 0.5; }

float ringMask(float inner, float outer) {
  float d = length(vLocal.xz) * 2.0;
  float w = fwidth(d) * 1.5 + 0.004;
  return smoothstep(inner - w, inner, d) * (1.0 - smoothstep(outer, outer + w, d));
}

void main() {
  float id = vMisc.w;
  int pattern = int(vMisc.y + 0.5);
  float param = vMisc.z;

  if (uPass == 2) {
    if (id < 0.5) discard;
    float lo = mod(id, 256.0);
    float mid = mod(floor(id / 256.0), 256.0);
    float hi = floor(id / 65536.0);
    outColor = vec4(lo / 255.0, mid / 255.0, hi / 255.0, 1.0);
    return;
  }

  bool selected = same(id, uSel);
  bool hovered = same(id, uHover);
  bool highlighted = false;
  for (int i = 0; i < ${MAX_HIGHLIGHTS}; i++) { if (same(id, uHi[i])) highlighted = true; }

  float dist = length(vWorld - uEye);
  float fog = smoothstep(uFog.x, uFog.y, dist);

  if (uPass == 1) {
    float strength = vExtra.w;
    if (strength <= 0.0) discard;
    vec3 line = strength > 1.0 ? vColor.rgb : uEdgeColor;
    float alpha = strength > 1.0 ? strength - 1.0 : strength;
    if (selected) { line = uSelColor; alpha = 1.0; }
    else if (hovered || highlighted) { line = uHoverColor; alpha = max(alpha, 0.95); }
    else alpha *= uDim;
    alpha *= 1.0 - fog * 0.85;
    if (alpha < 0.01) discard;
    outColor = vec4(line, alpha);
    return;
  }

  vec3 base = vColor.rgb;
  float alpha = vColor.a;
  float emissive = vMisc.x;

  if (pattern == 1) {
    float along = vLocal.y * vScale.y;
    float band = fract(along / 2.4 - uTime * 0.55 * uMotion * param);
    float pulse = smoothstep(0.0, 0.08, band) * (1.0 - smoothstep(0.34, 0.42, band));
    base = mix(base * 0.62, base * 1.18 + 0.06, param > 0.5 ? pulse : 0.0);
    emissive = param > 0.5 ? 0.55 + 0.25 * pulse : 0.3;
  } else if (pattern == 2) {
    float along = vLocal.x * vScale.x;
    float across = abs(vLocal.z) * vScale.z;
    float v = fract((along + across * 0.9) / 1.5 - uTime * 0.5 * uMotion * param);
    float chevron = 1.0 - smoothstep(0.16, 0.22, v);
    base = mix(base, uEdgeColor, chevron * 0.42);
  } else if (pattern == 3) {
    float v = fract((vWorld.x + vWorld.z) / 1.6);
    float w = fwidth((vWorld.x + vWorld.z) / 1.6);
    float stripe = 1.0 - smoothstep(0.10, 0.10 + w * 1.5, v);
    alpha *= 0.16 + 0.84 * stripe;
  } else if (pattern == 4) {
    vec2 minor = abs(fract(vWorld.xz / 2.0 - 0.5) - 0.5) / max(fwidth(vWorld.xz / 2.0), vec2(1e-5));
    vec2 major = abs(fract(vWorld.xz / 10.0 - 0.5) - 0.5) / max(fwidth(vWorld.xz / 10.0), vec2(1e-5));
    float lineMinor = 1.0 - min(min(minor.x, minor.y), 1.0);
    float lineMajor = 1.0 - min(min(major.x, major.y), 1.0);
    float fade = 1.0 - smoothstep(60.0, 190.0, dist);
    base += uEdgeColor * (lineMinor * 0.035 + lineMajor * 0.075) * fade;
    emissive = 1.0;
  } else if (pattern == 5) {
    float d = length(vLocal.xz) * 2.0;
    alpha *= 1.0 - smoothstep(0.25, 1.0, d);
    emissive = 1.0;
  } else if (pattern == 6) {
    float ring = ringMask(0.86, 0.915);
    float on = selected ? 1.0 : (hovered ? 0.8 : (highlighted ? 0.65 : 0.0));
    base = selected ? uSelColor : uHoverColor;
    alpha = ring * on;
    emissive = 1.0;
  } else if (pattern == 7) {
    float d = length(vLocal.xz) * 2.0;
    float ring = ringMask(0.87, 0.93);
    alpha *= ring + (1.0 - smoothstep(0.0, 0.9, d)) * 0.10;
    emissive = 1.0;
  } else if (pattern == 8) {
    float progress = (uTime - vExtra.y) * 3.2;
    if (param + vLocal.y * 0.12 > progress) discard;
    float pulse = fract(param * 0.35 - uTime * 0.45 * uMotion);
    float glow = smoothstep(0.75, 1.0, pulse) + smoothstep(0.12, 0.0, pulse);
    base = base * (0.85 + 0.25 * glow) + vec3(0.22, 0.10, 0.12) * glow;
    emissive = 1.0;
  } else if (pattern == 9) {
    vec2 cell = fract(vWorld.xz / 1.1) - 0.5;
    float w = fwidth(vWorld.x / 1.1) * 1.5;
    float dotMask = 1.0 - smoothstep(0.11, 0.11 + w, length(cell));
    alpha *= 0.10 + 0.9 * dotMask;
  } else if (pattern == 10) {
    alpha *= 1.0 - vLocal.y * 0.55;
  }

  if (alpha < 0.004) discard;

  vec3 n = normalize(vNormal);
  float lambert = max(dot(n, uLightDir), 0.0);
  float wrap = dot(n, uLightDir) * 0.5 + 0.5;
  vec3 ambient = mix(uGround, uSky, n.y * 0.5 + 0.5);
  vec3 lit = base * (ambient + vec3(0.62) * lambert + vec3(0.16) * wrap);
  vec3 view = normalize(uEye - vWorld);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  lit += uEdgeColor * rim * 0.10;
  vec3 color = mix(lit, base, clamp(emissive, 0.0, 1.0));

  if (pattern != 6 && pattern != 7 && pattern != 5 && pattern != 4) {
    if (selected) color = mix(color, uSelColor, 0.14) + uSelColor * 0.05;
    else if (hovered || highlighted) color = mix(color, uHoverColor, 0.16);
    else color *= mix(1.0, uDim, step(0.5, id));
  }

  color = mix(color, uBg, fog);
  outColor = vec4(color, alpha);
}
`;
