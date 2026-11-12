import {
  sigOf,
  SPOTS,
  anchorOf,
  clearTimers,
  later,
  setMood,
  snappy,
  spotNow,
  validSpot,
  type Engine,
  type State,
} from "./engine";

/**
 * The companion's moves (mascot.js goTo, pickSpot, hide, popOut, hop and the
 * small gestures): each sets spring targets and timers; the frame does the rest.
 */
export function goTo(E: Engine, name: string, opts: { duck?: boolean } = {}) {
  const M = E.M;
  const sp = validSpot(E, name);
  if (!sp) return false;
  const cur = spotNow(M, M.spot);
  const a = anchorOf(sp);
  const sameEdge =
    sp.side === cur.side &&
    Math.abs(sp.rect.top - cur.rect.top) < 1 &&
    Math.abs(sp.rect.bottom - cur.rect.bottom) < 1 &&
    a.horiz;
  if (name === M.spot) {
    if (M.s.peek.t < 0.5) M.s.peek.t = 1;
    return true;
  }
  if (sameEdge && !opts.duck) {
    M.spot = name;
    M.gliding = true;
    M.s.peek.t = 0.34;
    M.s.slide.t = a.x;
    M.s.paw.t = 0;
    return true;
  }
  M.next = name;
  M.s.peek.t = -0.2;
  M.s.paw.t = 0;
  return true;
}
// a spot it has not used recently, and never the same spot twice in a row
export function pickSpot(E: Engine, exclude: string[] = []) {
  const M = E.M;
  const valid = SPOTS.filter((n) => n !== M.lastSpot && !exclude.includes(n) && validSpot(E, n));
  if (!valid.length) {
    // only one spot has room: use it, but slide to a different stretch of it
    const only =
      SPOTS.find((n) => !exclude.includes(n) && validSpot(E, n)) ||
      (validSpot(E, "bar") ? "bar" : null);
    if (!only) return null;
    const prev = M.shift[only] || 0;
    let d: number;
    do {
      d = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 110);
    } while (Math.abs(d - prev) < 80);
    M.shift[only] = d;
    M.lastSpot = only;
    return only;
  }
  const fresh = valid.filter((n) => !M.recent.includes(n));
  const pool = fresh.length ? fresh : valid;
  const nm = pool[Math.floor(Math.random() * pool.length)];
  M.recent = [nm, ...M.recent].slice(
    0,
    Math.max(1, SPOTS.filter((n) => validSpot(E, n)).length - 1)
  );
  M.lastSpot = nm;
  return nm;
}
export const ears = (M: State, l: number, r: number, ms: number) => {
  // still: no ear flicks, the ears rest
  if (M.reduced) {
    M.s.earL.t = 0;
    M.s.earR.t = 0;
    return;
  }
  M.s.earL.t = l;
  M.s.earR.t = r;
  if (ms)
    later(M, ms, () => {
      M.s.earL.t = 0;
      M.s.earR.t = 0;
    });
};
export const bob = (M: State, v: number) => {
  if (!M.reduced) M.bobV = -v;
};
export function hide(E: Engine) {
  const M = E.M;
  clearTimers(M);
  M.visible = false;
  M.next = null;
  M.dozing = false;
  M.lookTarget = null;
  M.s.peek.t = -0.25;
  M.s.tilt.t = 0;
  ears(M, 0, 0, 0);
  setMood(E, "n");
}
// pop out of a new spot with a quick, slightly overshooting spring
export function popOut(E: Engine) {
  const M = E.M;
  clearTimers(M);
  M.visible = true;
  M.dozing = false;
  M.lookTarget = null;
  setMood(E, "n");
  const nm = pickSpot(E);
  if (!nm) return false;
  snappy(M, true);
  later(M, 700, () => snappy(M, false));
  M.next = nm;
  M.s.peek.t = -0.2;
  return true;
}
// hop to another fresh spot mid-celebration
export function hop(E: Engine) {
  if (E.M.reduced) return;
  const nm = pickSpot(E, [E.M.spot]);
  if (nm) {
    snappy(E.M, true);
    goTo(E, nm, { duck: true });
    later(E.M, 600, () => snappy(E.M, false));
  }
}
// back to calm: neutral face, blinking, eyes following the cursor
export const settle = (E: Engine, ms: number) =>
  later(E.M, ms, () => {
    setMood(E, "n");
    E.M.s.peek.t = 1;
    E.M.s.tilt.t = 0;
    ears(E.M, 0, 0, 0);
    E.M.lookTarget = null;
  });
export const wiggle = (M: State, n: number, deg: number, gap: number) => {
  if (M.reduced) return;
  for (let i = 0; i < n; i++) later(M, i * gap, () => (M.s.tilt.t = i % 2 ? -deg : deg));
  later(M, n * gap, () => (M.s.tilt.t = 0));
};
export function signature(E: Engine) {
  const M = E.M;
  if (M.reduced) return;
  const s = sigOf(M.animal);
  // fox: the tail fluffs up and swishes fast along the bar, staying low the whole time
  if (s === "tailSwish") {
    M.wagRate = 15;
    M.wagAmp = 16;
    M.s.puff.t = 1.18;
    later(M, 1200, () => {
      M.s.puff.t = 1;
      M.wagRate = Math.min(M.wagRate, 10);
      M.wagAmp = Math.min(M.wagAmp, 12);
    });
    bob(M, 150);
    later(M, 300, () => bob(M, 120));
  }
  if (s === "earFlop") {
    ears(M, 28, -20, 0);
    later(M, 180, () => ears(M, -22, 28, 0));
    later(M, 360, () => ears(M, 24, -18, 0));
    later(M, 560, () => ears(M, 0, 0, 0));
    bob(M, 160);
    later(M, 320, () => bob(M, 150));
  }
  if (s === "pawBat") {
    M.s.pawLift.t = 1;
    later(M, 170, () => (M.s.pawLift.t = 0));
    later(M, 340, () => (M.s.pawLift.t = 1));
    later(M, 510, () => (M.s.pawLift.t = 0));
    M.s.tilt.t = -8;
    later(M, 600, () => (M.s.tilt.t = 0));
  }
  if (s === "owlTilt") {
    M.s.tilt.t = 24;
    later(M, 380, () => (M.s.tilt.t = -24));
    later(M, 760, () => (M.s.tilt.t = 0));
    bob(M, 120);
  }
  if (s === "pawWave") {
    M.s.pawLift.t = 1.4;
    wiggle(M, 5, 7, 140);
    later(M, 860, () => (M.s.pawLift.t = 0));
  }
  // the wolf pup's howl: mascot.js taps three times here; those taps are left out
  // (no taps, founder's sound rule), so the howl is silent motion
  if (s === "howl") {
    setMood(E, "o");
    M.s.tilt.t = -14;
    M.s.peek.t = 1.1;
    later(M, 1100, () => {
      M.s.tilt.t = 0;
      setMood(E, "h");
    });
  }
}
// happiness grows with the streak: a bigger smile, livelier tail, more bounce
export function happy(E: Engine, tier: number) {
  setMood(E, "h");
  E.M.wagRate = 4 + tier * 2.4;
  E.M.wagAmp = 5 + tier * 2.4;
  E.svg
    .querySelectorAll<SVGElement>(".m-blush")
    .forEach((e) => (e.style.opacity = String(Math.min(1, 0.6 + tier * 0.1))));
}
export function wake(E: Engine) {
  const M = E.M;
  M.lastInput = performance.now();
  if (M.dozing) {
    M.dozing = false;
    setMood(E, "n");
    M.s.peek.t = 1.06;
    M.s.tilt.t = 0;
    ears(M, -16, -16, 300);
    M.s.squash.v = 5;
    later(M, 300, () => (M.s.peek.t = 1));
  }
}
