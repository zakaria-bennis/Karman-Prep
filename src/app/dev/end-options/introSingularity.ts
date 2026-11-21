"use client";
// The singularity (founder, 2026-11-19: "a singularity animation that explodes into the final card";
// then "the screen-like shattering, and then the shatters spreading out but coming back into the
// singularity, and then the singularity imploding", the singularity smaller and "like a jump to
// hyperspace"). Finish is pressed on the last question, and in under a second and a half:
//   0.00  the screen breaks into pieces of glass, each carrying its piece of the question, which
//         fly apart, tumbling
//   0.30  a small singularity opens in the middle, and the jump begins: stars stretch into streaks
//         of light racing out from it, longer and faster; the room darkens
//   0.45  the pieces are pulled back: they turn, stretch toward it and pour in, turning to light
//   1.12  it falls in on itself: the streaks are drawn in after it, a ring closes round it, and it
//         shrinks to a single bright point; the sound stops dead
//   1.38  it explodes: a flash, a shock ring racing out to the edges, sparks flung out, and the
//         ending comes out of the point (unfold.ts)
// The sound is singularitySound.ts, timed to this.
import gsap from "gsap";
import { cutShards, drawCard, dropShards, FRAG, stageOn, VERT, type Run } from "./introKit";
import { BOOM, CUT, IMPLODE, OPEN, playSingularity } from "./singularitySound";

const PLANE_VERT = `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
/** Light as it is, its alpha its brightness, so the canvas stays clear where it is dark. */
const GLOW = `
vec4 glow(vec3 light) {
  light = min(light, vec3(1.0));
  return vec4(light, max(light.r, max(light.g, light.b)));
}`;
// the singularity's black heart
const SHADOW_FRAG = `
uniform float uR;
varying vec2 vP;
void main() {
  float shadow = 1.0 - smoothstep(uR * 0.9, uR, length(vP));
  gl_FragColor = vec4(0.0, 0.0, 0.03, shadow);
}`;
// a thin white-blue ring at its edge, and a cold halo round it
const HOLE_FRAG = `
${GLOW}
uniform float uR;
uniform float uGlow;
varying vec2 vP;
void main() {
  float r = length(vP);
  float w = uR * 0.14 + 0.8;
  vec3 light = vec3(0.86, 0.94, 1.0) * exp(-pow((r - uR * 1.04) / w, 2.0)) * (0.7 + uGlow);
  light += vec3(0.5, 0.72, 1.0) * exp(-max(0.0, r - uR) / (uR * 1.4 + 1.0)) * 0.55 * uGlow;
  light *= 1.0 - smoothstep(uR * 5.0, uR * 6.0, r);
  gl_FragColor = glow(light);
}`;
// a ring of light: closing in on the point as it implodes, racing out when it explodes. Three rings,
// red, green and blue a little apart, like light split by glass.
const RING_FRAG = `
${GLOW}
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
  vec3 c = vec3(cr, cg * 0.95, cb) * 0.9 + vec3(1.0, 0.92, 0.8) * exp(-pow((r - uRad) / (w * 0.35), 2.0)) * 0.8;
  gl_FragColor = glow(c * uAlpha);
}`;
// the streaks of the jump: each a thin quad, bright at its head and fading to nothing at its tail
const STREAK_VERT = `
attribute vec3 color;
varying vec3 vC;
void main() {
  vC = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const STREAK_FRAG = `
${GLOW}
varying vec3 vC;
void main() {
  gl_FragColor = glow(vC);
}`;

/** The colors the sparks fly out in: gold, white, amber, and the portal's teal and sky. */
const SPARKS = [
  [1, 0.84, 0.36],
  [1, 0.97, 0.9],
  [1, 0.6, 0.22],
  [0.45, 0.92, 0.78],
  [0.56, 0.86, 1],
];
/** The streaks' colors: white, and the cold blues of the jump. */
const STARS = [
  [1, 1, 1],
  [0.78, 0.88, 1],
  [0.6, 0.78, 1],
  [0.86, 0.96, 1],
];

const clamp = (k: number) => Math.max(0, Math.min(1, k));
/** How far the pieces fly apart, in seconds from Finish. */
const BURST = 0.5;

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
    // small: a bright point with a black heart, not a disk across the screen
    const RH = Math.max(9, Math.min(16, Math.min(W, H) * 0.018));
    const far = Math.hypot(W, H) / 2;
    const glow = {
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    } as const;
    const layer = (
      frag: string,
      uniforms: Record<string, { value: number }>,
      blend: object,
      order: number,
      size: number
    ) => {
      const geo = new THREE.PlaneGeometry(size, size);
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
      return { geo, mat };
    };

    // 1 the streaks of the jump, under everything
    const S = phone ? 260 : 520;
    const streakPos = new Float32Array(S * 4 * 3);
    const streakCol = new Float32Array(S * 4 * 3);
    const index: number[] = [];
    for (let i = 0; i < S; i++) {
      const v = i * 4;
      index.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
    streakGeo.setAttribute("color", new THREE.BufferAttribute(streakCol, 3));
    streakGeo.setIndex(index);
    const streakMat = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      // the quads wind either way round; draw both faces
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      ...glow,
    });
    const streakMesh = new THREE.Mesh(streakGeo, streakMat);
    streakMesh.renderOrder = 0;
    streakMesh.frustumCulled = false;
    scene.add(streakMesh);
    // each star sits at a depth: the nearer it comes, the further out it shows (out = K / z)
    const K = RH * 1.3;
    const zFar = 1;
    const zNear = K / (far * 1.15);
    const stars = Array.from({ length: S }, () => ({
      a: Math.random() * Math.PI * 2,
      z: 1 / (1 + Math.random() * (1 / zNear - 1)),
      c: STARS[Math.floor(Math.random() * STARS.length)],
      b: 0.5 + Math.random() * 0.5,
      w: 0.6 + Math.random() * 1.2,
    }));
    // how fast the stars come at us: crawling as it opens, a rush by the time it implodes
    const speed = (t: number) => 0.12 * Math.pow(30, clamp((t - OPEN) / (IMPLODE - OPEN)));

    // 2 the pieces of glass, carrying the screen
    const picture = drawCard(card, dpr, true);
    const texture = new THREE.CanvasTexture(picture);
    texture.colorSpace = THREE.SRGBColorSpace;
    const pieces = cutShards(stage, card, texture);
    pieces.forEach((p) => (p.holder.renderOrder = 1));
    const box = card.getBoundingClientRect();
    const cardCx = box.left + box.width / 2 - W / 2;
    const cardCy = H / 2 - (box.top + box.height / 2);
    const motion = pieces.map((p) => {
      const dx = p.x0 - cardCx;
      const dy = p.y0 - cardCy;
      const d = Math.hypot(dx, dy) || 1;
      const out = 60 + Math.random() * (phone ? 90 : 190);
      // the outer pieces go in last, so it pours in rather than vanishing all at once
      const reach = Math.min(1, Math.hypot(p.x0, p.y0) / far);
      const land = 0.78 + reach * 0.26 + Math.random() * 0.08;
      return {
        ox: (dx / d) * out,
        oy: (dy / d) * out + 20,
        rx: (Math.random() - 0.5) * 8,
        ry: (Math.random() - 0.5) * 8,
        rz: (Math.random() - 0.5) * 5,
        wait: Math.random() * 0.08,
        from: land - 0.5,
        land,
        swirl: (1.2 + Math.random()) * (Math.random() < 0.8 ? 1 : -1),
      };
    });

    // 3 the singularity: its black heart over the pieces, so they vanish into it, and its ring
    const holeU = { uR: { value: 0.0001 }, uGlow: { value: 0 } };
    const shadow = layer(SHADOW_FRAG, holeU, { blending: THREE.NormalBlending }, 2, 260);
    const ring = layer(HOLE_FRAG, holeU, glow, 3, 260);

    // 4 the point, the ring that closes and bursts, the sparks
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
    const point = points(1);
    point.obj.renderOrder = 4;
    point.color.set([0.92, 0.97, 1]);
    scene.add(point.obj);
    const shockU = { uRad: { value: 0 }, uWidth: { value: 20 }, uAlpha: { value: 0 } };
    const shock = layer(RING_FRAG, shockU, glow, 5, far * 2.6);
    const M = phone ? 1100 : 2000;
    const sparkPts = points(M);
    sparkPts.obj.renderOrder = 6;
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

    // how big the singularity is: it opens with a little overshoot, then falls in on itself
    const hole = (t: number) => {
      if (t < OPEN) return 0.0001;
      if (t < IMPLODE) {
        const k = clamp((t - OPEN) / 0.16);
        return RH * (k < 1 ? 1.25 * Math.sin((k * Math.PI) / 2) - 0.25 * k * k : 1);
      }
      return RH * Math.max(0.0001, 1 - Math.pow(clamp((t - IMPLODE) / (CUT - IMPLODE)), 1.6));
    };
    // everything drawn in after it as it implodes: 1 as it was, 0 at the point
    const drawIn = (t: number) => 1 - Math.pow(clamp((t - IMPLODE) / (CUT - IMPLODE)), 2.2);

    // every shader built now, so the first frames do not stall
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    card.style.visibility = "hidden";
    playSingularity();
    // the clock moves at most a frame at a time: a slow frame slows it, never skips the pull
    let t = 0;
    let last = performance.now();
    let handed = false;
    const tick = (now: number) => {
      if (stop) return;
      const dt = Math.min(1 / 30, (now - last) / 1000);
      t += dt;
      last = now;
      const gone = drawIn(t);
      holeU.uR.value = hole(t);
      holeU.uGlow.value = t < IMPLODE ? clamp((t - OPEN) * 2) * 1.2 : 1.2 + (1 - gone) * 1.5;
      // the room darkens as it opens, and clears when it explodes
      if (veil)
        veil.style.opacity = String(
          t < BOOM ? 1 - Math.pow(1 - clamp((t - 0.1) / 0.6), 2) : Math.max(0, 1 - (t - BOOM) / 0.7)
        );

      // the jump's streaks
      const v = speed(t);
      const blur = 0.07;
      const show = t < CUT ? clamp((t - OPEN) / 0.15) : 0;
      for (let i = 0; i < S; i++) {
        const s = stars[i];
        if (t > OPEN) s.z -= v * dt * s.z * 2.2;
        if (s.z < zNear) s.z = zFar * (0.6 + Math.random() * 0.4);
        const head = (K / s.z) * gone;
        const tail = (K / Math.min(zFar * 1.6, s.z * (1 + v * blur * 3))) * gone;
        const cx = Math.cos(s.a);
        const cy = Math.sin(s.a);
        const w = s.w * (0.7 + 2.6 * (head / far)) * (1 + (1 - gone) * 0.6);
        const tw = w * 0.15;
        const o = i * 12;
        streakPos[o] = cx * head - cy * w;
        streakPos[o + 1] = cy * head + cx * w;
        streakPos[o + 3] = cx * head + cy * w;
        streakPos[o + 4] = cy * head - cx * w;
        streakPos[o + 6] = cx * tail + cy * tw;
        streakPos[o + 7] = cy * tail - cx * tw;
        streakPos[o + 9] = cx * tail - cy * tw;
        streakPos[o + 10] = cy * tail + cx * tw;
        // brighter the further out and faster it goes, and as it is drawn in
        const b =
          show *
          s.b *
          clamp(head / (far * 0.08)) *
          (0.45 + 0.55 * clamp(v / 2)) *
          (1 + (1 - gone) * 1.2);
        for (let k = 0; k < 2; k++) {
          streakCol[o + k * 3] = s.c[0] * b;
          streakCol[o + k * 3 + 1] = s.c[1] * b;
          streakCol[o + k * 3 + 2] = s.c[2] * b;
          streakCol[o + 6 + k * 3] = 0;
          streakCol[o + 7 + k * 3] = 0;
          streakCol[o + 8 + k * 3] = 0;
        }
      }
      streakGeo.attributes.position.needsUpdate = true;
      streakGeo.attributes.color.needsUpdate = true;

      // the pieces: out, tumbling; then turned toward the singularity, stretched, and pulled in
      pieces.forEach((p, i) => {
        const m = motion[i];
        const kb = 1 - Math.pow(1 - clamp((t - m.wait) / BURST), 3);
        const bx = p.x0 + m.ox * kb;
        const by = p.y0 + m.oy * kb;
        const kp = Math.pow(clamp((t - m.from) / (m.land - m.from)), 2.6);
        const r0 = Math.hypot(bx, by);
        const a0 = Math.atan2(by, bx);
        const r = r0 * (1 - kp);
        const a = a0 + kp * m.swirl;
        p.holder.visible = r > holeU.uR.value * 0.6 && t < BOOM;
        p.holder.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        // the holder faces the singularity, so its stretch is toward it; the glass inside turns
        // back, so the picture keeps its way up until it tumbles
        p.holder.rotation.z = a;
        const size = 1 - kp * 0.75;
        p.holder.scale.set(size * (1 + kp * 3.2), size * (1 - kp * 0.6), 1);
        const tumble = kb * (1 - kp * 0.6);
        p.mesh.rotation.set(m.rx * tumble, m.ry * tumble, -a + m.rz * tumble);
        p.shine.opacity = Math.min(
          0.95,
          0.25 * Math.abs(Math.sin(p.mesh.rotation.x + p.mesh.rotation.y)) + kp * 0.9
        );
      });

      // the ring that closes in on it as it implodes
      if (t >= IMPLODE - 0.05 && t < CUT) {
        const k = clamp((t - (IMPLODE - 0.05)) / (CUT - IMPLODE + 0.05));
        shockU.uRad.value = far * 0.55 * (1 - Math.pow(k, 1.5));
        shockU.uWidth.value = phone ? 8 : 12;
        shockU.uAlpha.value = Math.sin(k * Math.PI) * 0.9;
      } else if (t < BOOM) shockU.uAlpha.value = 0;

      // the point: it shows as it falls in, beats once in the silence, and bursts
      const pk = clamp((t - (IMPLODE + 0.06)) / 0.08);
      const beat =
        t > BOOM - 0.1 && t < BOOM ? 1 + 0.8 * Math.sin(((t - (BOOM - 0.1)) / 0.1) * Math.PI) : 1;
      point.alpha[0] = t < BOOM ? pk : Math.max(0, 1 - (t - BOOM) / 0.12);
      point.size[0] = (6 + 18 * pk) * beat * dpr * (t < BOOM ? 1 : 1 + (t - BOOM) * 40);
      point.geo.attributes.alpha.needsUpdate = true;
      point.geo.attributes.size.needsUpdate = true;

      const e = t - BOOM;
      if (e >= 0) {
        if (!handed) {
          handed = true;
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
        shockU.uRad.value = k * far * 1.25;
        shockU.uWidth.value = (phone ? 10 : 16) + k * (phone ? 40 : 70);
        shockU.uAlpha.value = Math.max(0, 1 - e / 0.75);
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
      [point, sparkPts].forEach((p) => {
        p.geo.dispose();
        p.mat.dispose();
      });
      [shadow, ring, shock].forEach((l) => {
        l.geo.dispose();
        l.mat.dispose();
      });
      streakGeo.dispose();
      streakMat.dispose();
      dropShards(pieces);
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
