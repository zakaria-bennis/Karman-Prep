/*
 * Life in Karman's paintings once they are finished: birds crossing the sky, light glinting on
 * water, rings where a fish rose, smoke from the cabin chimney, a waterfall that falls, surf that
 * rolls in, leaves drifting down, butterflies over the flowers, mist sliding along the valley,
 * and at night, twinkling stars and fireflies. Each scene lists what lives in it.
 * Ported from prototypes/today-directions/life.js (founder approved, 2026-11-08).
 */
import type { TimeOfDay } from "../light";
import * as land from "./land";
import * as sky from "./sky";
import { LIFE_SCENES, rnd, WHEN, type Drawer, type LifeState } from "./types";
import * as water from "./water";

const DRAW: Record<string, Drawer> = { ...sky, ...water, ...land };

export interface PictureMap {
  /** Picture units (0 to 1 across) to CSS pixels. */
  X: (u: number) => number;
  Y: (v: number) => number;
  /** CSS pixels per picture pixel. */
  S: number;
}

export function initLife(scene: number, time: TimeOfDay): LifeState {
  const state: LifeState = { scene, time, items: [], birdsAt: rnd(0.5, 2.5), ringsAt: rnd(1, 3) };
  for (const [kind, ...a] of LIFE_SCENES[scene] ?? []) {
    if (WHEN[kind] && !WHEN[kind].includes(time)) continue;
    state.items.push({ kind, a, parts: [], clock: 0 });
  }
  if (time === "night") {
    state.items.push({
      kind: "stars",
      a: [0, 0.42],
      clock: 0,
      parts: Array.from({ length: 70 }, () => ({
        u: Math.random(),
        v: Math.random() * 0.42,
        p: Math.random() * 6.28,
        s: rnd(0.6, 1.8),
      })),
    });
  }
  return state;
}

/** Draws one frame of life. `alpha` fades the scene in once the painting is done. */
export function drawLife(
  g: CanvasRenderingContext2D,
  state: LifeState,
  dt: number,
  t: number,
  map: PictureMap,
  alpha: number
) {
  const night = state.time === "night";
  const dusk = state.time === "sunset" || state.time === "dawn";
  const ink = night ? "rgba(220,228,255," : dusk ? "rgba(40,24,30," : "rgba(30,34,40,";
  g.save();
  g.globalAlpha = alpha;
  for (const it of state.items) {
    const draw = DRAW[it.kind];
    if (!draw) continue;
    g.save();
    draw(it, { g, dt, t, X: map.X, Y: map.Y, S: map.S, ink, night, time: state.time, state });
    g.restore();
  }
  g.restore();
}
