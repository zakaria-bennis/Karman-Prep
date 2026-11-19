"use client";
// The fireflies (founder, 2026-11-19: Ghibli's feeling, soft and quietly magical). The card melts
// into a few thousand specks, each the color of its own spot on the card, so for a moment the question
// is still there, made of light. They warm into fireflies, drift up and wander, twinkling; then they
// swarm, spiralling in, and close into a ring of light where the ending's ring will be. A few break
// away as the ending opens and float about it for a while before fading.
import gsap from "gsap";
import { chime, drawCard, stageOn, type Run } from "./introKit";

export const VERT = `
attribute vec3 color;
attribute float alpha;
attribute float size;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  vAlpha = alpha;
  gl_PointSize = size;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// a speck of light: a white-hot middle in its own color, a soft halo round it, readable on a bright
// sky as on a dark one
export const FRAG = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float halo = pow(1.0 - d, 1.6);
  float core = pow(1.0 - d, 6.0);
  vec3 c = mix(vColor * 0.85, vec3(1.0, 0.98, 0.9), core);
  gl_FragColor = vec4(c, vAlpha * clamp(halo * 1.3, 0.0, 1.0));
}`;

export const fireflies: Run = ({ card, canvas, ring, onLanded, onGone }) => {
  let stop = false;
  let frame = 0;
  let cleanup = () => {};
  void (async () => {
    const stage = await stageOn(canvas);
    if (stop) return;
    if (!stage) {
      onLanded();
      onGone();
      return;
    }
    const { THREE, renderer, scene, camera, W, dpr, at } = stage;
    const dark = card.parentElement?.getAttribute("data-mode") === "dark";
    const box = card.getBoundingClientRect();
    const picture = drawCard(card, dpr);
    const pctx = picture.getContext("2d");
    const pixels = pctx?.getImageData(0, 0, picture.width, picture.height).data;

    // a speck for every few pixels of the card, the color of its spot
    const step = W < 600 ? 8 : 9;
    const specks: { x: number; y: number; r: number; g: number; b: number }[] = [];
    for (let y = step / 2; y < box.height; y += step)
      for (let x = step / 2; x < box.width; x += step) {
        const jx = x + (Math.random() - 0.5) * step;
        const jy = y + (Math.random() - 0.5) * step;
        const i = (Math.round(jy * dpr) * picture.width + Math.round(jx * dpr)) * 4;
        const a = pixels ? pixels[i + 3] / 255 : 1;
        if (a < 0.05) continue;
        specks.push({
          x: box.left + jx,
          y: box.top + jy,
          r: pixels ? pixels[i] / 255 : 1,
          g: pixels ? pixels[i + 1] / 255 : 1,
          b: pixels ? pixels[i + 2] / 255 : 1,
        });
      }
    const N = specks.length;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const alpha = new Float32Array(N);
    const size = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    scene.add(new THREE.Points(geo, mat));

    const rc = ring ? at(ring.left + ring.width / 2, ring.top + ring.height / 2) : { x: 0, y: 0 };
    const R = ring ? (ring.width * 74) / 168 : 80;
    // a firefly's light: warm gold by night, a deeper amber by day so it shows on a bright sky
    const glow = dark ? [1, 0.74, 0.3] : [1, 0.58, 0.1];
    const seeds = specks.map((s, i) => {
      const p = at(s.x, s.y);
      return {
        x0: p.x,
        y0: p.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.2,
        rise: 30 + Math.random() * 90,
        spread: 40 + Math.random() * (W < 600 ? 90 : 200),
        angle: Math.random() * Math.PI * 2,
        slot: i,
        late: Math.random() * 0.35,
        // about one in seven stays a firefly after the ring closes, and floats about the ending
        stray: Math.random() < 0.14,
        twinkle: 2 + Math.random() * 4,
      };
    });
    // each takes the place on the ring nearest its own side, so they sweep round, not across
    seeds
      .map((s, i) => ({ i, a: Math.atan2(s.y0 - rc.y, s.x0 - rc.x) }))
      .sort((a, b) => a.a - b.a)
      .forEach((o, n) => (seeds[o.i].slot = n));

    card.style.transition = "opacity 0.5s ease, filter 0.5s ease";
    card.style.opacity = "0";
    card.style.filter = "blur(6px)";
    chime([523.3, 659.3, 784, 1046.5, 1318.5]);

    const MELT = 0.6;
    const DRIFT = 1.1;
    const SWARM = 1.5;
    const AFTER = 2.6;
    const t0 = performance.now();
    const inOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    let handed = false;
    const tick = (now: number) => {
      if (stop) return;
      const t = (now - t0) / 1000;
      const base = (W < 600 ? 5 : 6.5) * dpr;
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const sp = specks[i];
        // the card's colors warm into firefly light
        const warm = Math.min(1, t / (MELT + 0.4));
        col[i * 3] = sp.r + (glow[0] - sp.r) * warm;
        col[i * 3 + 1] = sp.g + (glow[1] - sp.g) * warm;
        col[i * 3 + 2] = sp.b + (glow[2] - sp.b) * warm;
        // drifting: up, out, and wandering in small slow circles
        const kd = Math.min(1, Math.max(0, t / (MELT + DRIFT)));
        const wander = Math.sin(t * s.speed + s.phase);
        const dx = s.x0 + Math.cos(s.angle) * s.spread * kd + wander * 14 * kd;
        const dy = s.y0 + s.rise * kd + Math.cos(t * s.speed * 1.3 + s.phase) * 12 * kd;
        // swarming: a spiral in to its place on the ring
        const ks = inOut(Math.max(0, Math.min(1, (t - MELT - DRIFT * 0.6 - s.late) / SWARM)));
        const a0 = Math.atan2(dy - rc.y, dx - rc.x);
        const r0 = Math.hypot(dx - rc.x, dy - rc.y);
        let a1 = -Math.PI / 2 + (2 * Math.PI * s.slot) / N;
        while (a1 < a0) a1 += 2 * Math.PI;
        const settle = Math.sin(t * 6 + s.phase) * 1.5 * ks;
        let x = rc.x + Math.cos(a0 + (a1 - a0) * ks) * (r0 + (R + settle - r0) * ks);
        let y = rc.y + Math.sin(a0 + (a1 - a0) * ks) * (r0 + (R + settle - r0) * ks);
        let fade = 1;
        // after the ring closes: the strays float off about the ending, the rest go out
        const kb = Math.max(0, t - (MELT + DRIFT * 0.6 + SWARM + 0.5));
        if (kb > 0) {
          if (s.stray) {
            x += Math.cos(s.angle) * kb * 60 + Math.sin(t * s.speed + s.phase) * 20;
            y += kb * 35 + Math.cos(t * s.speed + s.phase) * 16;
            fade = Math.max(0, 1 - kb / AFTER);
          } else fade = Math.max(0, 1 - kb / 1.1);
        }
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        const tw = 0.65 + 0.35 * Math.sin(t * s.twinkle + s.phase);
        alpha[i] = Math.min(1, t / 0.25) * fade * (ks > 0.95 ? 1 : tw);
        size[i] = base * (0.8 + warm * 0.6 * tw) * (1 + ks * 0.4);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      renderer.render(scene, camera);
      if (!handed && t > MELT + DRIFT * 0.6 + SWARM + 0.15) {
        handed = true;
        onLanded();
      }
      if (t < MELT + DRIFT * 0.6 + SWARM + 0.5 + AFTER) frame = requestAnimationFrame(tick);
      else onGone();
    };
    frame = requestAnimationFrame(tick);
    // the ending is pressed through the strays: they do not catch the pointer
    gsap.set(canvas, { pointerEvents: "none" });
    cleanup = () => {
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  })();
  return () => {
    stop = true;
    cancelAnimationFrame(frame);
    cleanup();
  };
};
