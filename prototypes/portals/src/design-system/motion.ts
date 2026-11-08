import { useEffect, useState } from "react";

/** The one easing: the approved end screen's expo-out (prototypes/daily10-end/end.css). */
export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_ARRAY = [0.22, 1, 0.36, 1] as const;

/**
 * Three springs, Apple style (response in seconds, damping ratio), ported from
 * prototypes/daily10-end/core.js and kit.js:
 *   quick  (0.32, 0.86)  the segmented thumb, a toggle knob
 *   settle (0.40, 1.00)  everything that just moves, no overshoot
 *   bounce (0.42, 0.62)  something that lands with momentum (a box drop, a flick)
 */
export const SPRINGS = {
  quick: { response: 0.32, damping: 0.86 },
  settle: { response: 0.4, damping: 1 },
  bounce: { response: 0.42, damping: 0.62 },
} as const;
export type SpringName = keyof typeof SPRINGS;

export interface Baked {
  easing: string;
  duration: number;
}

const cache = new Map<string, Baked>();
const hasLinear = () =>
  typeof CSS !== "undefined" && CSS.supports?.("animation-timing-function", "linear(0, 1)");

/** Bake a spring into a CSS linear() easing plus its settle time (kit.js springEase). */
export function bakeSpring(response = 0.4, damping = 1): Baked {
  const key = `${response}:${damping}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const k = Math.pow((2 * Math.PI) / response, 2);
  const c = (4 * Math.PI * damping) / response;
  const dt = 1 / 240;
  const pts: number[] = [];
  let x = 0;
  let v = 0;
  let t = 0;
  while (t < 2.5) {
    v += (k * (1 - x) - c * v) * dt;
    x += v * dt;
    t += dt;
    pts.push(x);
    if (t > 0.08 && Math.abs(1 - x) < 0.002 && Math.abs(v) < 0.02) break;
  }
  const n = Math.min(48, pts.length);
  const out: string[] = [];
  for (let i = 1; i < n; i++) out.push(pts[Math.floor((i / n) * pts.length)].toFixed(4));
  const baked = {
    easing: hasLinear() ? `linear(0, ${out.join(", ")}, 1)` : EASE,
    duration: Math.round(t * 1000),
  };
  cache.set(key, baked);
  return baked;
}

export function spring(name: SpringName): Baked {
  const s = SPRINGS[name];
  return bakeSpring(s.response, s.damping);
}

/** Write the baked springs to :root so CSS transitions can use var(--k-spring-*). */
export function installSpringVars() {
  const root = document.documentElement.style;
  (Object.keys(SPRINGS) as SpringName[]).forEach((n) => {
    const b = spring(n);
    root.setProperty(`--k-spring-${n}`, b.easing);
    root.setProperty(`--k-spring-${n}-ms`, `${b.duration}ms`);
  });
}

/** Apple's momentum projection (Designing Fluid Interfaces): where a flick will stop. */
export const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

/** Rubber band past a boundary: the further past, the less it follows. */
export const rubber = (offset: number, dim: number, c = 0.55) =>
  (offset * dim * c) / (dim + c * Math.abs(offset));

export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

const QUERY = "(prefers-reduced-motion: reduce)";
export function reducedMotionNow(): boolean {
  return typeof matchMedia === "function" && matchMedia(QUERY).matches;
}

/** Live reduced-motion flag: it follows the setting while the page is open. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reducedMotionNow);
  useEffect(() => {
    const mq = matchMedia(QUERY);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Spring-step a value toward a target in a rAF loop; resolves when it settles. */
export function animateSpring(
  from: number,
  to: number,
  onFrame: (v: number) => void,
  name: SpringName = "settle",
  velocity = 0
): { finished: Promise<void>; cancel(): void } {
  const { response, damping } = SPRINGS[name];
  const k = Math.pow((2 * Math.PI) / response, 2);
  const c = (4 * Math.PI * damping) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let done = () => {};
  const finished = new Promise<void>((res) => (done = res));
  if (reducedMotionNow()) {
    onFrame(to);
    done();
    return { finished, cancel() {} };
  }
  const step = (t: number) => {
    const dt = Math.min(0.032, (t - last) / 1000);
    last = t;
    v += (k * (to - x) - c * v) * dt;
    x += v * dt;
    onFrame(x);
    const scale = Math.max(1, Math.abs(to - from));
    if (Math.abs(to - x) > 0.002 * scale || Math.abs(v) > 0.02) raf = requestAnimationFrame(step);
    else {
      onFrame(to);
      done();
    }
  };
  raf = requestAnimationFrame(step);
  return { finished, cancel: () => cancelAnimationFrame(raf) };
}
