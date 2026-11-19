"use client";
// The shatter: the card cracks into shards of glass, each carrying its piece of the question; they
// burst out tumbling and catching the light, then spiral in and close up into the ending's ring.
import gsap from "gsap";
import { crack, drawCard, stageOn, type Run } from "./introKit";

type Shard = {
  mesh: import("three").Mesh;
  /** Where it starts, in the scene's units (the middle of the screen is 0, up is +). */
  x0: number;
  y0: number;
  slot: number;
};

export const shatter: Run = ({ card: el, canvas: cv, flash, ring, onLanded, onGone }) => {
  let stop = false;
  let frame = 0;
  let cleanup = () => {};
  void (async () => {
    const stage = await stageOn(cv);
    if (stop) return;
    if (!stage) {
      onLanded();
      onGone();
      return;
    }
    const { THREE, renderer, scene, camera, W, H, dpr } = stage;
    const box = el.getBoundingClientRect();
    const texture = new THREE.CanvasTexture(drawCard(el, dpr));
    texture.colorSpace = THREE.SRGBColorSpace;
    // the ring the shards are going to: its middle and its radius on the screen
    const cx = ring ? ring.left + ring.width / 2 - W / 2 : 0;
    const cy = ring ? H / 2 - (ring.top + ring.height / 2) : 0;
    const radius = ring ? (ring.width * 74) / 168 : 80;

    // the card cut into triangles on a jittered grid
    const cols = W < 600 ? 7 : 9;
    const rows = Math.max(5, Math.round((cols * box.height) / box.width));
    const pts: [number, number][][] = [];
    for (let r = 0; r <= rows; r++) {
      pts[r] = [];
      for (let c = 0; c <= cols; c++) {
        const edge = r === 0 || r === rows || c === 0 || c === cols;
        const jx = edge && (c === 0 || c === cols) ? 0 : (Math.random() - 0.5) * 0.7;
        const jy = edge && (r === 0 || r === rows) ? 0 : (Math.random() - 0.5) * 0.7;
        pts[r][c] = [((c + jx) / cols) * box.width, ((r + jy) / rows) * box.height];
      }
    }
    const tris: [number, number][][] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a = pts[r][c];
        const b = pts[r][c + 1];
        const d = pts[r + 1][c];
        const e = pts[r + 1][c + 1];
        if (Math.random() < 0.5) tris.push([a, b, e], [a, e, d]);
        else tris.push([a, b, d], [b, e, d]);
      }
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const shards: Shard[] = tris.map((t) => {
      const mx = (t[0][0] + t[1][0] + t[2][0]) / 3;
      const my = (t[0][1] + t[1][1] + t[2][1]) / 3;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          t.flatMap(([x, y]) => [x - mx, -(y - my), 0]),
          3
        )
      );
      geo.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          t.flatMap(([x, y]) => [x / box.width, 1 - y / box.height]),
          2
        )
      );
      const mesh = new THREE.Mesh(geo, material.clone());
      // a sheen of light on each piece of glass, brighter as it tilts and as the ring closes
      const shine = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: 0xfff6dc,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      shine.position.z = 1;
      mesh.add(shine);
      const x0 = box.left + mx - W / 2;
      const y0 = H / 2 - (box.top + my);
      mesh.position.set(x0, y0, 0);
      scene.add(mesh);
      return { mesh, x0, y0, slot: 0 };
    });
    // each shard takes the place on the ring nearest its own side, so they sweep round, not across
    const order = shards
      .map((s, i) => ({ i, a: Math.atan2(s.y0 - cy, s.x0 - cx) }))
      .sort((a, b) => a.a - b.a);
    order.forEach((o, n) => (shards[o.i].slot = n));
    el.style.visibility = "hidden";
    crack();
    if (flash)
      gsap.fromTo(
        flash,
        { opacity: 0.9, scale: 0.4 },
        { opacity: 0, scale: 2.2, duration: 0.9, ease: "power2.out" }
      );

    const N = shards.length;
    const cardCx = box.left + box.width / 2 - W / 2;
    const cardCy = H / 2 - (box.top + box.height / 2);
    const start = performance.now();
    const BURST = 0.55;
    const SWIRL = 1.35;
    const ease = (k: number) => 1 - Math.pow(1 - k, 3);
    const inOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const spin = shards.map(() => ({
      rx: (Math.random() - 0.5) * 9,
      ry: (Math.random() - 0.5) * 9,
      rz: (Math.random() - 0.5) * 6,
      out: 40 + Math.random() * (W < 600 ? 70 : 140),
      wait: Math.random() * 0.12,
    }));
    let handed = false;
    const tick = (now: number) => {
      if (stop) return;
      const t = (now - start) / 1000;
      shards.forEach((s, i) => {
        const sp = spin[i];
        const local = Math.max(0, t - sp.wait);
        // 1 out: pushed from the card's middle, tumbling
        const dx = s.x0 - cardCx;
        const dy = s.y0 - cardCy;
        const d = Math.hypot(dx, dy) || 1;
        const kb = ease(Math.min(1, local / BURST));
        const bx = s.x0 + (dx / d) * sp.out * kb;
        const by = s.y0 + (dy / d) * sp.out * kb + 30 * kb;
        // 2 in: a spiral round the ring's middle to its own place on the ring
        const ks = inOut(Math.max(0, Math.min(1, (local - BURST * 0.7) / SWIRL)));
        const a0 = Math.atan2(by - cy, bx - cx);
        const r0 = Math.hypot(bx - cx, by - cy);
        let a1 = -Math.PI / 2 + (2 * Math.PI * s.slot) / N;
        while (a1 < a0) a1 += 2 * Math.PI;
        const a = a0 + (a1 - a0) * ks;
        const r = r0 + (radius - r0) * ks;
        s.mesh.position.x = cx + Math.cos(a) * r;
        s.mesh.position.y = cy + Math.sin(a) * r;
        const tumble = (1 - ks) * kb;
        s.mesh.rotation.x = sp.rx * tumble;
        s.mesh.rotation.y = sp.ry * tumble;
        s.mesh.rotation.z = sp.rz * tumble;
        // closing up, each one thins into a piece of the ring and turns to light
        const size = 1 - ks * 0.82;
        s.mesh.scale.set(size, size, 1);
        const glint = s.mesh.children[0] as import("three").Mesh;
        const gm = glint.material as import("three").MeshBasicMaterial;
        gm.opacity = Math.min(
          0.95,
          0.25 * Math.abs(Math.sin(s.mesh.rotation.x + s.mesh.rotation.y)) + ks * ks * 0.85
        );
      });
      renderer.render(scene, camera);
      const done = t > BURST * 0.7 + SWIRL + 0.14;
      if (done && !handed) {
        handed = true;
        onLanded();
        gsap.to(cv, {
          opacity: 0,
          duration: 0.45,
          ease: "power2.out",
          onComplete: onGone,
        });
      }
      if (t < BURST * 0.7 + SWIRL + 0.8) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    cleanup = () => {
      shards.forEach((s) => {
        s.mesh.geometry.dispose();
        (s.mesh.material as import("three").Material).dispose();
        (
          (s.mesh.children[0] as import("three").Mesh).material as import("three").Material
        ).dispose();
      });
      material.dispose();
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
