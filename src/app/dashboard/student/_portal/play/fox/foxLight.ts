// The light on Karman (TailsStage.tsx): a glow at each tail's tip, breathing, in his stage's color;
// foxfire, little flames that circle him from Understanding on (blue, and gold at the top), each
// trailing sparks; and motes of light rising off the lit tips. All of it follows the tails as they
// sway, so it stays on them.
import type { Fx, Light } from "./stageFx";
import { FOXFIRE, GOLD } from "./stageFx";
import { LAYOUT, TIP, tipOf, type TailState } from "./foxArt";

export type FoxState = {
  tails: TailState[];
  crouch: number;
  tilt: number;
  lift: number;
  sway: number;
  /** Sitting up: 0 not at all, 1 sat. */
  rise: number;
  /** Curled up asleep: 1 curled, 0 gone. */
  curl: number;
  /** His head lifting off his body as he wakes. */
  wake: number;
  /** His eyes closing: 0 open, 1 shut. */
  blink: number;
  earL: number;
  earR: number;
};

export function lightFox(kit: Fx, state: () => FoxState, level: () => number) {
  const tipLights: Light[] = Array.from({ length: 9 }, () => ({
    x: 0,
    y: 0,
    size: 0,
    r: 1,
    g: 1,
    b: 1,
    a: 0,
  }));
  const wisps: Light[] = Array.from({ length: 9 }, () => ({
    x: 0,
    y: 0,
    size: 22,
    r: 0.5,
    g: 0.75,
    b: 1,
    a: 0,
  }));
  kit.lights.push(...tipLights, ...wisps);
  let mote = 0;
  kit.onFrame((dt, time) => {
    const s = state();
    const lv = level();
    const c = TIP[lv];
    s.tails.forEach((tail, i) => {
      const sway = Math.sin(performance.now() / 620 + i * 0.8) * 2.6 * s.sway;
      const p = tipOf(tail, sway);
      const l = tipLights[i];
      l.x = p.x;
      l.y = p.y + s.crouch * 2 + (1 - Math.min(1, s.rise)) * 40;
      const breathe = 0.8 + 0.2 * Math.sin(time * 2.4 + i);
      const lit = lv === 0 ? 0 : tail.o;
      l.size = (lv === 3 ? 64 : lv === 2 ? 54 : 34) * breathe * tail.s;
      l.a = lit * (lv === 1 ? 0.55 : 0.85) * breathe;
      [l.r, l.g, l.b] = c;
    });
    // foxfire: little flames circling Karman, more for a higher stage
    const many = lv === 3 ? 9 : lv === 2 ? 3 : 0;
    wisps.forEach((w, i) => {
      const on = i < many;
      const ang = time * (0.7 + (i % 3) * 0.12) + (i / Math.max(1, many)) * Math.PI * 2;
      w.x = Math.cos(ang) * 118;
      w.y = -16 + Math.sin(ang) * 44 + Math.sin(time * 3 + i) * 6;
      w.a += ((on ? 0.9 : 0) - w.a) * Math.min(1, dt * 3);
      w.size = 20 + 6 * Math.sin(time * 9 + i * 2);
      const gold = lv === 3 && i % 2 === 0;
      [w.r, w.g, w.b] = gold ? GOLD : FOXFIRE;
      if (on && Math.random() < dt * 30)
        kit.sparks.push({
          x: w.x,
          y: w.y,
          vx: (Math.random() - 0.5) * 10,
          vy: -18 - Math.random() * 14,
          size: 7,
          r: w.r,
          g: w.g,
          b: w.b,
          life: 0.45,
          drag: 1,
          tw: 0,
        });
    });
    // motes rising off the lit tips
    mote += dt;
    if (lv > 0 && mote > 0.12) {
      mote = 0;
      const i = Math.floor(Math.random() * LAYOUT[lv].length);
      const l = tipLights[i];
      kit.sparks.push({
        x: l.x + (Math.random() - 0.5) * 10,
        y: l.y,
        vx: (Math.random() - 0.5) * 12,
        vy: -22 - Math.random() * 20,
        size: 5 + Math.random() * 3,
        r: c[0],
        g: c[1],
        b: c[2],
        life: 1.4,
        drag: 0.6,
        tw: 10,
      });
    }
  });
}
