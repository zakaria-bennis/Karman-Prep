// The Library's hero: one sky cut in two on a slight slant, an even half each.
//   Reading and Writing: golden hour, drifting cloud, wooded hills, and the open book (book.ts).
//   Math: a real night. A Milky Way with its dust lanes, thousands of stars in three depths that twinkle
//   and wheel slowly about a pole, a breathing nebula, the odd shooting star, a glass-domed observatory
//   and its dishes set into the hills, and a few constellations.
// The constellations are quiet on purpose (founder, 2026-11-15: "very subtle and low-key, but also
// breathing and flowing ... just slightly more prominent than the background stars"). They are small,
// made only of straight vectors from star to star, and they keep changing: each one is drawn, held,
// drawn back, and comes again as another figure (an isosceles triangle, a parallelogram, a sideways M,
// the sum sign). How many of them are joined up follows how many skills are Proficient: the rest wait
// as loose stars.
// The seam glows. Hovering a half leans it a little; dragging moves it; choosing a half sweeps that sky
// across the whole stage, then the sky itself opens like an iris onto the Library's own background.
import { gsap } from "gsap";
import * as THREE from "three";
import { buildBook } from "./book";
import type { Hero, Side, Stage } from "./stage";

const SKY = /* glsl */ `
  precision highp float;
  uniform float uS, uTime, uOpen, uSurge;
  uniform vec2 uN, uHalf, uFocus;
  uniform vec3 uObs;     // the observatory: where it stands (x), how big it is, unused
  uniform vec4 uShoot;   // where it starts (xy), how far along it is (z), how bright (w)
  varying vec2 vP; varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
  float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
  float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
  // a row of pines along a ridge: each a small peak, of its own height, with gaps between
  float pines(float x, float f, float amp) {
    float h = hash(vec2(floor(x * f), f));
    return (1.0 - abs(fract(x * f) - 0.5) * 2.0) * amp * (0.35 + 0.65 * h) * step(0.3, h);
  }
  // the three ridges, far to near, as heights in the stage (0 foot, 1 top)
  float ridge1(float x) { return 0.215 + 0.05 * sin(x * 0.9 + 0.5) + 0.025 * sin(x * 2.3 + 1.7); }
  float ridge2(float x) { return 0.135 + 0.04 * sin(x * 1.4 + 2.1) + 0.02 * sin(x * 3.7); }
  float ridge3(float x) { return 0.055 + 0.03 * sin(x * 2.1 + 4.0) + 0.012 * sin(x * 5.3); }

  vec3 dusk(vec2 p, float y) {
    vec3 c = mix(vec3(1.0, 0.79, 0.56), vec3(0.98, 0.64, 0.56), smoothstep(0.0, 0.45, y));
    c = mix(c, vec3(0.60, 0.50, 0.75), smoothstep(0.35, 1.0, y));
    vec2 sun = vec2(-uHalf.x * 0.25, -uHalf.y * 0.6);
    c += vec3(1.0, 0.74, 0.38) * exp(-length((p - sun) * vec2(0.5, 1.0)) * 0.85) * 0.6;
    // cloud, lit warm from below, drifting
    float cl = fbm(vec2(p.x * 0.42 + uTime * 0.02, p.y * 1.15) + 3.0);
    float bank = smoothstep(0.50, 0.78, cl) * smoothstep(0.18, 0.62, y);
    c = mix(c, vec3(1.0, 0.87, 0.78), bank * 0.6);
    c = mix(c, vec3(0.78, 0.50, 0.62), smoothstep(0.64, 0.9, cl) * smoothstep(0.3, 0.8, y) * 0.4);
    return c;
  }

  vec3 night(vec2 p, float y) {
    vec3 c = mix(vec3(0.09, 0.12, 0.31), vec3(0.015, 0.02, 0.09), smoothstep(0.0, 1.0, y));
    c += vec3(0.10, 0.26, 0.34) * exp(-y * 5.5) * 0.7;                    // the last light on the horizon
    // the whole sky wheels slowly about a pole above the stage
    float a = uTime * (0.006 + uSurge * 0.01);
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * (p - vec2(uHalf.x * 0.3, uHalf.y * 1.5));
    // the Milky Way: a band of light with dust lanes through it
    float along = dot(q, vec2(0.8, 0.6));
    float across = dot(q, vec2(-0.6, 0.8)) + 2.1 + 0.4 * sin(along * 0.5);
    float dust = fbm(q * 0.9 + vec2(0.0, uTime * 0.004));
    float lane = fbm(q * 2.3 + 9.0);
    float band = exp(-across * across * 0.9) * (0.4 + dust);
    band *= 1.0 - 0.65 * smoothstep(0.45, 0.75, lane) * exp(-across * across * 2.6);
    c += band * mix(vec3(0.30, 0.30, 0.66), vec3(0.80, 0.56, 0.62), dust) * 0.6;
    c += vec3(0.14, 0.36, 0.44) * fbm(q * 0.33 + vec2(uTime * 0.012, 4.0)) * 0.2;   // a nebula that breathes
    c += vec3(0.34, 0.16, 0.42) * fbm(q * 0.5 - vec2(uTime * 0.008, 1.0)) * 0.16;
    // stars in three depths: a few bright, very many faint, more of them inside the band
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float sc = 6.0 + fi * 7.0;
      vec2 g = q * sc + fi * 17.3; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      float h = hash(id);
      float there = step(0.64 - band * 0.34 - fi * 0.05, h);
      vec2 off = (vec2(hash(id + 3.1), hash(id + 5.7)) - 0.5) * 0.72;
      float d = length(f - off) / sc * 6.0;
      float bright = pow(hash(id + 9.2), 3.0 + fi * 1.5);
      float core = smoothstep(mix(0.03, 0.11, bright), 0.0, d);
      float glow = exp(-d * 30.0) * bright * 0.7;
      float tw = 0.7 + 0.3 * sin(uTime * (1.2 + h * 3.5) + h * 80.0);
      vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.84, 0.66), hash(id + 7.7));
      c += tint * (core * (0.35 + bright * 1.7) + glow) * tw * there;
    }
    // a shooting star: a short bright streak with a fading tail
    vec2 dir = normalize(vec2(-0.86, -0.5));
    vec2 head = uShoot.xy + dir * uShoot.z * 4.2;
    vec2 pa = p - head; float hh = clamp(dot(pa, -dir) / 1.1, 0.0, 1.0);
    float streak = exp(-length(pa + dir * hh * 1.1) * 70.0) * (1.0 - hh);
    c += vec3(1.0, 0.96, 0.86) * streak * uShoot.w * sin(3.1416 * uShoot.z) * 2.2;
    return c;
  }

  // a dish on its mast, tipped up at the sky
  float dish(vec2 o, float r) {
    vec2 up = normalize(vec2(-0.45, 0.89));
    vec2 c = vec2(0.0, 0.62);
    float bowl = max(length(o - c - up * r * 0.72) - r, dot(o - c - up * r * 0.72, up) + r * 0.62);   // a solid shallow bowl
    float mast = sdSeg(o, vec2(0.0, -0.3), c) - 0.07;
    float horn = min(sdSeg(o, c, c + up * r * 0.7) - 0.028, length(o - c - up * r * 0.7) - 0.07);
    return min(min(bowl, mast), horn);
  }
  // the observatory, set into the middle ridge: a glass dome you could stand in and look up through,
  // its frame of struts catching the sky, a small telescope inside, and two dishes beside it
  vec3 observatory(vec3 c, vec2 p) {
    float s = uObs.y;
    float aa = 1.5 / (s * 120.0);
    vec2 o = (p - vec2(uObs.x, (ridge2(uObs.x) * 2.0 - 1.0) * uHalf.y - s * 0.04)) / s;
    // the dishes first, a little behind the dome, each standing on the ground where it is
    for (int i = 0; i < 2; i++) {
      float dx = i == 0 ? 1.55 : -1.5;
      float size = i == 0 ? 0.46 : 0.34;
      float gx = uObs.x + dx * s;
      vec2 q = (p - vec2(gx, (ridge2(gx) * 2.0 - 1.0) * uHalf.y - s * 0.1)) / (s * (i == 0 ? 1.0 : 0.8));
      float d = dish(q, size);
      c = mix(c, vec3(0.20, 0.24, 0.42), smoothstep(aa, -aa, d));
      c += vec3(0.45, 0.6, 0.9) * smoothstep(aa * 2.0, 0.0, abs(d)) * 0.16;
    }
    vec2 dc = vec2(0.0, 0.2);                     // the dome's centre, low, so it sits down in the hill
    float rad = length(o - dc);
    float dome = max(rad - 0.86, dc.y - o.y);
    float inside = smoothstep(aa, -aa, dome);
    // glass: the sky shows through, tinted, brighter towards the rim where glass turns edge-on
    float rim = smoothstep(0.55, 0.86, rad);
    vec3 glass = c * 0.8 + vec3(0.10, 0.15, 0.28) + vec3(0.25, 0.36, 0.6) * rim * 0.6;
    // a warm light low inside, as from a lamp on the floor
    glass += vec3(1.0, 0.66, 0.3) * exp(-length((o - vec2(0.0, 0.3)) * vec2(1.0, 1.7)) * 2.6) * 0.34 * (0.9 + 0.1 * sin(uTime * 1.1));
    // the frame: rings and leaning struts, as a geodesic dome has
    float ang = atan(o.x, o.y - dc.y);
    float struts = min(abs(fract(ang * 2.55 + rad * 1.6) - 0.5), abs(fract(ang * 2.55 - rad * 1.6) - 0.5));
    float rings = abs(fract(rad * 3.5) - 0.5);
    float frame = smoothstep(0.045, 0.0, min(struts, rings * 0.6));
    glass = mix(glass, vec3(0.55, 0.66, 0.9), frame * 0.6);
    c = mix(c, glass, inside);
    c += vec3(0.6, 0.75, 1.0) * smoothstep(aa * 3.0, 0.0, abs(dome)) * 0.35 * step(dc.y, o.y);   // the glass's edge
    // inside it, a telescope on its mount, looking up
    vec2 up = normalize(vec2(-0.42, 0.9));
    float scope = min(sdSeg(o, vec2(0.05, 0.42), vec2(0.05, 0.42) + up * 0.5) - 0.06, sdSeg(o, vec2(0.05, 0.2), vec2(0.05, 0.42)) - 0.035);
    c = mix(c, vec3(0.05, 0.06, 0.14), smoothstep(aa, -aa, scope) * inside);
    // the low wall it stands on, with one lit doorway
    float wall = sdBox(o - vec2(0.0, 0.12), vec2(0.9, 0.1)) - 0.02;
    c = mix(c, vec3(0.09, 0.10, 0.22), smoothstep(aa, -aa, wall));
    float door = sdBox(o - vec2(0.42, 0.11), vec2(0.07, 0.09));
    c = mix(c, vec3(1.0, 0.74, 0.36), smoothstep(aa, -aa, door) * 0.9);
    return c;
  }

  void main() {
    float d = dot(uN, vP) - uS;
    float y = vUv.y;
    vec3 a = dusk(vP, y);
    vec3 b = night(vP, y);
    // the land along the foot of both skies: three ridges, wooded, with mist lying between them
    float r1 = ridge1(vP.x) + pines(vP.x, 11.0, 0.016);
    float r2 = ridge2(vP.x) + pines(vP.x + 3.0, 7.0, 0.03);
    float r3 = ridge3(vP.x) + pines(vP.x + 7.0, 4.2, 0.05) + pines(vP.x + 1.3, 6.4, 0.03);
    float h1 = smoothstep(r1 + 0.003, r1 - 0.003, y);
    float h2 = smoothstep(r2 + 0.003, r2 - 0.003, y);
    float h3 = smoothstep(r3 + 0.003, r3 - 0.003, y);
    float mist1 = exp(-max(r1 - y, 0.0) * 14.0) * h1;
    float mist2 = exp(-max(r2 - y, 0.0) * 12.0) * h2;
    a = mix(a, mix(vec3(0.62, 0.42, 0.50), vec3(0.86, 0.60, 0.56), mist1 * 0.7), h1 * 0.9);
    a = mix(a, mix(vec3(0.44, 0.29, 0.38), vec3(0.70, 0.46, 0.48), mist2 * 0.6), h2);
    a = mix(a, vec3(0.26, 0.17, 0.25), h3);
    b = mix(b, mix(vec3(0.06, 0.08, 0.22), vec3(0.12, 0.17, 0.34), mist1 * 0.7), h1);
    b = observatory(b, vP);
    b = mix(b, mix(vec3(0.035, 0.05, 0.15), vec3(0.08, 0.12, 0.26), mist2 * 0.6), h2);
    b = mix(b, vec3(0.012, 0.018, 0.07), h3);
    vec3 col = mix(a, b, smoothstep(-0.012, 0.012, d));
    col += vec3(1.0, 0.86, 0.62) * exp(-abs(d) * 22.0) * 0.8;     // the seam, and its hot core
    col += vec3(1.0, 0.93, 0.78) * exp(-abs(d) * 170.0) * 0.6;
    // chosen: the sky opens like an iris, with a torn edge, onto whatever is behind the stage
    float r = length(vP - uFocus) + (fbm(vP * 1.4 + 2.0) - 0.5) * 0.9;
    float edge = uOpen * (length(uHalf) * 2.0 + 1.6) - 0.8;
    float alpha = uOpen <= 0.0 ? 1.0 : smoothstep(edge - 0.7, edge, r);
    col += vec3(1.0, 0.9, 0.7) * (1.0 - smoothstep(0.0, 0.5, abs(r - edge))) * step(0.001, uOpen) * 0.5;
    // the sky is drawn first and solid, so it writes its own see-through: colour times alpha, then alpha
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/* a vector between two stars: a fine line with a faint halo, and a slow light that travels along it */
const VECTOR_VERT = /* glsl */ `
  attribute float aAlong; attribute float aAcross; attribute float aOrder; attribute float aLen;
  varying float vAlong; varying float vAcross; varying float vOrder; varying float vLen; varying vec2 vWorld;
  void main() {
    vAlong = aAlong; vAcross = aAcross; vOrder = aOrder; vLen = aLen;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xy;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const VECTOR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uDraw, uCount, uTime, uSurge, uFade, uS, uSeed; uniform vec2 uN;
  varying float vAlong; varying float vAcross; varying float vOrder; varying float vLen; varying vec2 vWorld;
  void main() {
    if (dot(uN, vWorld) - uS < 0.0) discard;                 // the seam cuts it
    float t = clamp(uDraw * uCount - vOrder, 0.0, 1.0);        // how much of this vector is drawn
    if (vAlong > t) discard;
    float core = exp(-vAcross * vAcross * 70.0);
    float halo = exp(-abs(vAcross) * 4.5);
    float breath = 0.75 + 0.25 * sin(uTime * 0.8 + uSeed * 6.0);                        // it breathes
    float run = 0.5 + 0.5 * sin(vAlong * vLen * 9.0 - uTime * (1.1 + uSurge * 2.5) + vOrder);   // and flows
    float tip = exp(-abs(vAlong - t) * vLen * 22.0) * step(t, 0.999) * core;           // the end, while it is drawn
    float ends = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.92, vAlong);
    vec3 col = mix(vec3(0.60, 0.76, 1.0), vec3(0.95, 0.95, 1.0), core);
    float a = (core * (0.30 + 0.16 * run) + halo * 0.055) * breath * ends * (1.0 + uSurge * 0.7) + tip * 0.5;
    gl_FragColor = vec4(col, a * uFade);
  }
`;
const STAR_VERT = /* glsl */ `
  attribute float aMag; attribute float aPhase; attribute float aLit;
  uniform float uPx;
  varying float vPhase; varying float vLit; varying vec2 vWorld;
  void main() {
    vPhase = aPhase; vLit = aLit;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xy;
    gl_Position = projectionMatrix * viewMatrix * w;
    gl_PointSize = uPx * (0.6 + aMag * 0.4);
  }
`;
const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uDraw, uCount, uTime, uSurge, uFade, uS, uJoined; uniform vec2 uN;
  varying float vPhase; varying float vLit; varying vec2 vWorld;
  void main() {
    if (dot(uN, vWorld) - uS < 0.0) discard;
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float reach = uDraw * uCount - vLit;                       // has the drawing reached this star yet
    float lit = smoothstep(-0.15, 0.25, reach) * uJoined;
    float flare = exp(-abs(reach) * 3.0) * uJoined;            // a small flare as the vector arrives
    float tw = 0.72 + 0.28 * sin(uTime * (1.4 + vPhase * 1.6) + vPhase * 30.0);
    float core = exp(-r * r * 260.0);
    float halo = exp(-r * 12.0) * 0.22;
    // four thin rays that breathe, as a bright star has through a lens
    float rays = exp(-abs(c.x) * 70.0) * exp(-abs(c.y) * 9.0) + exp(-abs(c.y) * 70.0) * exp(-abs(c.x) * 9.0);
    vec3 col = mix(vec3(0.70, 0.84, 1.0), vec3(1.0, 0.97, 0.90), core);
    float a = (core * 1.1 + halo * tw + rays * 0.28 * tw) * (0.5 + 0.5 * lit) * (1.0 + uSurge * 0.6) + flare * (core + halo * 0.8 + rays * 0.4);
    a *= smoothstep(0.5, 0.3, r);                              // nothing reaches the corners of the point's square
    gl_FragColor = vec4(col, a * uFade);
  }
`;

/* The figures a constellation can take, each made only of straight vectors (founder, 2026-11-15). The
   sum sign and the sideways M are close cousins: the M's point is deeper and it has no end strokes. */
type P = [number, number];
interface Shape {
  name: string;
  pts: P[];
  segs: P[];
}
const SHAPES: Shape[] = [
  {
    name: "isosceles triangle",
    pts: [
      [-0.5, -0.42],
      [0.5, -0.42],
      [0, 0.62],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  },
  {
    name: "parallelogram",
    pts: [
      [-0.68, -0.36],
      [0.32, -0.36],
      [0.68, 0.36],
      [-0.32, 0.36],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  {
    name: "sideways M",
    pts: [
      [-0.4, 0.62],
      [0.42, 0.62],
      [-0.34, 0],
      [0.42, -0.62],
      [-0.4, -0.62],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "sum sign",
    pts: [
      [0.46, 0.44],
      [0.46, 0.62],
      [-0.46, 0.62],
      [0.08, 0],
      [-0.46, -0.62],
      [0.46, -0.62],
      [0.46, -0.44],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
];
/* Where the constellations sit, as fractions of the stage from its centre, on a desktop (wide) and on a
   phone (tall). The first five are on the Math half; the last two are across the seam and only show when
   it is moved. They are joined up in this order as more skills become Proficient. */
const SLOTS: { wide: P; tall: P }[] = [
  { wide: [0.5, 0.36], tall: [0.0, -0.3] },
  { wide: [0.26, 0.64], tall: [-0.55, -0.16] },
  { wide: [0.8, 0.66], tall: [0.58, -0.14] },
  { wide: [0.3, 0.06], tall: [-0.4, -0.5] },
  { wide: [0.76, 0.16], tall: [0.5, -0.42] },
  { wide: [-0.36, 0.56], tall: [0.4, 0.62] },
  { wide: [-0.74, 0.2], tall: [-0.5, 0.36] },
];
const WIDTH = 0.11;

function vectorsOf(shape: Shape): THREE.BufferGeometry {
  // each vector is a thin ribbon: four corners, wide enough to hold its halo
  const pos: number[] = [];
  const along: number[] = [];
  const across: number[] = [];
  const order: number[] = [];
  const len: number[] = [];
  const index: number[] = [];
  shape.segs.forEach(([i, j], k) => {
    const a = new THREE.Vector2(...shape.pts[i]);
    const b = new THREE.Vector2(...shape.pts[j]);
    const dir = b.clone().sub(a);
    const length = dir.length();
    dir.normalize();
    const n = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(WIDTH);
    const corners: [THREE.Vector2, number, number][] = [
      [a, 0, 1],
      [a, 0, -1],
      [b, 1, 1],
      [b, 1, -1],
    ];
    corners.forEach(([p, al, ac]) => {
      const at = p.clone().addScaledVector(n, ac);
      pos.push(at.x, at.y, 0);
      along.push(al);
      across.push(ac);
      order.push(k);
      len.push(length);
    });
    index.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4 + 2, k * 4 + 1, k * 4 + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute("aAcross", new THREE.Float32BufferAttribute(across, 1));
  geo.setAttribute("aOrder", new THREE.Float32BufferAttribute(order, 1));
  geo.setAttribute("aLen", new THREE.Float32BufferAttribute(len, 1));
  geo.setIndex(index);
  return geo;
}

function starsOf(shape: Shape, seed: number): THREE.BufferGeometry {
  // a star lights when the first vector to touch it gets there
  const lit = shape.pts.map((_, i) => {
    let at = Infinity;
    shape.segs.forEach(([a, b], k) => {
      if (a === i) at = Math.min(at, k);
      if (b === i) at = Math.min(at, k + 1);
    });
    return at;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      shape.pts.flatMap(([x, y]) => [x, y, 0]),
      3
    )
  );
  geo.setAttribute(
    "aMag",
    new THREE.Float32BufferAttribute(
      shape.pts.map((_, i) => ((i * 7 + seed * 3) % 5) / 5),
      1
    )
  );
  geo.setAttribute(
    "aPhase",
    new THREE.Float32BufferAttribute(
      shape.pts.map((_, i) => (i * 0.37 + seed * 0.21) % 1),
      1
    )
  );
  geo.setAttribute("aLit", new THREE.Float32BufferAttribute(lit, 1));
  return geo;
}

export function build(stage: Stage, options: { mathShare: number }): Hero {
  const { scene, renderer } = stage;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // the stage's own lights are turned down: the book brings its own warm key
  scene.traverse((o) => {
    const light = o as THREE.DirectionalLight;
    if (light.isDirectionalLight || (o as THREE.HemisphereLight).isHemisphereLight)
      light.intensity *= 0.4;
  });

  const normal = new THREE.Vector2(1, 0);
  const state = { s: 0, range: 1 };
  const reading = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

  const shared = {
    uTime: { value: 0 },
    uS: { value: 0 },
    uN: { value: normal },
    uSurge: { value: 0 },
    uFade: { value: 1 },
  };
  const uniforms = {
    ...shared,
    uOpen: { value: 0 },
    uHalf: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: new THREE.Vector2() },
    uObs: { value: new THREE.Vector3(0, 0.5, 0) },
    uShoot: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      // not "transparent": three.js would then draw it after the book and paint over it
      blending: THREE.NoBlending,
      depthWrite: false,
      depthTest: false,
      vertexShader: `uniform vec2 uHalf; varying vec2 vP; varying vec2 vUv;
        void main() { vUv = uv; vP = position.xy * uHalf; gl_Position = projectionMatrix * modelViewMatrix * vec4(vP, 0.0, 1.0); }`,
      fragmentShader: SKY,
    })
  );
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  // ---- the Reading and Writing half ----
  const book = buildBook(stage, reading);
  stage.stations[0].add(book.root);

  // ---- the Math half: constellations ----
  // the more skills are Proficient, the more of them are joined up; the rest wait as loose stars
  const joined = Math.max(
    1,
    Math.round(Math.max(0, Math.min(1, options.mathShare)) * SLOTS.length)
  );
  const glow = {
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  };
  const slots = SLOTS.map((slot, i) => {
    const group = new THREE.Group();
    const own = {
      uDraw: { value: 0 },
      uCount: { value: 1 },
      uSeed: { value: i * 0.37 },
      uJoined: { value: i < joined ? 1 : 0 },
    };
    const px = { value: 30 };
    const vectors = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({
        uniforms: { ...shared, ...own },
        vertexShader: VECTOR_VERT,
        fragmentShader: VECTOR_FRAG,
        ...glow,
      })
    );
    const stars = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({
        uniforms: { ...shared, ...own, uPx: px },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        ...glow,
      })
    );
    vectors.frustumCulled = stars.frustumCulled = false;
    vectors.renderOrder = -5;
    stars.renderOrder = -4;
    vectors.visible = i < joined;
    group.add(vectors, stars);
    scene.add(group);
    let at = i % SHAPES.length;
    const take = (n: number) => {
      const shape = SHAPES[n % SHAPES.length];
      vectors.geometry.dispose();
      stars.geometry.dispose();
      vectors.geometry = vectorsOf(shape);
      stars.geometry = starsOf(shape, i);
      own.uCount.value = shape.segs.length;
    };
    take(at);
    if (stage.still) own.uDraw.value = 1;
    else if (i < joined) {
      // drawn star by star, held, drawn back, and begun again as the next figure
      const cycle = () => {
        const count = own.uCount.value;
        gsap
          .timeline({ onComplete: cycle })
          .to(own.uDraw, { value: 1, duration: 0.7 * count, ease: "sine.inOut" })
          .to(
            own.uDraw,
            { value: 0, duration: 0.5 * count, ease: "sine.inOut" },
            `+=${6 + i * 1.3}`
          )
          .call(() => take(++at))
          .to({}, { duration: 0.6 });
      };
      gsap.delayedCall(0.6 + i * 0.7, cycle);
    }
    return { group, slot, px, seed: i * 1.7 };
  });

  const shoot = () => {
    const { halfW, halfH } = stage.layout;
    const v = uniforms.uShoot.value;
    // it starts somewhere high on the night side and falls down and to the left
    const base = stage.layout.portrait
      ? [halfW * 0.6, -halfH * 0.05]
      : [halfW * (0.55 + Math.random() * 0.4), halfH * (0.75 + Math.random() * 0.2)];
    v.set(base[0], base[1], 0, 1);
    gsap.fromTo(
      v,
      { z: 0 },
      { z: 1, duration: 0.95, ease: "power1.in", onComplete: () => void (v.w = 0) }
    );
  };
  if (!stage.still) {
    const again = () => {
      shoot();
      gsap.delayedCall(7 + Math.random() * 8, again);
    };
    gsap.delayedCall(4, again);
  }

  stage.onLayout((l) => {
    // wide: the seam stands nearly upright with a slight lean; tall: it runs nearly level with a slight
    // slope and Reading and Writing on top. Either way it passes through the centre: an even half each.
    if (l.portrait) normal.set(0.26, -0.966);
    else normal.set(0.987, 0.159);
    state.range = Math.abs(normal.x) * l.halfW + Math.abs(normal.y) * l.halfH;
    uniforms.uHalf.value.set(l.halfW, l.halfH);
    uniforms.uObs.value.set(
      l.portrait ? l.halfW * 0.3 : l.halfW * 0.62,
      l.halfH * (l.portrait ? 0.15 : 0.3),
      0
    );
    const px = (renderer.domElement.height / (2 * l.halfH)) * (l.portrait ? 0.26 : 0.34);
    slots.forEach((s) => {
      const at = l.portrait ? s.slot.tall : s.slot.wide;
      s.group.userData.home = [at[0] * l.halfW, at[1] * l.halfH];
      s.group.scale.setScalar(l.portrait ? 0.34 : 0.44);
      s.px.value = px;
    });
  });

  stage.onFrame((t) => {
    shared.uTime.value = t;
    shared.uS.value = state.s;
    reading.normal.set(-normal.x, -normal.y, 0);
    reading.constant = state.s;
    // each constellation drifts a little about its place and turns very slowly
    slots.forEach((s) => {
      const home = s.group.userData.home as [number, number] | undefined;
      if (!home) return;
      s.group.position.set(
        home[0] + Math.sin(t * 0.11 + s.seed) * 0.12,
        home[1] + Math.cos(t * 0.09 + s.seed * 2) * 0.08,
        0.1
      );
      s.group.rotation.z = Math.sin(t * 0.07 + s.seed) * 0.14;
    });
  });

  let dragging = false;
  const lean = (side: Side | null) =>
    gsap.to(state, {
      s: side === null ? 0 : (side === 0 ? 0.05 : -0.05) * state.range,
      duration: 1.1,
      ease: "elastic.out(1, 0.7)",
      overwrite: true,
    });

  return {
    hover(side) {
      book.lively(side === 0);
      gsap.to(shared.uSurge, {
        value: side === 1 ? 1 : 0,
        duration: 0.8,
        ease: "power2.out",
        overwrite: true,
      });
      if (side === 1 && !stage.still) shoot();
      if (!dragging) lean(side);
    },
    drag(at) {
      if (at) {
        dragging = true;
        gsap.killTweensOf(state);
        state.s = Math.max(-state.range, Math.min(state.range, normal.x * at.x + normal.y * at.y));
        return null;
      }
      dragging = false;
      const frac = state.s / state.range;
      if (frac > 0.42) return 0;
      if (frac < -0.42) return 1;
      lean(null);
      return null;
    },
    choose(side, done) {
      const { halfW, halfH, portrait } = stage.layout;
      // the iris opens from the heart of the chosen half
      const focus =
        side === 0
          ? stage.stations[0].position
          : new THREE.Vector3(portrait ? 0 : halfW * 0.5, portrait ? -halfH * 0.4 : 0, 0);
      uniforms.uFocus.value.set(focus.x, focus.y);
      const tl = gsap
        .timeline({ onComplete: done })
        .to(
          state,
          {
            s: (side === 0 ? 1 : -1) * state.range * 1.25,
            duration: 0.9,
            ease: "power3.inOut",
            overwrite: true,
          },
          0
        )
        .to(
          stage.camera.position,
          { z: stage.camera.position.z * 0.9, duration: 1.7, ease: "power2.inOut" },
          0
        )
        .to(uniforms.uOpen, { value: 1, duration: 1.0, ease: "power2.inOut" }, 0.75);
      if (side === 0) tl.add(book.leave(halfH * 2.6), 0);
      else {
        // the vectors brighten and the figures swell towards you as the night opens
        tl.to(shared.uSurge, { value: 2.2, duration: 0.5 }, 0)
          .to(
            slots.map((s) => s.group.scale),
            { x: "*=1.3", y: "*=1.3", duration: 1.3, ease: "power2.in" },
            0.4
          )
          .to(shared.uFade, { value: 0, duration: 0.6, ease: "power2.in" }, 1.05);
      }
    },
  };
}
