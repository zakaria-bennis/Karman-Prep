/* The thinking orb (thinking-orbs 0.3.2, MIT, Jakub Antalik), drawn without React.
   window.karmanOrb(canvas, { state, size, dark, tint }) starts one and returns its stop function.
   The stage's orb runs only while the film is late (film.js adds .waiting after 400 ms). */
import { resolvePreset, MODE_FRAMES, paintFrame } from "./vendor/thinking-orbs/engine.es.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)");

function karmanOrb(canvas, { state = "working", size = 64, dark = false, tint } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d");
  const { mode, speed, opts } = resolvePreset(state, size);
  let raf = 0,
    alive = true;
  const draw = () => {
    if (!alive) return;
    // slower, not stopped, when the reader asked for less motion: a loader that never moves says nothing
    const t = (performance.now() / 1e3) * speed * (reduce.matches ? 0.35 : 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    paintFrame(ctx, MODE_FRAMES[mode](size, t, opts), dark, tint);
    raf = requestAnimationFrame(draw);
  };
  draw();
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
  };
}
window.karmanOrb = karmanOrb;

const stage = document.querySelector(".stage");
const c = stage?.querySelector(".orb");
if (stage && c) {
  let stop = null,
    t = 0;
  const sync = () => {
    clearTimeout(t);
    if (stage.classList.contains("waiting")) {
      if (!stop)
        stop = karmanOrb(c, {
          state: "working",
          size: 64,
          dark: true,
          tint: { r: 235, g: 162, b: 31 },
        });
    } else if (stop) {
      // let it fade out before the loop stops
      t = setTimeout(() => {
        stop?.();
        stop = null;
      }, 450);
    }
  };
  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ["class"] });
  sync();
}
