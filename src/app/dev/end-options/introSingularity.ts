"use client";
// The singularity (founder, 2026-11-19: "a singularity animation that explodes into the final card
// with some really cool sound effects and graphics"). Finish is pressed on the last question, and:
//   0.0  the screen shudders; a black hole opens in the middle, a ring of light round it
//   0.3  the quiz is pulled in: its glass turns and shrinks into the hole, tearing into dust that
//        spirals in faster the closer it gets and lights up the disk round the hole
//   1.7  the hole swallows the last of it and closes to a single bright point; the sound stops dead
//   2.1  it explodes: a flash, a shock ring racing out to the edges, sparks flung out in the
//        ending's colors, and the ending bursts out of the point (unfold.ts)
// The sound is singularitySound.ts, timed to this.
import gsap from "gsap";
import { drawCard, FRAG, stageOn, VERT, type Run } from "./introKit";
import { BOOM, playSingularity } from "./singularitySound";

// the black hole: its shadow, a thin bright ring at its edge, the far side of its disk bent up over
// the top by its pull, and its glow (the disk's near side is drawn on its own, over the shadow)
const HOLE_VERT = `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
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
  float streak = 0.55 + 0.45 * sin(ang * 9.0 - uTime * 7.0 + rd * 0.09) * sin(ang * 4.0 + uTime * 3.0);
  float doppler = 0.45 + 0.55 * (0.5 - 0.5 * q.x / max(rd, 1.0));
  vec3 hot = vec3(1.0, 0.96, 0.86);
  vec3 warm = vec3(1.0, 0.55, 0.16);
  vec3 col = mix(warm, hot, smoothstep(outer, inner, rd));
  band *= streak * doppler * uGlow;
  return col;
}`;
const BACK_FRAG = `
${DISK}
void main() {
  float r = length(vP);
  float band;
  vec3 col = disk(vP, band);
  // the far half of the disk, hidden where the shadow is
  float far = step(0.0, vP.y);
  float shadow = 1.0 - smoothstep(uR * 0.96, uR * 1.0, r);
  vec3 light = col * band * far * (1.0 - shadow);
  // the far side bent up over the top: a ring hugging the shadow, brightest above it
  float lens = exp(-pow((r - 1.28 * uR) / (0.2 * uR), 2.0)) * (0.35 + 0.65 * smoothstep(-0.3 * uR, 0.8 * uR, vP.y));
  light += mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.92, 0.8), 0.5) * lens * uGlow * 1.1;
  // the photon ring right at the edge
  light += vec3(1.0, 0.97, 0.9) * exp(-pow((r - 1.03 * uR) / (0.045 * uR), 2.0)) * (0.4 + uGlow);
  // the glow round it all
  light += vec3(1.0, 0.7, 0.35) * exp(-r / (2.2 * uR)) * 0.28 * uGlow * (1.0 - shadow);
  light = min(light, vec3(1.0));
  gl_FragColor = vec4(light, max(light.r, max(light.g, light.b)));
}`;
const SHADOW_FRAG = `
uniform float uR;
varying vec2 vP;
void main() {
  float r = length(vP);
  float shadow = 1.0 - smoothstep(uR * 0.96, uR * 1.0, r);
  gl_FragColor = vec4(0.0, 0.0, 0.02, shadow);
}`;
const FRONT_FRAG = `
${DISK}
void main() {
  float band;
  vec3 col = disk(vP, band);
  vec3 light = min(col * band * step(vP.y, 0.0), vec3(1.0));
  gl_FragColor = vec4(light, max(light.r, max(light.g, light.b)));
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
  vec3 light = min(c * uAlpha, vec3(1.0));
  gl_FragColor = vec4(light, max(light.r, max(light.g, light.b)));
}`;

/** The colors the sparks fly out in: the ending's own, gold, white, and the portal's teal. */
const SPARKS = [
  [1, 0.84, 0.36],
  [1, 0.97, 0.9],
  [1, 0.6, 0.22],
  [0.45, 0.92, 0.78],
  [0.56, 0.86, 1],
];

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

    // the dust: the quiz's own glass and words, a speck every few pixels
    const picture = drawCard(card, dpr, true);
    const pixels = picture.getContext("2d")?.getImageData(0, 0, picture.width, picture.height).data;
    const step = phone ? 7 : 10;
    const dust: { r0: number; a0: number; lag: number; c: number[]; twirl: number }[] = [];
    for (let y = step / 2; y < H; y += step)
      for (let x = step / 2; x < W; x += step) {
        const jx = x + (Math.random() - 0.5) * step;
        const jy = y + (Math.random() - 0.5) * step;
        const i = (Math.round(jy * dpr) * picture.width + Math.round(jx * dpr)) * 4;
        const a = pixels ? pixels[i + 3] / 255 : 1;
        if (a < 0.08 || Math.random() > 0.75) continue;
        const px = jx - W / 2;
        const py = H / 2 - jy;
        dust.push({
          r0: Math.hypot(px, py),
          a0: Math.atan2(py, px),
          lag: Math.random() * 0.28,
          // its own color, lifted toward warm light so it glows on any sky
          c: pixels
            ? [
                0.45 + 0.55 * (pixels[i] / 255),
                0.4 + 0.5 * (pixels[i + 1] / 255),
                0.3 + 0.45 * (pixels[i + 2] / 255),
              ]
            : [1, 1, 1],
          twirl: 0.7 + Math.random() * 0.8,
        });
      }
    const N = dust.length;
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

    // the hole, drawn in three layers so the near side of its disk passes in front of its shadow
    const quad = new THREE.PlaneGeometry(RH * 10, RH * 10);
    const uniforms = {
      uR: { value: 0.0001 },
      uTime: { value: 0 },
      uGlow: { value: 0 },
    };
    // light is added as it is, its alpha its brightness, so the canvas stays clear where it is dark
    const glow = {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    } as const;
    const layer = (frag: string, additive: boolean, order: number) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: HOLE_VERT,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        ...(additive ? glow : { blending: THREE.NormalBlending }),
      });
      const mesh = new THREE.Mesh(quad, mat);
      mesh.renderOrder = order;
      scene.add(mesh);
      return mat;
    };
    const backMat = layer(BACK_FRAG, true, 1);
    const shadowMat = layer(SHADOW_FRAG, false, 2);
    scene.add(dustPts.obj);
    const frontMat = layer(FRONT_FRAG, true, 4);

    // the point it closes to, and the shock ring it explodes with
    const point = points(1);
    point.obj.renderOrder = 5;
    point.color.set([1, 0.97, 0.9]);
    scene.add(point.obj);
    const ringU = { uRad: { value: 0 }, uWidth: { value: 20 }, uAlpha: { value: 0 } };
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: HOLE_VERT,
      fragmentShader: RING_FRAG,
      uniforms: ringU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      ...glow,
    });
    const ringQuad = new THREE.PlaneGeometry(far * 2.6, far * 2.6);
    const ringMesh = new THREE.Mesh(ringQuad, ringMat);
    ringMesh.renderOrder = 6;
    scene.add(ringMesh);

    // the sparks it flings out
    const M = phone ? 1100 : 2000;
    const sparkPts = points(M);
    sparkPts.obj.renderOrder = 7;
    scene.add(sparkPts.obj);
    const sparks = Array.from({ length: M }, () => {
      const a = Math.random() * Math.PI * 2;
      const fast = Math.random() < 0.18;
      const v =
        (fast ? 1400 + Math.random() * 1400 : 250 + Math.random() * 900) * (phone ? 0.6 : 1);
      return {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1.1 + Math.random() * 1.4,
        c: SPARKS[Math.floor(Math.random() * SPARKS.length)],
        s: (fast ? 3 : 4 + Math.random() * 5) * dpr,
        tw: 5 + Math.random() * 10,
      };
    });

    // the pull, as one curve each for the hole's size, the quiz's turn and its size
    const PULL_FROM = 0.3;
    const PULL_FOR = 1.45;
    const CLOSE = 1.72;
    const shrink = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - PULL_FROM) / PULL_FOR));
      return 1 - Math.pow(k, 2.6);
    };
    const turn = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - PULL_FROM + 0.15) / (PULL_FOR + 0.15)));
      return Math.pow(k, 1.9) * 2.4;
    };
    const hole = (t: number) => {
      if (t < CLOSE) return RH * Math.min(1, Math.pow(Math.max(0, t) / 0.55, 0.7));
      const k = Math.min(1, (t - CLOSE) / (BOOM - 0.15 - CLOSE));
      return RH * Math.max(0.0001, 1 - Math.pow(k, 2.2));
    };

    playSingularity();
    // the room darkens as the light is drawn in, then clears when it explodes
    if (veil)
      tweens.push(
        gsap
          .timeline()
          .to(veil, { opacity: 1, duration: 1.8, ease: "power2.in" }, 0.05)
          .to(veil, { opacity: 0, duration: 0.9, ease: "power2.out" }, BOOM)
      );
    card.style.transformOrigin = "50% 50%";
    card.style.willChange = "transform, filter, opacity";

    const t0 = performance.now();
    let handed = false;
    const tick = (now: number) => {
      if (stop) return;
      const t = (now - t0) / 1000;
      uniforms.uTime.value = t;
      uniforms.uR.value = hole(t);
      // the disk lights as the dust reaches it
      uniforms.uGlow.value =
        t < CLOSE ? Math.min(1.5, 0.6 + t * 0.8) : Math.max(0, 1.4 * (1 - (t - CLOSE) / 0.3));

      // the quiz itself: a shudder, then turning and shrinking into the hole
      const s = shrink(t);
      if (t < BOOM) {
        const shake = t < 0.4 ? Math.sin(t * 90) * 3 * (1 - t / 0.4) : 0;
        const deg = -turn(t) * 57.3;
        card.style.transform = `translate(${shake}px, 0) rotate(${deg}deg) scale(${Math.max(0.001, s)})`;
        card.style.filter = `blur(${(1 - s) * 7}px) brightness(${1 + (1 - s) * 1.3})`;
        card.style.opacity = String(Math.min(1, s * 3));
      }

      // the dust: riding with the quiz, then lagging and spiralling in faster as it nears
      const base = (phone ? 3.4 : 4) * dpr;
      for (let i = 0; i < N; i++) {
        const d = dust[i];
        const sp = shrink(t - d.lag);
        const r = Math.max(0, d.r0 * sp);
        const inward = 1 - sp;
        const a = d.a0 - turn(t - d.lag) * d.twirl * (1 + inward * 2.5) - inward * inward * 6;
        // squashed toward the disk's tilt as it falls in
        const flat = 1 - Math.pow(inward, 3) * 0.7;
        dustPts.position[i * 3] = Math.cos(a) * r;
        dustPts.position[i * 3 + 1] = Math.sin(a) * r * flat;
        const heat = Math.pow(inward, 1.5);
        dustPts.color[i * 3] = d.c[0] + (1 - d.c[0]) * heat;
        dustPts.color[i * 3 + 1] = d.c[1] + (0.7 - d.c[1]) * heat;
        dustPts.color[i * 3 + 2] = d.c[2] + (0.3 - d.c[2]) * heat;
        const shown = Math.min(1, Math.max(0, (inward - 0.04) * 4));
        const swallowed = r < uniforms.uR.value * 1.05 ? 0 : 1;
        dustPts.alpha[i] = shown * swallowed * (t < BOOM ? 1 : 0);
        dustPts.size[i] = base * (0.8 + inward * 0.9);
      }
      dustPts.geo.attributes.position.needsUpdate = true;
      dustPts.geo.attributes.color.needsUpdate = true;
      dustPts.geo.attributes.alpha.needsUpdate = true;
      dustPts.geo.attributes.size.needsUpdate = true;

      // the point: it appears as the hole closes, beats twice, and is gone in the explosion
      const pk = Math.max(0, Math.min(1, (t - CLOSE) / 0.2));
      const beat =
        t > BOOM - 0.2 && t < BOOM
          ? 1 + 0.6 * Math.sin(((t - (BOOM - 0.2)) / 0.2) * Math.PI * 2)
          : 1;
      point.alpha[0] = t < BOOM ? pk : Math.max(0, 1 - (t - BOOM) / 0.15);
      point.size[0] = (8 + 26 * pk) * beat * dpr * (t < BOOM ? 1 : 1 + (t - BOOM) * 30);
      point.geo.attributes.alpha.needsUpdate = true;
      point.geo.attributes.size.needsUpdate = true;

      // the explosion
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
                { opacity: 0, scale: 1.3, duration: 0.85, ease: "expo.out" }
              )
            );
        }
        const k = 1 - Math.pow(1 - Math.min(1, e / 1.1), 3);
        ringU.uRad.value = k * far * 1.25;
        ringU.uWidth.value = (phone ? 10 : 16) + k * (phone ? 40 : 70);
        ringU.uAlpha.value = Math.max(0, 1 - e / 1.0);
        for (let i = 0; i < M; i++) {
          const sp = sparks[i];
          // they fly out fast and slow to a drift, falling a little
          const drag = (1 - Math.exp(-2.6 * e)) / 2.6;
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
      if (e < 2.6) frame = requestAnimationFrame(tick);
      else onGone();
    };
    frame = requestAnimationFrame(tick);
    cleanup = () => {
      tweens.forEach((tw) => tw.kill());
      [dustPts, point, sparkPts].forEach((p) => {
        p.geo.dispose();
        p.mat.dispose();
      });
      [backMat, shadowMat, frontMat, ringMat].forEach((m) => m.dispose());
      quad.dispose();
      ringQuad.dispose();
      renderer.dispose();
    };
  })();
  return () => {
    stop = true;
    cancelAnimationFrame(frame);
    cleanup();
  };
};
