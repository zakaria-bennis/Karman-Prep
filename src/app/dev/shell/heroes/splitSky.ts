// Hero 4, the split sky. One sky cut on a slant: dusk on the Reading and Writing side, with a lit lantern
// and loose pages drifting up; night on the Math side, with stars joined into figures that draw
// themselves. The seam glows. Hovering a side leans the seam; dragging moves it; choosing a side sweeps
// that sky across the whole stage. The pages and the figures fill the whole stage and are cut by the same
// seam, so moving it uncovers more of one world and hides the other.
import { gsap } from "gsap";
import * as THREE from "three";
import type { Hero, Stage } from "./stage";

const SKY = /* glsl */ `
  uniform float uS; uniform vec2 uN; uniform float uTime; uniform vec2 uLamp;
  varying vec2 vP; varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float d = dot(uN, vP) - uS;
    float night = smoothstep(-0.012, 0.012, d);
    // dusk: peach at the foot, mauve overhead, and the lantern's warm pool
    vec3 dusk = mix(vec3(0.99, 0.80, 0.60), vec3(0.56, 0.47, 0.70), smoothstep(0.0, 1.0, vUv.y));
    dusk += vec3(1.0, 0.70, 0.32) * exp(-length(vP - uLamp) * 1.25) * 0.75;
    // night: indigo, with small stars that twinkle
    vec3 dark = mix(vec3(0.20, 0.20, 0.44), vec3(0.05, 0.06, 0.19), smoothstep(0.0, 1.0, vUv.y));
    vec2 g = vP * 9.0; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float h = hash(id);
    vec2 off = (vec2(hash(id + 1.3), hash(id + 2.7)) - 0.5) * 0.7;
    float star = step(0.72, h) * smoothstep(0.07, 0.0, length(f - off)) * (0.55 + 0.45 * sin(uTime * 2.2 + h * 50.0));
    dark += vec3(1.0, 0.95, 0.82) * star;
    // far hills along the foot of both skies, so it reads as one land under two lights
    float r1 = 0.215 + 0.05 * sin(vP.x * 0.9 + 0.5) + 0.025 * sin(vP.x * 2.3 + 1.7);
    float r2 = 0.125 + 0.04 * sin(vP.x * 1.4 + 2.1) + 0.02 * sin(vP.x * 3.7);
    float h1 = smoothstep(r1 + 0.004, r1 - 0.004, vUv.y);
    float h2 = smoothstep(r2 + 0.004, r2 - 0.004, vUv.y);
    dusk = mix(dusk, vec3(0.66, 0.46, 0.50), h1 * 0.85);
    dusk = mix(dusk, vec3(0.42, 0.28, 0.36), h2);
    dark = mix(dark, vec3(0.10, 0.11, 0.27), h1);
    dark = mix(dark, vec3(0.03, 0.04, 0.12), h2);
    vec3 col = mix(dusk, dark, night);
    col += vec3(1.0, 0.86, 0.62) * exp(-abs(d) * 22.0) * 0.85;   // the seam
    col += vec3(1.0, 0.92, 0.75) * exp(-abs(d) * 160.0) * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** A soft round dot for the stars. */
function dot(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,244,214,0.9)");
  grad.addColorStop(1, "rgba(255,244,214,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** The figures on the Math side: each is a path of points, drawn as a line with a star at each corner. */
const FIGURES: { at: [number, number]; pts: [number, number][]; corners: number }[] = [
  {
    at: [0.42, 0.42],
    pts: [
      [-0.5, -0.4],
      [0.55, -0.4],
      [0.1, 0.5],
      [-0.5, -0.4],
    ],
    corners: 1,
  },
  {
    at: [0.72, -0.35],
    pts: Array.from(
      { length: 25 },
      (_, i) =>
        [Math.cos((i / 24) * Math.PI * 2) * 0.45, Math.sin((i / 24) * Math.PI * 2) * 0.45] as [
          number,
          number,
        ]
    ),
    corners: 4,
  },
  {
    at: [0.12, -0.5],
    pts: Array.from(
      { length: 15 },
      (_, i) => [(i / 14 - 0.5) * 1.1, ((i / 14 - 0.5) * 2) ** 2 * 0.6 - 0.3] as [number, number]
    ),
    corners: 2,
  },
  {
    at: [-0.3, 0.5],
    pts: [
      [-0.4, -0.3],
      [0.4, -0.3],
      [0.4, 0.3],
      [-0.4, 0.3],
      [-0.4, -0.3],
      [0.4, 0.3],
    ],
    corners: 1,
  },
  {
    at: [-0.62, -0.3],
    pts: [
      [0.5, -0.3],
      [-0.4, -0.3],
      [0.25, 0.45],
    ],
    corners: 1,
  },
  {
    at: [-0.85, 0.1],
    pts: [
      [-0.25, -0.35],
      [0.0, 0.4],
      [0.25, -0.35],
      [-0.35, 0.12],
      [0.35, 0.12],
      [-0.25, -0.35],
    ],
    corners: 1,
  },
];

export function build(stage: Stage): Hero {
  const normal = new THREE.Vector2(1, 0);
  const state = { s: 0, range: 1 };
  const reading = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const math = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

  const uniforms = {
    uS: { value: 0 },
    uN: { value: normal },
    uTime: { value: 0 },
    uHalf: { value: new THREE.Vector2(1, 1) },
    uLamp: { value: new THREE.Vector2() },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      depthWrite: false,
      vertexShader: `uniform vec2 uHalf; varying vec2 vP; varying vec2 vUv;
        void main() { vUv = uv; vP = position.xy * uHalf; gl_Position = projectionMatrix * modelViewMatrix * vec4(vP, 0.0, 1.0); }`,
      fragmentShader: SKY,
    })
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  stage.scene.add(sky);

  // ---- the Reading and Writing side: a lantern, and pages on the air ----
  const lantern = new THREE.Group();
  const flame = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.13, 0.34, 6),
    new THREE.MeshStandardMaterial({
      color: 0xffe2a6,
      emissive: 0xffa53a,
      emissiveIntensity: 2.2,
      clippingPlanes: [reading],
    })
  );
  const frame = new THREE.MeshStandardMaterial({
    color: 0x5a3b2a,
    metalness: 0.6,
    roughness: 0.5,
    clippingPlanes: [reading],
  });
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 6), frame);
  cap.position.y = 0.25;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 6), frame);
  foot.position.y = -0.2;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 6, 6), frame);
  cord.position.y = 3.33;
  const lampLight = new THREE.PointLight(0xffb866, 14, 7);
  lantern.add(flame, cap, foot, cord, lampLight);
  lantern.position.z = 0.5;
  stage.scene.add(lantern);

  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xfff6e8,
    roughness: 0.8,
    side: THREE.DoubleSide,
    clippingPlanes: [reading],
  });
  const pageGeo = new THREE.PlaneGeometry(0.26, 0.36, 1, 1);
  const pages = Array.from({ length: 40 }, (_, i) => {
    const mesh = new THREE.Mesh(pageGeo, pageMat);
    stage.scene.add(mesh);
    return { mesh, a: (i * 0.618) % 1, b: (i * 0.371 + 0.2) % 1 };
  });

  // ---- the Math side: figures made of stars ----
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xfff0b8,
    transparent: true,
    opacity: 1,
    clippingPlanes: [math],
  });
  const starMat = new THREE.PointsMaterial({
    color: 0xfff6d6,
    size: 0.3,
    map: dot(),
    transparent: true,
    depthWrite: false,
    clippingPlanes: [math],
  });
  const figures = FIGURES.map((fig, i) => {
    const group = new THREE.Group();
    const pts = fig.pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, lineMat);
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(pts.filter((_, j) => j % fig.corners === 0)),
      starMat
    );
    // a line is one pixel wide in WebGL, so two more are laid a hair apart to make a bright stroke
    const thick = [0.012, -0.012].map((d) => {
      const copy = new THREE.Line(geo, lineMat);
      copy.position.set(d, d, 0);
      return copy;
    });
    group.add(line, ...thick, stars);
    group.position.z = 0.2;
    stage.scene.add(group);
    const drawn = { n: stage.still ? pts.length : 0 };
    if (!stage.still)
      gsap.to(drawn, {
        n: pts.length,
        duration: 2.2,
        ease: "power2.inOut",
        delay: 0.4 + i * 0.35,
        repeat: -1,
        yoyo: true,
        repeatDelay: 2.4,
      });
    return { group, geo, drawn, at: fig.at, spin: (i % 2 ? -1 : 1) * 0.05 };
  });

  stage.onLayout((l) => {
    // wide: the seam leans a little off upright; tall: it runs nearly level, with Reading and Writing on top
    if (l.portrait) normal.set(0.26, -0.966);
    else normal.set(0.954, 0.3);
    state.range = Math.abs(normal.x) * l.halfW + Math.abs(normal.y) * l.halfH;
    uniforms.uHalf.value.set(l.halfW, l.halfH);
    const lamp = l.portrait ? [-l.halfW * 0.45, l.halfH * 0.62] : [-l.halfW * 0.66, l.halfH * 0.3];
    uniforms.uLamp.value.set(lamp[0], lamp[1]);
    lantern.position.set(lamp[0], lamp[1], 0.5);
    figures.forEach((f) => f.group.position.set(f.at[0] * l.halfW, f.at[1] * l.halfH, 0.2));
  });

  stage.onFrame((t) => {
    uniforms.uTime.value = t;
    uniforms.uS.value = state.s;
    reading.normal.set(-normal.x, -normal.y, 0);
    reading.constant = state.s;
    math.normal.set(normal.x, normal.y, 0);
    math.constant = -state.s;
    const { halfW, halfH } = stage.layout;
    pages.forEach((p, i) => {
      const k = (t * 0.035 + p.a) % 1;
      p.mesh.position.set(
        (p.b * 2 - 1) * halfW * 1.05 + Math.sin(t * 0.6 + i) * 0.25,
        (k * 2 - 1) * halfH * 1.15,
        0.3 + p.b * 0.7
      );
      p.mesh.rotation.set(t * 0.5 + i, t * 0.35 + i * 2, Math.sin(t * 0.8 + i) * 0.5);
    });
    figures.forEach((f) => {
      f.geo.setDrawRange(0, Math.max(2, Math.round(f.drawn.n)));
      f.group.rotation.z = Math.sin(t * 0.3 + f.at[0] * 6) * 0.12 + t * f.spin;
    });
    lampLight.intensity = 14 + Math.sin(t * 7) * 1.2 + Math.sin(t * 13) * 0.6;
    lantern.rotation.z = Math.sin(t * 0.9) * 0.06;
  });

  let dragging = false;
  return {
    hover(side) {
      if (dragging) return;
      gsap.to(state, {
        s: side === null ? 0 : (side === 0 ? 0.3 : -0.3) * state.range,
        duration: 1,
        ease: "elastic.out(1, 0.7)",
        overwrite: true,
      });
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
      gsap.to(state, { s: 0, duration: 0.9, ease: "elastic.out(1, 0.6)" });
      return null;
    },
    choose(side, done) {
      gsap.to(state, {
        s: (side === 0 ? 1 : -1) * state.range * 1.2,
        duration: 0.9,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: done,
      });
    },
  };
}
