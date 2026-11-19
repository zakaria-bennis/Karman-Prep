"use client";
// Coins earned, thrown up and gathered in (three.js). Real little gold discs with the Karman coin's
// face on them burst up from the foot of the screen, tumble, and fly into the coin counter, which
// ticks as each one lands. Nothing is drawn when the student asked for less motion, or when the
// browser cannot draw it: the counter then simply shows the number.
import { useEffect, useRef } from "react";
import { prefersStill } from "@/lib/painting/motion";

type Flying = {
  mesh: import("three").Mesh;
  vx: number;
  vy: number;
  spin: number;
  roll: number;
  wait: number;
  home: number;
  from: { x: number; y: number } | null;
};

export function CoinBurst({
  coins,
  play,
  target,
  onLand,
  className,
}: {
  /** How many discs to throw (not the amount earned: a handful stands for it). */
  coins: number;
  /** Changes each time the burst should play. 0 plays nothing. */
  play: number;
  /** The counter the coins fly to; its own coin drawing is the face on every disc. */
  target: React.RefObject<HTMLElement | null>;
  onLand?: (landed: number, of: number) => void;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const landed = useRef(onLand);
  useEffect(() => {
    landed.current = onLand;
  }, [onLand]);

  useEffect(() => {
    const el = canvas.current;
    const to = target.current;
    if (!el || !to || play === 0 || coins <= 0 || prefersStill()) return;
    let stop = false;
    let frame = 0;
    let cleanup = () => {};
    void (async () => {
      const THREE = await import("three");
      if (stop) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(W, H, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -500, 500);
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const sun = new THREE.DirectionalLight(0xfff2cc, 2.4);
      sun.position.set(-0.4, 0.8, 1);
      scene.add(sun);

      // the face: the counter's own coin drawing, painted onto each disc
      const face = new THREE.Texture();
      const drawing = to.querySelector("svg");
      if (drawing) {
        const copy = drawing.cloneNode(true) as SVGElement;
        copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        copy.setAttribute("width", "256");
        copy.setAttribute("height", "256");
        const img = new Image();
        img.onload = () => {
          face.image = img;
          face.colorSpace = THREE.SRGBColorSpace;
          face.needsUpdate = true;
        };
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          new XMLSerializer().serializeToString(copy)
        )}`;
      }
      const r = Math.max(15, Math.min(24, W / 26));
      const shape = new THREE.CylinderGeometry(r, r, r * 0.2, 40);
      const edge = new THREE.MeshStandardMaterial({
        color: 0xd89a14,
        metalness: 0.7,
        roughness: 0.35,
      });
      const front = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: face,
        metalness: 0.25,
        roughness: 0.5,
      });
      const box = to.getBoundingClientRect();
      const goal = { x: box.left + box.width / 2 - W / 2, y: H / 2 - (box.top + box.height / 2) };
      const flying: Flying[] = Array.from({ length: coins }, (_, i) => {
        const mesh = new THREE.Mesh(shape, [edge, front, front]);
        mesh.position.set((Math.random() - 0.5) * 60, -H / 2 - r * 2, 0);
        mesh.rotation.set(Math.PI / 2, 0, Math.random() * 6);
        scene.add(mesh);
        return {
          mesh,
          vx: (Math.random() - 0.5) * Math.min(W, 900) * 0.9,
          vy: H * (0.95 + Math.random() * 0.5),
          spin: 6 + Math.random() * 8,
          roll: (Math.random() - 0.5) * 6,
          wait: i * 0.035,
          home: 0.95 + i * 0.05,
          from: null,
        };
      });
      let done = 0;
      let last = performance.now();
      let age = 0;
      const tick = (now: number) => {
        if (stop) return;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        age += dt;
        for (const c of flying) {
          if (!c.mesh.visible) continue;
          const t = age - c.wait;
          if (t < 0) continue;
          if (t < c.home) {
            c.vy -= H * 2.1 * dt;
            c.mesh.position.x += c.vx * dt;
            c.mesh.position.y += c.vy * dt;
            c.mesh.rotation.x += c.spin * dt;
            c.mesh.rotation.z += c.roll * dt;
          } else {
            c.from ??= { x: c.mesh.position.x, y: c.mesh.position.y };
            const k = Math.min(1, (t - c.home) / 0.42);
            const e = k * k * (3 - 2 * k);
            c.mesh.position.x = c.from.x + (goal.x - c.from.x) * e;
            c.mesh.position.y = c.from.y + (goal.y - c.from.y) * e;
            c.mesh.rotation.x += c.spin * 1.6 * dt;
            c.mesh.scale.setScalar(1 - 0.55 * e);
            if (k >= 1) {
              c.mesh.visible = false;
              done += 1;
              landed.current?.(done, coins);
            }
          }
        }
        renderer.render(scene, camera);
        if (done < coins) frame = requestAnimationFrame(tick);
        else renderer.clear();
      };
      frame = requestAnimationFrame(tick);
      cleanup = () => {
        shape.dispose();
        edge.dispose();
        front.dispose();
        face.dispose();
        renderer.dispose();
      };
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [play, coins, target]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
