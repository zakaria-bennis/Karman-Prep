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

import { SKY, STAR_FRAG, STAR_VERT, VECTOR_FRAG, VECTOR_VERT } from "./splitSkyShaders";

type P = [number, number];
interface Shape {
  name: string;
  pts: P[];
  segs: P[];
}
/** A figure from its corners, joined in order (and back to the start when `closed`). */
const path = (name: string, pts: P[], closed = false): Shape => ({
  name,
  pts,
  segs: pts
    .map((_, i) => [i, (i + 1) % pts.length] as P)
    .slice(0, closed ? pts.length : pts.length - 1),
});
const ring = (n: number, r = 0.62, turn = 0): P[] =>
  Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return [Math.sin(a) * r, Math.cos(a) * r] as P;
  });
const BASE: Shape[] = [
  path(
    "isosceles triangle",
    [
      [-0.5, -0.45],
      [0.5, -0.45],
      [0, 0.65],
    ],
    true
  ),
  path(
    "parallelogram",
    [
      [-0.7, -0.36],
      [0.3, -0.36],
      [0.7, 0.36],
      [-0.3, 0.36],
    ],
    true
  ),
  path("sideways M", [
    [-0.4, 0.62],
    [0.42, 0.62],
    [-0.34, 0],
    [0.42, -0.62],
    [-0.4, -0.62],
  ]),
  path("sum sign", [
    [0.46, 0.42],
    [0.46, 0.62],
    [-0.46, 0.62],
    [0.08, 0],
    [-0.46, -0.62],
    [0.46, -0.62],
    [0.46, -0.42],
  ]),
  path("square root", [
    [-0.75, 0.05],
    [-0.5, 0.05],
    [-0.28, -0.6],
    [0.02, 0.6],
    [0.78, 0.6],
  ]),
  path("hexagon", ring(6), true),
  path("pentagon", ring(5), true),
  {
    name: "five-pointed star",
    pts: ring(5, 0.68),
    segs: [
      [0, 2],
      [2, 4],
      [4, 1],
      [1, 3],
      [3, 0],
    ],
  },
  {
    name: "pi",
    pts: [
      [-0.6, 0.5],
      [0.6, 0.5],
      [-0.25, 0.5],
      [-0.3, -0.6],
      [0.25, 0.5],
      [0.32, -0.6],
    ],
    segs: [
      [0, 1],
      [2, 3],
      [4, 5],
    ],
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
  },
  {
    name: "pyramid",
    pts: [
      [0, 0.7],
      [-0.6, -0.4],
      [0.2, -0.6],
      [0.65, -0.25],
    ],
    segs: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: "axes and a line",
    pts: [
      [-0.6, 0.6],
      [-0.6, -0.55],
      [0.7, -0.55],
      [-0.45, -0.4],
      [0.6, 0.5],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
  },
  {
    name: "right angle",
    pts: [
      [-0.6, -0.5],
      [0.6, -0.5],
      [-0.6, 0.6],
      [-0.6, -0.28],
      [-0.38, -0.28],
      [-0.38, -0.5],
    ],
    segs: [
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 4],
      [4, 5],
    ],
  },
  path("less than", [
    [0.5, 0.55],
    [-0.5, 0],
    [0.5, -0.55],
  ]),
  {
    name: "plus and minus",
    pts: [
      [-0.5, 0.25],
      [0.5, 0.25],
      [0, 0.65],
      [0, -0.15],
      [-0.5, -0.55],
      [0.5, -0.55],
    ],
    segs: [
      [0, 1],
      [2, 3],
      [4, 5],
    ],
  },
  path(
    "rhombus",
    [
      [0, 0.7],
      [0.45, 0],
      [0, -0.7],
      [-0.45, 0],
    ],
    true
  ),
];
/** More stars: every long vector is broken into shorter ones, each joint a star of its own. */
const SHAPES: Shape[] = BASE.map((shape) => {
  const pts = [...shape.pts];
  const segs: P[] = [];
  shape.segs.forEach(([a, b]) => {
    const [ax, ay] = shape.pts[a];
    const [bx, by] = shape.pts[b];
    const parts = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 0.42));
    let from = a;
    for (let k = 1; k < parts; k++) {
      pts.push([ax + ((bx - ax) * k) / parts, ay + ((by - ay) * k) / parts]);
      segs.push([from, pts.length - 1]);
      from = pts.length - 1;
    }
    segs.push([from, b]);
  });
  return { name: shape.name, pts, segs };
});
/* Where the constellations sit: all over the night, high and low, as fractions of the stage from its
   centre on a desktop (wide) and on a phone (tall). They are joined up in this order as more skills
   become Proficient. */
const SLOTS: { wide: P; tall: P }[] = [
  { wide: [0.5, 0.4], tall: [0.0, -0.3] },
  { wide: [0.22, 0.7], tall: [-0.6, -0.14] },
  { wide: [0.84, 0.72], tall: [0.62, -0.12] },
  { wide: [0.3, 0.1], tall: [-0.42, -0.46] },
  { wide: [0.78, 0.2], tall: [0.5, -0.4] },
  { wide: [0.56, 0.8], tall: [0.2, -0.56] },
  { wide: [0.12, 0.38], tall: [-0.75, -0.6] },
  { wide: [0.92, 0.44], tall: [0.78, -0.62] },
  { wide: [0.4, -0.2], tall: [-0.1, -0.7] },
  { wide: [0.66, -0.06], tall: [-0.8, -0.34] },
  { wide: [0.36, 0.56], tall: [0.34, -0.2] },
  { wide: [0.7, 0.52], tall: [-0.28, -0.2] },
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
    uFade: { value: stage.still ? 1 : 0 },
  };
  const uniforms = {
    ...shared,
    uOpen: { value: 0 },
    uHalf: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: new THREE.Vector2() },
    uObs: { value: new THREE.Vector3(0, 0.5, 0) },
    uShoot: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLine: { value: stage.still ? 1 : 0 },
    uReveal: { value: stage.still ? 1 : 0 },
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
  // the seam is drawn first, then the two skies open out from it, then the stars come up
  if (!stage.still)
    gsap
      .timeline()
      .to(uniforms.uLine, { value: 1, duration: 0.22, ease: "power2.out" })
      .to(uniforms.uReveal, { value: 1, duration: 0.6, ease: "power3.out" }, 0.12)
      .to(shared.uFade, { value: 1, duration: 0.45, ease: "power1.out" }, 0.35);
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
    let at = (i * 5 + 2) % SHAPES.length;
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
          .call(() => take((at += 3 + (i % 4))))
          .to({}, { duration: 0.6 });
      };
      gsap.delayedCall(0.6 + i * 0.7, cycle);
    }
    return { group, slot, px, seed: i * 1.7 };
  });

  const shoot = () => {
    const { halfW, halfH } = stage.layout;
    const v = uniforms.uShoot.value;
    // it starts at the far edge of the night and crosses it
    const base = stage.layout.portrait
      ? [halfW, -halfH * (0.1 + Math.random() * 0.45)]
      : [halfW, halfH * (0.2 + Math.random() * 0.7)];
    v.set(base[0], base[1], 0, 1);
    gsap.fromTo(
      v,
      { z: 0 },
      { z: 1, duration: 1.3, ease: "power1.inOut", onComplete: () => void (v.w = 0) }
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
      l.halfH * (l.portrait ? 0.17 : 0.34),
      0
    );
    const px = (renderer.domElement.height / (2 * l.halfH)) * (l.portrait ? 0.26 : 0.34);
    slots.forEach((s) => {
      const at = l.portrait ? s.slot.tall : s.slot.wide;
      s.group.userData.home = [at[0] * l.halfW, at[1] * l.halfH];
      s.group.scale.setScalar(l.portrait ? 0.3 : 0.4);
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
            duration: 0.65,
            ease: "power3.inOut",
            overwrite: true,
          },
          0
        )
        .to(
          stage.camera.position,
          { z: stage.camera.position.z * 0.94, duration: 1.2, ease: "power2.inOut" },
          0
        )
        .to(
          uniforms.uOpen,
          { value: 1, duration: 0.7, ease: "power2.inOut" },
          side === 0 ? 1.25 : 0.5
        );
      if (side === 0) tl.add(book.leave(stage.stations[0]), 0);
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
