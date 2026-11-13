"use client";

// The canvas behind the sign-in pages: the snowy cabin (src/lib/cabin/). It follows the page's light or dark
// mode (sunrise or foggy night), leans a little with the pointer and lets the pointer stir the snow. With
// reduced motion it paints one still picture.
import { useEffect, useRef } from "react";
import { buildScene, paint, type CabinMode, type Pointer, type Scene } from "@/lib/cabin/scene";

export default function CabinScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ks = document.getElementById("ks");
    if (!cv || !ks) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ptr: Pointer = { px: 0, py: 0, wind: 0 };
    const aim = { px: 0, py: 0, wind: 0 };
    let scene: Scene | null = null;
    let raf = 0;
    let last = 0;
    let start = 0;

    const mode = (): CabinMode => (ks.dataset.mode === "dark" ? "night" : "dawn");
    const build = () => {
      const w = innerWidth;
      const h = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, w < 760 ? 2 : 1.5);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const keep = scene?.life;
      scene = buildScene(w, h, mode(), dpr);
      // a change of mode keeps the snow, deer and birds where they were
      if (keep && keep.flakes.length === scene.life.flakes.length) scene.life = keep;
      if (still) paint(c, scene, 30, 0, ptr);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!scene) return;
      if (!start) start = last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ptr.px += (aim.px - ptr.px) * Math.min(1, dt * 2.2);
      ptr.py += (aim.py - ptr.py) * Math.min(1, dt * 2.2);
      ptr.wind += (aim.wind - ptr.wind) * Math.min(1, dt * 3);
      aim.wind *= 1 - Math.min(1, dt * 1.6);
      paint(c, scene, (now - start) / 1000, dt, ptr);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      aim.px = (e.clientX / innerWidth) * 2 - 1;
      aim.py = (e.clientY / innerHeight) * 2 - 1;
      aim.wind = Math.max(-1.2, Math.min(1.2, aim.wind + e.movementX / 160));
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    build();
    const watch = new MutationObserver(build);
    watch.observe(ks, { attributes: true, attributeFilter: ["data-mode"] });
    addEventListener("resize", build);
    document.addEventListener("visibilitychange", pause);
    if (!still) {
      addEventListener("pointermove", move, { passive: true });
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      removeEventListener("resize", build);
      removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);

  return <canvas ref={ref} className="cb-scene" aria-hidden="true" />;
}
