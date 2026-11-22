"use client";
// The light on Karman as his tails grow (TailsStage.tsx, foxLight.ts): a small three.js canvas laid
// over the drawing, in the drawing's own units, so a glow can sit exactly on a tail's tip. It holds
// two kinds of light, each drawn additively so it only ever brightens:
//   lights  glows held in place by their owner each frame (a tip's halo, a wisp of foxfire)
//   sparks  particles that fly, slow, fall and fade by themselves (bursts, dust, motes)
// The owner moves its lights in `onFrame`; the kit does the rest.

/** A glow held in place. Size is in the drawing's units; `flare` adds four thin rays. */
export type Light = {
  x: number;
  y: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  flare?: number;
};
/** A flying particle. Velocity in units a second; `drag` slows it, `fall` pulls it down. */
export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  r: number;
  g: number;
  b: number;
  life: number;
  age?: number;
  drag?: number;
  fall?: number;
  /** How fast it twinkles; 0 for steady. */
  tw?: number;
};
const POINT_VERT = `
attribute vec3 color;
attribute float alpha;
attribute float size;
attribute float flare;
varying vec3 vColor;
varying float vAlpha;
varying float vFlare;
void main() {
  vColor = color;
  vAlpha = alpha;
  vFlare = flare;
  gl_PointSize = size;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// a white-hot middle in its own color, a wide soft halo, and (when asked) four thin rays
const POINT_FRAG = `
varying vec3 vColor;
varying float vAlpha;
varying float vFlare;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  if (d > 1.0) discard;
  float halo = pow(1.0 - d, 2.2);
  float core = pow(max(0.0, 1.0 - d * 3.2), 3.0);
  float rays = vFlare * (exp(-abs(p.x) * 70.0) + exp(-abs(p.y) * 70.0)) * pow(1.0 - d, 1.4);
  vec3 c = min((vColor * (halo * 0.9 + rays) + vec3(1.0, 0.99, 0.95) * core) * vAlpha, vec3(1.0));
  // light only: its alpha is its brightness, so over the page it screens and never darkens
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;
export type Fx = {
  lights: Light[];
  sparks: Spark[];
  /** Adds a burst of sparks from (x, y). */
  burst: (o: {
    x: number;
    y: number;
    count: number;
    speed: number;
    colors: number[][];
    size?: number;
    life?: number;
    fall?: number;
    spread?: number;
    angle?: number;
  }) => void;
  /** Called every frame with the seconds since the last and since the start. */
  onFrame: (fn: (dt: number, t: number) => void) => void;
  /** The canvas's pixels for one unit of the drawing. */
  scale: number;
  stop: () => void;
};

/** A kit on `canvas`, laid over a drawing whose viewBox is `box` ([x, y, width, height]). Null
 *  where WebGL is not to be had. */
export async function stageFx(
  canvas: HTMLCanvasElement,
  box: [number, number, number, number],
  most = { lights: 64, sparks: 900 }
): Promise<Fx | null> {
  const THREE = await import("three");
  // its laid-out size, not its size on screen: it may be mid-way through a scale when it starts
  const css = { width: canvas.clientWidth, height: canvas.clientHeight };
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let renderer: import("three").WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(dpr);
  renderer.setSize(css.width, css.height, false);
  const [bx, by, bw, bh] = box;
  // the drawing's units, y down as in the SVG: the camera looks at it upside down in y
  const camera = new THREE.OrthographicCamera(bx, bx + bw, -by, -(by + bh), -10, 10);
  const scene = new THREE.Scene();
  const scale = (css.width / bw) * dpr;
  // light added as it is, so overlapping glows build up and nothing dark is ever laid down
  const light = {
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  } as const;

  const pointSet = (n: number) => {
    const geo = new THREE.BufferGeometry();
    const a = {
      position: new Float32Array(n * 3),
      color: new Float32Array(n * 3),
      alpha: new Float32Array(n),
      size: new Float32Array(n),
      flare: new Float32Array(n),
    };
    geo.setAttribute("position", new THREE.BufferAttribute(a.position, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(a.color, 3));
    geo.setAttribute("alpha", new THREE.BufferAttribute(a.alpha, 1));
    geo.setAttribute("size", new THREE.BufferAttribute(a.size, 1));
    geo.setAttribute("flare", new THREE.BufferAttribute(a.flare, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      ...light,
    });
    const obj = new THREE.Points(geo, mat);
    obj.frustumCulled = false;
    scene.add(obj);
    const flush = (count: number) => {
      geo.setDrawRange(0, count);
      for (const k of ["position", "color", "alpha", "size", "flare"])
        geo.attributes[k].needsUpdate = true;
    };
    return { geo, mat, ...a, flush };
  };

  const lightSet = pointSet(most.lights);
  const sparkSet = pointSet(most.sparks);

  const fx: Fx = {
    lights: [],
    sparks: [],
    scale,
    burst: ({ x, y, count, speed, colors, size = 3, life = 1, fall = 0, spread, angle = 0 }) => {
      for (let i = 0; i < count; i++) {
        const a =
          angle +
          (spread === undefined ? Math.random() * Math.PI * 2 : (Math.random() - 0.5) * spread);
        const v = speed * (0.3 + Math.random() * 0.9);
        const c = colors[Math.floor(Math.random() * colors.length)];
        fx.sparks.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          size: size * (0.5 + Math.random()),
          r: c[0],
          g: c[1],
          b: c[2],
          life: life * (0.5 + Math.random() * 0.8),
          drag: 2.2,
          fall,
          tw: 8 + Math.random() * 14,
        });
      }
      if (fx.sparks.length > most.sparks) fx.sparks.splice(0, fx.sparks.length - most.sparks);
    },
    onFrame: (fn) => frames.push(fn),
    stop: () => {
      stopped = true;
      cancelAnimationFrame(frame);
      [lightSet, sparkSet].forEach((s) => {
        s.geo.dispose();
        s.mat.dispose();
      });
      renderer.dispose();
    },
  };
  const frames: ((dt: number, t: number) => void)[] = [];
  let stopped = false;
  let frame = 0;
  let last = performance.now();
  let t = 0;
  renderer.compile(scene, camera);
  const tick = (now: number) => {
    if (stopped) return;
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    t += dt;
    frames.forEach((f) => f(dt, t));

    // lights, as their owner left them
    const L = Math.min(fx.lights.length, most.lights);
    for (let i = 0; i < L; i++) {
      const l = fx.lights[i];
      lightSet.position.set([l.x, -l.y, 0], i * 3);
      lightSet.color.set([l.r, l.g, l.b], i * 3);
      lightSet.alpha[i] = Math.max(0, Math.min(1, l.a));
      lightSet.size[i] = l.size * scale;
      lightSet.flare[i] = l.flare ?? 0;
    }
    lightSet.flush(L);

    // sparks fly by themselves
    let n = 0;
    for (const s of fx.sparks) {
      s.age = (s.age ?? 0) + dt;
      const k = Math.exp(-(s.drag ?? 0) * dt);
      s.vx *= k;
      s.vy = s.vy * k + (s.fall ?? 0) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const left = 1 - s.age / s.life;
      if (left <= 0 || n >= most.sparks) continue;
      sparkSet.position.set([s.x, -s.y, 0], n * 3);
      sparkSet.color.set([s.r, s.g, s.b], n * 3);
      const twinkle = s.tw ? 0.65 + 0.35 * Math.sin(s.age * s.tw + n) : 1;
      sparkSet.alpha[n] = Math.min(1, left * 1.6) * twinkle;
      sparkSet.size[n] = s.size * scale * (0.5 + 0.5 * left);
      sparkSet.flare[n] = 0;
      n++;
    }
    fx.sparks = fx.sparks.filter((s) => (s.age ?? 0) < s.life);
    sparkSet.flush(n);

    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return fx;
}

/** Colors, 0 to 1, for the lights. */
export const GOLD = [1, 0.8, 0.32];
export const WARM = [1, 0.93, 0.78];
export const FOXFIRE = [0.45, 0.72, 1];
export const ICE = [0.82, 0.92, 1];
export const WHITE = [1, 1, 1];
