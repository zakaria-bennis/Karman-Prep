"use client";
// The singularity (founder, 2026-11-19: "a singularity animation that explodes into the final card";
// then "faster, and actually suck the screen into the singularity before popping out"). Finish is
// pressed on the last question, and in a little over a second:
//   0.00  a black hole opens in the middle, a ring of light round it; the room darkens
//   0.08  the screen itself is sucked in: the quiz, as a picture, is wound round the hole and
//         stretched into it, hotter and faster the nearer it gets, with dust spiralling in
//   0.93  the hole swallows the last of it and closes to a single bright point; the sound stops dead
//   1.15  it explodes: a flash, a shock ring racing out to the edges, sparks flung out, and the
//         ending comes out of the point (unfold.ts)
// The sound is singularitySound.ts, timed to this.
import gsap from "gsap";
import { drawCard, FRAG, stageOn, VERT, type Run } from "./introKit";
import { BOOM, playSingularity } from "./singularitySound";

const PLANE_VERT = `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// the screen, wound in: each point on the screen shows what was further out and further round, by
// more as the pull grows and most of all near the hole, so the picture spirals in and is swallowed
const WARP_FRAG = `
uniform sampler2D uTex;
uniform vec2 uSize;
uniform float uPull;
uniform float uR;
uniform float uShow;
varying vec2 vP;
vec4 at(float r, float a) {
  vec2 uv = vec2(cos(a), sin(a)) * r / uSize + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uTex, uv);
}
void main() {
  float r = length(vP);
  float a = atan(vP.y, vP.x);
  float k = uPull;
  float near = (uR * 2.0) / (r + uR * 0.6);
  float rs = r * exp(k * 3.4) + k * k * uSize.x * 0.7 * near;
  float as = a + k * (1.4 + 6.0 * near);
  vec4 c = at(rs, as);
  // light split at the edges as it is stretched
  float split = 1.0 + 0.05 * k;
  c.r = at(rs * split, as).r;
  c.b = at(rs / split, as).b;
  // hotter near the hole
  float heat = k * smoothstep(uR * 5.0, uR * 1.1, r);
  c.rgb = mix(c.rgb, vec3(1.0, 0.78, 0.45), heat * 0.75);
  c.a *= uShow * smoothstep(uR * 0.95, uR * 1.2, r);
  gl_FragColor = c;
}`;

// the black hole: its shadow, a thin bright ring at its edge, the far side of its disk bent up over
// the top by its pull, and its glow (the disk's near side is drawn on its own, over the shadow)
const DISK = `
uniform float uR;
uniform float uTime;
uniform float uGlow;
varying vec2 vP;
vec3 disk(vec2 p, out float band) {
  vec2 q = vec2(p.x, p.y / 0.27);
  float rd = length(q);
  float ang = atan(q.y, q.x);
  float inner = 1.45 * uR;
  float outer = 3.8 * uR;
  band = smoothstep(inner * 0.92, inner * 1.05, rd) * (1.0 - smoothstep(outer * 0.55, outer, rd));
  float streak = 0.55 + 0.45 * sin(ang * 9.0 - uTime * 12.0 + rd * 0.09) * sin(ang * 4.0 + uTime * 5.0);
  float doppler = 0.45 + 0.55 * (0.5 - 0.5 * q.x / max(rd, 1.0));
  vec3 col = mix(vec3(1.0, 0.55, 0.16), vec3(1.0, 0.96, 0.86), smoothstep(outer, inner, rd));
  band *= streak * doppler * uGlow;
  return col;
}
vec4 glow(vec3 light) {
  light = min(light, vec3(1.0));
  return vec4(light, max(light.r, max(light.g, light.b)));
}`;
const BACK_FRAG = `
${DISK}
void main() {
  float r = length(vP);
  float band;
  vec3 col = disk(vP, band);
  float shadow = 1.0 - smoothstep(uR * 0.96, uR * 1.0, r);
  vec3 light = col * band * step(0.0, vP.y) * (1.0 - shadow);
  float lens = exp(-pow((r - 1.28 * uR) / (0.2 * uR), 2.0)) * (0.35 + 0.65 * smoothstep(-0.3 * uR, 0.8 * uR, vP.y));
  light += vec3(1.0, 0.76, 0.5) * lens * uGlow * 1.1;
  light += vec3(1.0, 0.97, 0.9) * exp(-pow((r - 1.03 * uR) / (0.045 * uR), 2.0)) * (0.4 + uGlow);
  light += vec3(1.0, 0.7, 0.35) * exp(-r / (2.2 * uR)) * 0.28 * uGlow * (1.0 - shadow);
  // nothing reaches the edge of the square it is drawn on
  light *= 1.0 - smoothstep(3.6 * uR, 4.9 * uR, r);
  gl_FragColor = glow(light);
}`;
const SHADOW_FRAG = `
uniform float uR;
varying vec2 vP;
void main() {
  float shadow = 1.0 - smoothstep(uR * 0.96, uR * 1.0, length(vP));
  gl_FragColor = vec4(0.0, 0.0, 0.02, shadow);
}`;
const FRONT_FRAG = `
${DISK}
void main() {
  float band;
  vec3 col = disk(vP, band);
  gl_FragColor = glow(col * band * step(vP.y, 0.0));
}`;
// the shock ring: three rings, red, green and blue a little apart, like light split by glass
const RING_FRAG = `
uniform float uRad;
uniform float uWidth;
uniform float uAlpha;
varying vec2 vP;
void main() {
  float r = length(vP);
  float w = uWidth;
  float cr = exp(-pow((r - uRad * 1.03) / w, 2.0));
  float cg = exp(-pow((r - uRad) / w, 2.0));
  float cb = exp(-pow((r - uRad * 0.97) / w, 2.0));
  vec3 c = vec3(cr, cg * 0.95, cb) * 0.9 + vec3(1.0, 0.9, 0.7) * exp(-pow((r - uRad) / (w * 0.35), 2.0)) * 0.8;
  c = min(c * uAlpha, vec3(1.0));
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;

/** The colors the sparks fly out in: gold, white, amber, and the portal's teal and sky. */
const SPARKS = [
  [1, 0.84, 0.36],
  [1, 0.97, 0.9],
  [1, 0.6, 0.22],
  [0.45, 0.92, 0.78],
  [0.56, 0.86, 1],
];

// the pull's times, in seconds from Finish
const OPEN = 0.22;
const PULL_FROM = 0.08;
const PULL_FOR = 0.85;
const CLOSE = PULL_FROM + PULL_FOR;

export const singularity: Run = ({ card, canvas, flash, veil, onLanded, onGone }) => {
  let stop = false;
  let frame = 0;
  let cleanup = () => {};
  const tweens: gsap.core.Animation[] = [];
  void (async () => {
    const stage = await stageOn(canvas);
    if (stop) return;
    if (!stage) {
      onLanded();
      onGone();
      return;
    }
    const { THREE, renderer, scene, camera, W, H, dpr } = stage;
    const phone = W < 600;
    const RH = Math.max(30, Math.min(56, Math.min(W, H) * 0.065));
    const far = Math.hypot(W, H) / 2;
    // light added as it is, its alpha its brightness, so the canvas stays clear where it is dark
    const glow = {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    } as const;

    // the screen as a picture, to be wound into the hole
    const picture = drawCard(card, dpr, true);
    const texture = new THREE.CanvasTexture(picture);
    texture.colorSpace = THREE.SRGBColorSpace;
    const uniforms = {
      uTex: { value: texture },
      uSize: { value: new THREE.Vector2(W, H) },
      uPull: { value: 0 },
      uR: { value: 0.0001 },
      uShow: { value: 0 },
      uTime: { value: 0 },
      uGlow: { value: 0 },
    };
    const sheet = new THREE.PlaneGeometry(W, H);
    const make = (frag: string, blend: object, order: number, geo = sheet) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: PLANE_VERT,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        ...blend,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = order;
      scene.add(mesh);
      return mat;
    };
    const warpMat = make(WARP_FRAG, { blending: THREE.NormalBlending }, 0);
    const quad = new THREE.PlaneGeometry(RH * 10, RH * 10);
    const backMat = make(BACK_FRAG, glow, 1, quad);
    const shadowMat = make(SHADOW_FRAG, { blending: THREE.NormalBlending }, 2, quad);

    // dust torn off the screen, spiralling in
    const pixels = picture.getContext("2d")?.getImageData(0, 0, picture.width, picture.height).data;
    const N = phone ? 900 : 1600;
    const dust = Array.from({ length: N }, () => {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const i = (Math.round(y * dpr) * picture.width + Math.round(x * dpr)) * 4;
      const px = x - W / 2;
      const py = H / 2 - y;
      return {
        r0: Math.hypot(px, py),
        a0: Math.atan2(py, px),
        from: PULL_FROM + Math.random() * PULL_FOR * 0.6,
        dur: 0.3 + Math.random() * 0.35,
        c: pixels
          ? [
              0.55 + 0.45 * (pixels[i] / 255),
              0.5 + 0.4 * (pixels[i + 1] / 255),
              0.35 + 0.35 * (pixels[i + 2] / 255),
            ]
          : [1, 0.9, 0.7],
        spin: 2 + Math.random() * 3,
      };
    });
    const points = (n: number) => {
      const geo = new THREE.BufferGeometry();
      const arrays = {
        position: new Float32Array(n * 3),
        color: new Float32Array(n * 3),
        alpha: new Float32Array(n),
        size: new Float32Array(n),
      };
      geo.setAttribute("position", new THREE.BufferAttribute(arrays.position, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(arrays.color, 3));
      geo.setAttribute("alpha", new THREE.BufferAttribute(arrays.alpha, 1));
      geo.setAttribute("size", new THREE.BufferAttribute(arrays.size, 1));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const obj = new THREE.Points(geo, mat);
      return { geo, mat, obj, ...arrays };
    };
    const dustPts = points(N);
    dustPts.obj.renderOrder = 3;
    scene.add(dustPts.obj);
    const frontMat = make(FRONT_FRAG, glow, 4, quad);

    // the point it closes to, the shock ring, the sparks
    const point = points(1);
    point.obj.renderOrder = 5;
    point.color.set([1, 0.97, 0.9]);
    scene.add(point.obj);
    const ringU = { uRad: { value: 0 }, uWidth: { value: 20 }, uAlpha: { value: 0 } };
    const ringQuad = new THREE.PlaneGeometry(far * 2.6, far * 2.6);
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: RING_FRAG,
      uniforms: ringU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      ...glow,
    });
    const ringMesh = new THREE.Mesh(ringQuad, ringMat);
    ringMesh.renderOrder = 6;
    scene.add(ringMesh);
    const M = phone ? 1100 : 2000;
    const sparkPts = points(M);
    sparkPts.obj.renderOrder = 7;
    scene.add(sparkPts.obj);
    const sparks = Array.from({ length: M }, () => {
      const a = Math.random() * Math.PI * 2;
      const fast = Math.random() < 0.18;
      const v =
        (fast ? 1500 + Math.random() * 1500 : 300 + Math.random() * 1000) * (phone ? 0.6 : 1);
      return {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.8 + Math.random() * 1.0,
        c: SPARKS[Math.floor(Math.random() * SPARKS.length)],
        s: (fast ? 3 : 4 + Math.random() * 5) * dpr,
        tw: 5 + Math.random() * 10,
      };
    });

    const hole = (t: number) => {
      if (t < CLOSE) return RH * Math.min(1, Math.pow(Math.max(0, t) / OPEN, 0.6));
      const k = Math.min(1, (t - CLOSE) / (BOOM - 0.1 - CLOSE));
      return RH * Math.max(0.0001, 1 - Math.pow(k, 2));
    };
    const pull = (t: number) => Math.pow(Math.max(0, Math.min(1, (t - PULL_FROM) / PULL_FOR)), 2.2);

    // every shader built now, so the first frames do not stall
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    playSingularity();
    // the clock moves at most a frame at a time: a slow frame slows it, never skips the pull
    let t = 0;
    let last = performance.now();
    let handed = false;
    const tick = (now: number) => {
      if (stop) return;
      t += Math.min(1 / 30, (now - last) / 1000);
      last = now;
      uniforms.uTime.value = t;
      uniforms.uR.value = hole(t);
      uniforms.uPull.value = pull(t);
      uniforms.uGlow.value =
        t < CLOSE ? Math.min(1.6, 0.7 + t * 1.6) : Math.max(0, 1.6 * (1 - (t - CLOSE) / 0.2));
      // the real screen hands over to its picture in the first moments, while the pull is slight
      const swap = Math.min(1, Math.max(0, (t - 0.04) / 0.1));
      uniforms.uShow.value = t < BOOM ? swap : 0;
      card.style.opacity = String(1 - swap);
      // the room darkens as the light is drawn in, and clears when it explodes
      if (veil)
        veil.style.opacity = String(
          t < BOOM ? 1 - Math.pow(1 - Math.min(1, t / 0.8), 2) : Math.max(0, 1 - (t - BOOM) / 0.7)
        );

      const base = (phone ? 3.4 : 4) * dpr;
      for (let i = 0; i < N; i++) {
        const d = dust[i];
        const k = Math.max(0, Math.min(1, (t - d.from) / d.dur));
        const fall = k * k * k;
        const r = d.r0 * (1 - fall);
        const a = d.a0 + fall * d.spin;
        dustPts.position[i * 3] = Math.cos(a) * r;
        dustPts.position[i * 3 + 1] = Math.sin(a) * r * (1 - fall * 0.6);
        dustPts.color.set(
          [
            d.c[0] + (1 - d.c[0]) * fall,
            d.c[1] + (0.72 - d.c[1]) * fall,
            d.c[2] + (0.32 - d.c[2]) * fall,
          ],
          i * 3
        );
        const swallowed = r < uniforms.uR.value * 1.05;
        dustPts.alpha[i] = k > 0 && !swallowed && t < BOOM ? Math.min(1, k * 5) : 0;
        dustPts.size[i] = base * (0.8 + fall);
      }
      dustPts.geo.attributes.position.needsUpdate = true;
      dustPts.geo.attributes.color.needsUpdate = true;
      dustPts.geo.attributes.alpha.needsUpdate = true;
      dustPts.geo.attributes.size.needsUpdate = true;

      // the point: it shows as the hole closes, beats once, and bursts
      const pk = Math.max(0, Math.min(1, (t - CLOSE) / 0.12));
      const beat =
        t > BOOM - 0.12 && t < BOOM
          ? 1 + 0.7 * Math.sin(((t - (BOOM - 0.12)) / 0.12) * Math.PI)
          : 1;
      point.alpha[0] = t < BOOM ? pk : Math.max(0, 1 - (t - BOOM) / 0.12);
      point.size[0] = (8 + 26 * pk) * beat * dpr * (t < BOOM ? 1 : 1 + (t - BOOM) * 40);
      point.geo.attributes.alpha.needsUpdate = true;
      point.geo.attributes.size.needsUpdate = true;

      const e = t - BOOM;
      if (e >= 0) {
        if (!handed) {
          handed = true;
          card.style.visibility = "hidden";
          onLanded();
          if (flash)
            tweens.push(
              gsap.fromTo(
                flash,
                { opacity: 1, scale: 0.15 },
                { opacity: 0, scale: 1.3, duration: 0.6, ease: "expo.out" }
              )
            );
        }
        const k = 1 - Math.pow(1 - Math.min(1, e / 0.8), 3);
        ringU.uRad.value = k * far * 1.25;
        ringU.uWidth.value = (phone ? 10 : 16) + k * (phone ? 40 : 70);
        ringU.uAlpha.value = Math.max(0, 1 - e / 0.75);
        for (let i = 0; i < M; i++) {
          const sp = sparks[i];
          const drag = (1 - Math.exp(-3 * e)) / 3;
          sparkPts.position[i * 3] = sp.vx * drag;
          sparkPts.position[i * 3 + 1] = sp.vy * drag - 60 * e * e;
          sparkPts.color.set(sp.c, i * 3);
          const life = Math.max(0, 1 - e / sp.life);
          sparkPts.alpha[i] = life * (0.7 + 0.3 * Math.sin(e * sp.tw + i));
          sparkPts.size[i] = sp.s * (0.6 + 0.4 * life);
        }
        sparkPts.geo.attributes.position.needsUpdate = true;
        sparkPts.geo.attributes.color.needsUpdate = true;
        sparkPts.geo.attributes.alpha.needsUpdate = true;
        sparkPts.geo.attributes.size.needsUpdate = true;
      }
      renderer.render(scene, camera);
      if (e < 1.9) frame = requestAnimationFrame(tick);
      else onGone();
    };
    frame = requestAnimationFrame(tick);
    cleanup = () => {
      tweens.forEach((tw) => tw.kill());
      [dustPts, point, sparkPts].forEach((p) => {
        p.geo.dispose();
        p.mat.dispose();
      });
      [warpMat, backMat, shadowMat, frontMat, ringMat].forEach((m) => m.dispose());
      sheet.dispose();
      quad.dispose();
      ringQuad.dispose();
      texture.dispose();
      renderer.dispose();
    };
  })();
  return () => {
    stop = true;
    cancelAnimationFrame(frame);
    cleanup();
  };
};
