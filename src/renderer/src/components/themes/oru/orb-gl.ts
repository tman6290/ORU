// The orb renderer (D17): raw WebGL2, two passes into one transparent canvas.
//   1. Sphere: a full-canvas fragment shader. Noise-displaced silhouette,
//      fresnel rim, glassy interior noise, inner bands that spin up while
//      thinking, and a soft glow outside the rim (cheap stand-in for bloom).
//   2. Particle shell: point sprites on a sphere that rotates around it.
// Both blend additively. State weights and level come from motion.ts.

const SPHERE_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const SPHERE_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;
uniform vec4 uW;   // idle, listening, thinking, speaking
uniform vec2 uW2;  // muted, error
uniform float uLow; // 1 on battery: no glow
out vec4 outColor;

// Compact 3D value noise + fbm.
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }

void main() {
  float idle = uW.x, listen = uW.y, think = uW.z, speak = uW.w;
  float muted = uW2.x, err = uW2.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * min(uRes.x, uRes.y));
  float r = length(p);
  vec2 dir = r > 0.0 ? p / r : vec2(0.0, 1.0);

  // Silhouette: breathing + noise displacement, driven by state and voice.
  float t = uTime;
  float breath = sin(t * 1.1) * 0.012 * (idle + muted);
  float amp = 0.008 + 0.012 * listen + 0.02 * think + uLevel * (0.05 * speak + 0.03 * listen);
  float disp = (fbm(vec3(dir * 2.2, t * (0.25 + 0.9 * think + 0.6 * speak))) - 0.5) * 2.0 * amp;
  float R = 0.6 * (1.0 + breath + disp + uLevel * (0.07 * speak + 0.03 * listen) - 0.04 * muted);

  vec3 green = vec3(0.224, 1.0, 0.078);      // --oru-primary
  vec3 warn = vec3(1.0, 0.69, 0.0);          // --oru-warn
  float flick = step(0.45, fract(t * 9.0));
  vec3 base = mix(green, warn, err * flick);
  float bright = 0.75 * idle + 1.05 * listen + 1.0 * think + 1.0 * speak + 0.32 * muted + 0.9 * err;

  vec3 col = vec3(0.0);
  if (r < R) {
    float z = sqrt(max(0.0, 1.0 - (r * r) / (R * R)));
    vec3 n = vec3(p / R, z);
    mat3 spin = rotY(t * (0.12 + 0.9 * think)) * rotX(0.35);
    vec3 q = spin * n;
    // Glass interior: soft drifting density.
    float dens = fbm(q * 2.6 + vec3(0.0, t * 0.08, t * 0.05));
    // Inner structure: thin bands that spin up while thinking.
    float bands = pow(abs(sin(dot(q, normalize(vec3(0.3, 1.0, 0.2))) * 14.0 + t * 3.0)), 24.0);
    float rim = pow(1.0 - z, 4.5);
    // Tighter, brighter surface while listening.
    float skin = pow(1.0 - z, 6.0) * listen * (0.6 + uLevel);
    // Glass: a dark, faintly cloudy interior; the light lives on the rim.
    float core = exp(-r * r * 14.0) * (0.06 + 0.55 * speak * uLevel + 0.18 * think);
    // Specular glint (upper left) sells the glass.
    float spec = pow(max(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0), 40.0) * 0.35;
    float v = 0.006 + pow(dens, 2.5) * 0.12 + rim * 1.9 + skin + bands * think * 0.4 + core;
    col = base * v * bright + vec3(spec * 0.6, spec, spec * 0.6) * bright;
  }
  // Glow outside the rim (and a faint halo inside it).
  float edge = max(0.0, r - R);
  float glow = exp(-edge * (7.0 - 2.5 * speak * uLevel)) * (0.45 + 0.5 * speak * uLevel + 0.2 * listen);
  col += base * glow * bright * (1.0 - 0.7 * uLow) * (r < R ? 0.0 : 1.0);

  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  outColor = vec4(min(col, vec3(a)), a);
}`;

const POINTS_VS = `#version 300 es
in vec3 aPos;
uniform float uTime;
uniform float uLevel;
uniform vec4 uW;
uniform vec2 uW2;
uniform float uAspect;
uniform float uScale;
out float vAlpha;
void main() {
  float think = uW.z, speak = uW.w, listen = uW.y;
  float a = uTime * (0.08 + 0.5 * think);
  float c = cos(a), s = sin(a);
  vec3 p = vec3(c * aPos.x + s * aPos.z, aPos.y, -s * aPos.x + c * aPos.z);
  float ct = cos(0.4), st = sin(0.4);
  p = vec3(p.x, ct * p.y - st * p.z, st * p.y + ct * p.z);
  // Shell radius: breathes out with voice, pulls in while thinking.
  float rad = 0.78 + uLevel * (0.12 * speak + 0.06 * listen) - 0.08 * think
            + 0.02 * sin(uTime * 2.0 + aPos.y * 6.0) * think;
  p *= rad;
  float persp = 1.0 / (1.0 - p.z * 0.35);
  gl_Position = vec4(p.x * persp / uAspect, p.y * persp, 0.0, 1.0);
  // Back half sits behind the glass: fainter.
  vAlpha = (p.z > 0.0 ? 0.95 : 0.35) * (0.6 + 0.4 * (think + speak + listen)) * (1.0 - 0.7 * uW2.x);
  gl_PointSize = uScale * persp * (1.0 + think * 0.5);
}`;

const POINTS_FS = `#version 300 es
precision mediump float;
in float vAlpha;
out vec4 outColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float f = smoothstep(0.5, 0.0, length(d));
  float a = f * vAlpha;
  outColor = vec4(vec3(0.224, 1.0, 0.078) * a, a);
}`;

export interface OrbFrame {
  time: number;
  level: number;
  w: { idle: number; listening: number; thinking: number; speaking: number; muted: number; error: number };
  lowPower: boolean;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const why = gl.isContextLost() ? "WebGL context lost" : gl.getShaderInfoLog(sh);
    throw new Error(`orb shader: ${why}`);
  }
  return sh;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`orb program: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

/** Fibonacci sphere: evenly spread points. */
function shellPoints(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    // Store in a scrambled order (389 is coprime with the counts we use), so
    // drawing only the first N points on battery still covers the whole sphere.
    const j = (i * 389) % n;
    out[j * 3] = Math.cos(th) * r;
    out[j * 3 + 1] = y;
    out[j * 3 + 2] = Math.sin(th) * r;
  }
  return out;
}

export class OrbRenderer {
  private gl: WebGL2RenderingContext;
  private sphere: WebGLProgram;
  private points: WebGLProgram;
  private quadVao: WebGLVertexArrayObject;
  private pointsVao: WebGLVertexArrayObject;
  private pointCount = { full: 900, low: 300 };
  private u: Record<string, WebGLUniformLocation | null> = {};
  private pu: Record<string, WebGLUniformLocation | null> = {};

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.sphere = program(gl, SPHERE_VS, SPHERE_FS);
    this.points = program(gl, POINTS_VS, POINTS_FS);

    this.quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(this.sphere, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.pointsVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.pointsVao);
    const pts = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pts);
    gl.bufferData(gl.ARRAY_BUFFER, shellPoints(this.pointCount.full), gl.STATIC_DRAW);
    const aP = gl.getAttribLocation(this.points, "aPos");
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    for (const n of ["uRes", "uTime", "uLevel", "uW", "uW2", "uLow"]) {
      this.u[n] = gl.getUniformLocation(this.sphere, n);
    }
    for (const n of ["uTime", "uLevel", "uW", "uW2", "uAspect", "uScale"]) {
      this.pu[n] = gl.getUniformLocation(this.points, n);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // additive, premultiplied
  }

  /** Match the drawing buffer to the element size, with a capped pixel ratio. */
  resize(maxDpr: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  render(f: OrbFrame) {
    const { gl, canvas } = this;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const w4 = [f.w.idle, f.w.listening, f.w.thinking, f.w.speaking] as const;

    gl.useProgram(this.sphere);
    gl.uniform2f(this.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(this.u.uTime, f.time);
    gl.uniform1f(this.u.uLevel, f.level);
    gl.uniform4f(this.u.uW, ...w4);
    gl.uniform2f(this.u.uW2, f.w.muted, f.w.error);
    gl.uniform1f(this.u.uLow, f.lowPower ? 1 : 0);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(this.points);
    gl.uniform1f(this.pu.uTime, f.time);
    gl.uniform1f(this.pu.uLevel, f.level);
    gl.uniform4f(this.pu.uW, ...w4);
    gl.uniform2f(this.pu.uW2, f.w.muted, f.w.error);
    gl.uniform1f(this.pu.uAspect, canvas.width / canvas.height);
    gl.uniform1f(this.pu.uScale, Math.max(2, canvas.height / 170));
    gl.bindVertexArray(this.pointsVao);
    gl.drawArrays(gl.POINTS, 0, f.lowPower ? this.pointCount.low : this.pointCount.full);
    gl.bindVertexArray(null);
  }

  /** Free GPU objects. Never loses the context: the canvas may be reused (React
   *  dev mode mounts twice), and a lost context can't compile shaders. */
  dispose() {
    const { gl } = this;
    gl.deleteProgram(this.sphere);
    gl.deleteProgram(this.points);
    gl.deleteVertexArray(this.quadVao);
    gl.deleteVertexArray(this.pointsVao);
  }
}
