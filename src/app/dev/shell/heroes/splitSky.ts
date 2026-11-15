// The Library's hero: one sky cut in two on a slight slant, an even half each.
//   Reading and Writing: golden hour, drifting cloud, a lantern, and the open book (book.ts).
//   Math: a real night. A Milky Way with its dust lanes, thousands of stars in three depths that twinkle
//   and wheel slowly about a pole, a breathing nebula, the odd shooting star, and constellations made of
//   straight vectors from star to star. Each vector glows, carries a pulse of light along its length,
//   and is drawn star by star; each star has a core, a halo and four thin rays that shimmer.
// The seam glows. Hovering a half leans it a little; dragging moves it; choosing a half sweeps that sky
// across the whole stage, then the sky itself opens like an iris onto the Library's own background.
import { gsap } from "gsap";
import * as THREE from "three";
import { buildBook } from "./book";
import type { Hero, Side, Stage } from "./stage";

const SKY = /* glsl */ `
  precision highp float;
  uniform float uS, uTime, uOpen, uSurge;
  uniform vec2 uN, uLamp, uHalf, uFocus;
  uniform vec4 uShoot;   // where it starts (xy), how far along it is (z), how bright (w)
  varying vec2 vP; varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

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
    c += vec3(1.0, 0.70, 0.32) * exp(-length(p - uLamp) * 1.2) * 0.55;   // the lantern's pool
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

  void main() {
    float d = dot(uN, vP) - uS;
    float y = vUv.y;
    vec3 a = dusk(vP, y);
    vec3 b = night(vP, y);
    // hills along the foot of both skies: one land under two lights
    float r1 = 0.215 + 0.05 * sin(vP.x * 0.9 + 0.5) + 0.025 * sin(vP.x * 2.3 + 1.7) + 0.006 * noise(vec2(vP.x * 14.0, 1.0));
    float r2 = 0.125 + 0.04 * sin(vP.x * 1.4 + 2.1) + 0.02 * sin(vP.x * 3.7) + 0.008 * noise(vec2(vP.x * 22.0, 4.0));
    float h1 = smoothstep(r1 + 0.004, r1 - 0.004, y);
    float h2 = smoothstep(r2 + 0.004, r2 - 0.004, y);
    a = mix(a, vec3(0.66, 0.45, 0.50), h1 * 0.85); a = mix(a, vec3(0.40, 0.26, 0.35), h2);
    b = mix(b, vec3(0.07, 0.09, 0.24), h1);        b = mix(b, vec3(0.02, 0.03, 0.10), h2);
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

/* a vector between two stars: a ribbon with a bright core, a soft halo and light running along it */
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
  uniform float uDraw, uCount, uTime, uSurge, uFade, uS; uniform vec2 uN;
  varying float vAlong; varying float vAcross; varying float vOrder; varying float vLen; varying vec2 vWorld;
  void main() {
    if (dot(uN, vWorld) - uS < 0.0) discard;                 // the seam cuts it
    float t = clamp(uDraw * uCount - vOrder, 0.0, 1.0);        // how much of this vector is drawn
    if (vAlong > t) discard;
    float core = exp(-vAcross * vAcross * 46.0);
    float halo = exp(-abs(vAcross) * 4.2) * 0.34;
    float run = 0.5 + 0.5 * sin(vAlong * vLen * 5.0 - uTime * (2.4 + uSurge * 5.0));   // light moving along it
    float tip = exp(-abs(vAlong - t) * vLen * 9.0) * step(t, 0.999) * (core + halo);                    // the bright end while it is drawn
    float end = smoothstep(0.0, 0.04, vAlong) * smoothstep(1.0, 0.96, vAlong);
    vec3 col = mix(vec3(0.50, 0.72, 1.0), vec3(1.0, 0.95, 0.80), core);
    float a = (core * (0.6 + 0.4 * run) + halo * (0.45 + 0.55 * run)) * end * (1.0 + uSurge * 0.9) + tip * 1.6;
    gl_FragColor = vec4(col, a * uFade);
  }
`;
const STAR_VERT = /* glsl */ `
  attribute float aMag; attribute float aPhase; attribute float aLit;
  uniform float uPx;
  varying float vMag; varying float vPhase; varying float vLit; varying vec2 vWorld;
  void main() {
    vMag = aMag; vPhase = aPhase; vLit = aLit;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xy;
    gl_Position = projectionMatrix * viewMatrix * w;
    gl_PointSize = uPx * (0.5 + aMag * 0.5);
  }
`;
const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uDraw, uCount, uTime, uSurge, uFade, uS; uniform vec2 uN;
  varying float vMag; varying float vPhase; varying float vLit; varying vec2 vWorld;
  void main() {
    if (dot(uN, vWorld) - uS < 0.0) discard;
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float reach = uDraw * uCount - vLit;                       // has the drawing reached this star yet
    float lit = smoothstep(-0.15, 0.25, reach);
    float flare = exp(-abs(reach) * 2.6);                      // it flares as the vector arrives
    float tw = 0.7 + 0.3 * sin(uTime * (2.0 + vPhase * 2.0) + vPhase * 30.0);
    float core = exp(-r * r * 150.0);
    float halo = exp(-r * 10.0) * 0.5;
    // four thin rays that breathe, as a bright star has through a lens
    float rays = exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 6.5) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 6.5);
    vec3 col = mix(vec3(0.62, 0.80, 1.0), vec3(1.0, 0.95, 0.82), core + flare * 0.5);
    float a = (core * 1.7 + halo * tw + rays * (0.55 + 0.45 * tw)) * (0.25 + 0.75 * lit) * (1.0 + uSurge * 0.8) + flare * (core * 2.0 + halo * 1.5 + rays);
    a *= smoothstep(0.5, 0.3, r);                              // nothing reaches the corners of the point's square
    gl_FragColor = vec4(col, a * uFade);
  }
`;

/* The constellations: figures made only of straight vectors. `wide` and `tall` are where each one sits
   on a desktop and on a phone, as fractions of the stage from its centre. */
type P = [number, number];
const FIGURES: { name: string; pts: P[]; segs: P[]; wide: P; tall: P }[] = [
  {
    name: "sigma",
    pts: [
      [0.5, 0.6],
      [-0.5, 0.6],
      [0.05, 0],
      [-0.5, -0.6],
      [0.5, -0.6],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    wide: [0.3, 0.52],
    tall: [-0.5, -0.2],
  },
  {
    name: "right triangle",
    pts: [
      [-0.6, -0.45],
      [0.6, -0.45],
      [0.6, 0.55],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    wide: [0.76, 0.56],
    tall: [0.5, -0.16],
  },
  {
    name: "cube",
    pts: [
      [-0.5, -0.5],
      [0.3, -0.5],
      [0.3, 0.3],
      [-0.5, 0.3],
      [-0.15, -0.2],
      [0.65, -0.2],
      [0.65, 0.6],
      [-0.15, 0.6],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [4, 5],
      [5, 1],
      [5, 6],
      [6, 2],
      [6, 7],
      [7, 3],
      [7, 4],
    ],
    wide: [0.56, -0.02],
    tall: [0.02, -0.42],
  },
  {
    name: "w",
    pts: [
      [-0.8, 0.3],
      [-0.4, -0.3],
      [0, 0.2],
      [0.4, -0.35],
      [0.8, 0.3],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    wide: [0.82, -0.34],
    tall: [0.5, -0.56],
  },
  {
    name: "rising steps",
    pts: [
      [-0.8, -0.5],
      [-0.4, -0.5],
      [-0.4, -0.1],
      [0, -0.1],
      [0, 0.3],
      [0.4, 0.3],
      [0.8, 0.65],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    wide: [0.2, -0.16],
    tall: [-0.5, -0.5],
  },
  {
    name: "kite",
    pts: [
      [0, 0.7],
      [0.45, 0.1],
      [0, -0.7],
      [-0.45, 0.1],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 2],
      [1, 3],
    ],
    wide: [-0.42, 0.5],
    tall: [0.35, 0.6],
  },
  {
    name: "arrowhead",
    pts: [
      [-0.6, -0.4],
      [0.6, 0],
      [-0.6, 0.4],
      [-0.25, 0],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
    wide: [-0.72, -0.2],
    tall: [-0.4, 0.3],
  },
];
const WIDTH = 0.085;

export function build(stage: Stage): Hero {
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
    uLamp: { value: new THREE.Vector2() },
    uFocus: { value: new THREE.Vector2() },
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
  book.lantern.position.z = 0.6;
  scene.add(book.lantern);

  // ---- the Math half: constellations ----
  const figures = FIGURES.map((fig, f) => {
    const group = new THREE.Group();
    const count = fig.segs.length;
    const own = { uDraw: { value: stage.still ? 1 : 0 }, uCount: { value: count } };
    // each vector is a thin ribbon: four corners, squared off a little past each star
    const pos: number[] = [];
    const along: number[] = [];
    const across: number[] = [];
    const order: number[] = [];
    const len: number[] = [];
    const index: number[] = [];
    fig.segs.forEach(([i, j], k) => {
      const a = new THREE.Vector2(...fig.pts[i]);
      const b = new THREE.Vector2(...fig.pts[j]);
      const dir = b.clone().sub(a);
      const length = dir.length();
      dir.normalize();
      const n = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(WIDTH);
      [
        [a, 0, 1],
        [a, 0, -1],
        [b, 1, 1],
        [b, 1, -1],
      ].forEach(([p, al, ac]) => {
        const at = (p as THREE.Vector2).clone().addScaledVector(n, ac as number);
        pos.push(at.x, at.y, 0);
        along.push(al as number);
        across.push(ac as number);
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
    const glow = {
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    };
    const vectors = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: { ...shared, ...own },
        vertexShader: VECTOR_VERT,
        fragmentShader: VECTOR_FRAG,
        ...glow,
      })
    );
    // a star lights when the first vector to touch it gets there
    const lit = fig.pts.map((_, i) => {
      let at = Infinity;
      fig.segs.forEach(([a, b], k) => {
        if (a === i) at = Math.min(at, k);
        if (b === i) at = Math.min(at, k + 1);
      });
      return at;
    });
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        fig.pts.flatMap(([x, y]) => [x, y, 0]),
        3
      )
    );
    starGeo.setAttribute(
      "aMag",
      new THREE.Float32BufferAttribute(
        fig.pts.map((_, i) => 0.55 + (((i * 7 + f * 3) % 5) / 5) * 0.45),
        1
      )
    );
    starGeo.setAttribute(
      "aPhase",
      new THREE.Float32BufferAttribute(
        fig.pts.map((_, i) => (i * 0.37 + f * 0.21) % 1),
        1
      )
    );
    starGeo.setAttribute("aLit", new THREE.Float32BufferAttribute(lit, 1));
    const starUniforms = { ...shared, ...own, uPx: { value: 60 } };
    const stars = new THREE.Points(
      starGeo,
      new THREE.ShaderMaterial({
        uniforms: starUniforms,
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        ...glow,
      })
    );
    vectors.frustumCulled = stars.frustumCulled = false;
    vectors.renderOrder = -5;
    stars.renderOrder = -4;
    group.add(vectors, stars);
    scene.add(group);
    // drawn star by star, held, then drawn back and begun again
    if (!stage.still)
      gsap.to(own.uDraw, {
        value: 1,
        duration: 0.55 * count,
        ease: "none",
        delay: 0.5 + f * 0.55,
        repeat: -1,
        yoyo: true,
        repeatDelay: 7 + f * 0.9,
      });
    return { group, fig, px: starUniforms.uPx };
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
      gsap.delayedCall(5 + Math.random() * 6, again);
    };
    gsap.delayedCall(3, again);
  }

  stage.onLayout((l) => {
    // wide: the seam stands nearly upright with a slight lean; tall: it runs nearly level with a slight
    // slope and Reading and Writing on top. Either way it passes through the centre: an even half each.
    if (l.portrait) normal.set(0.26, -0.966);
    else normal.set(0.987, 0.159);
    state.range = Math.abs(normal.x) * l.halfW + Math.abs(normal.y) * l.halfH;
    uniforms.uHalf.value.set(l.halfW, l.halfH);
    const lamp = l.portrait ? [-l.halfW * 0.58, l.halfH * 0.74] : [-l.halfW * 0.84, l.halfH * 0.36];
    uniforms.uLamp.value.set(lamp[0], lamp[1]);
    book.lantern.position.set(lamp[0], lamp[1], 0.6);
    const px = (renderer.domElement.height / (2 * l.halfH)) * (l.portrait ? 0.62 : 0.78);
    figures.forEach((f) => {
      const at = l.portrait ? f.fig.tall : f.fig.wide;
      f.group.position.set(at[0] * l.halfW, at[1] * l.halfH, 0.1);
      f.group.scale.setScalar(l.portrait ? 0.62 : 0.86);
      f.px.value = px;
    });
  });

  stage.onFrame((t) => {
    shared.uTime.value = t;
    shared.uS.value = state.s;
    reading.normal.set(-normal.x, -normal.y, 0);
    reading.constant = state.s;
  });

  let dragging = false;
  const lean = (side: Side | null) =>
    gsap.to(state, {
      s: side === null ? 0 : (side === 0 ? 0.1 : -0.1) * state.range,
      duration: 1.1,
      ease: "elastic.out(1, 0.7)",
      overwrite: true,
    });

  return {
    hover(side) {
      book.lively(side === 0);
      gsap.to(shared.uSurge, {
        value: side === 1 ? 1 : 0,
        duration: 0.6,
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
        // the vectors surge and the figures swell towards you as the night opens
        tl.to(shared.uSurge, { value: 1.6, duration: 0.5 }, 0)
          .to(
            figures.map((f) => f.group.scale),
            { x: "*=1.2", y: "*=1.2", duration: 1.3, ease: "power2.in" },
            0.4
          )
          .to(shared.uFade, { value: 0, duration: 0.6, ease: "power2.in" }, 1.05);
      }
    },
  };
}
