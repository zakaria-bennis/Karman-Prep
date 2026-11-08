import { STAGES, type AnimalId, type Stage } from "@/design-system/marks/mascot-paths";
import { applyMood, type PetMood } from "./moods";

/**
 * The companion's peeking engine, ported from prototypes/daily10-end/daily10/mascot.js:
 * its springs, state and the geometry of a spot. Hidden while the student answers;
 * it pops out of a fresh spot after Check, reacts, settles into a calm neutral and
 * ducks away on Next. It only ever peeks from behind real UI edges that a layout
 * callback describes, never crosses text, and every motion is a spring from the
 * current value, so any reaction can interrupt any other without a jump. The moves
 * live in moves.ts, the reactions in reactions.ts, the frame in frame.ts.
 */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export type Side = "top" | "bottom" | "left" | "right";
export interface Spot {
  rect: Rect;
  side: Side;
  at: number;
  cock?: number;
  reach?: number;
}
export interface Layout {
  spots: Record<string, Spot>;
  keepOut: Rect[];
  avoid?: Rect[];
}
export type LookTarget = Element | { x: number; y: number } | null;

export interface Spring {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}
export const spring = (x: number, k: number, c: number): Spring => ({ x, v: 0, t: x, k, c });
export function step(s: Spring, dt: number, reduced: boolean) {
  if (reduced) {
    s.x = s.t;
    s.v = 0;
    return;
  }
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

export const SPOTS = ["bar", "barR", "next", "top", "edge", "edgeL", "figure", "choice", "choiceL"];
export const GAP = 14; // keep a visible gap from any text, not just avoid touching it
export const HEAD_H = 98;
export const HALF_W = 64;
export const MIN_PEEK = 0.5;
export const OUT = 330; // time for the pop to land before the reaction starts
export const SIG: Partial<Record<AnimalId, "tailSwish" | "owlTilt">> = {
  fox: "tailSwish",
  owl: "owlTilt",
};

export function createState(animal: AnimalId, stage: Stage, layout: () => Layout) {
  return {
    animal,
    stage,
    enabled: true,
    answering: true,
    reduced: false,
    layout,
    spot: "bar",
    s: {
      peek: spring(0, 170, 17),
      slide: spring(0, 80, 14),
      tilt: spring(0, 120, 11),
      squash: spring(1, 420, 14),
      lookX: spring(0, 160, 18),
      lookY: spring(0, 160, 18),
      earL: spring(0, 260, 11),
      earR: spring(0, 260, 11),
      tail: spring(0, 70, 7),
      room: spring(1, 200, 24),
      turn: spring(0, 170, 13),
      pitch: spring(0, 170, 14),
      lean: spring(0, 150, 12),
      puff: spring(1, 160, 12),
      tailFade: spring(0, 220, 26),
      cock: spring(0, 260, 24),
      paw: spring(0, 200, 16),
      pawLift: spring(0, 240, 14),
      size: spring(1, 120, 16),
    },
    bobY: 0,
    bobV: 0,
    wag: 0,
    wagRate: 2.4,
    wagAmp: 4,
    mood: "n" as PetMood,
    next: null as string | null,
    gliding: false,
    lookTarget: null as LookTarget,
    timers: [] as number[],
    lastInput: performance.now(),
    dozing: false,
    tailSide: 1,
    cache: {} as Record<string, Spot>,
    shift: {} as Record<string, number>,
    visible: false,
    lastSpot: null as string | null,
    recent: [] as string[],
    cursor: null as { x: number; y: number; t: number } | null,
    cursorZip: 0,
    relocAt: 0,
    push: 0,
    cap: 1,
  };
}
export type State = ReturnType<typeof createState>;

export interface Engine {
  M: State;
  svg: SVGSVGElement;
  host(): { w: number; h: number };
  /** A client-space rect in the host's own coordinates. */
  local(r: DOMRect): Rect;
}

// check-ins use a stiffer, less damped peek so the pop is quick and lands with a small overshoot
export function snappy(M: State, on: boolean) {
  M.s.peek.k = on ? 620 : 170;
  M.s.peek.c = on ? 34 : 17;
}
export const later = (M: State, ms: number, f: () => void) => {
  const t = window.setTimeout(f, ms);
  M.timers.push(t);
  return t;
};
export const clearTimers = (M: State) => {
  M.timers.forEach(clearTimeout);
  M.timers = [];
};
export function setMood(E: Engine, m: PetMood) {
  E.M.mood = m;
  applyMood(E.svg, m, 0.55);
  // a lazy sway at rest, a happy swish, almost still when sad
  E.M.wagRate = m === "h" ? 9 : m === "s" ? 0.8 : m === "z" ? 0.5 : 1.8;
  E.M.wagAmp = m === "h" ? 11 : m === "s" ? 1.5 : 4;
  E.M.s.puff.t = 1;
}

export function anchorOf(sp: Spot) {
  const r = sp.rect;
  if (sp.side === "top") return { x: sp.at, y: r.top, rot: 0, horiz: true };
  if (sp.side === "bottom") return { x: sp.at, y: r.bottom, rot: 180, horiz: true };
  if (sp.side === "right") return { x: r.right, y: sp.at, rot: 90, horiz: false };
  return { x: r.left, y: sp.at, rot: -90, horiz: false };
}
// the footprint at its highest pop, to test against the host's edges
export function footprint(M: State, sp: Spot): Rect {
  const a = anchorOf(sp);
  const h = 92 * STAGES[M.stage].head;
  const w = 70;
  if (sp.side === "top") return { left: a.x - w, right: a.x + w, top: a.y - h, bottom: a.y + 8 };
  if (sp.side === "bottom") return { left: a.x - w, right: a.x + w, top: a.y - 8, bottom: a.y + h };
  if (sp.side === "right") return { left: a.x + 2, right: a.x + h, top: a.y - w, bottom: a.y + w };
  return { left: a.x - h, right: a.x - 2, top: a.y - w, bottom: a.y + w };
}
// text on the companion's side of the edge, including a line cut in half by the edge
function blockers(sp: Spot, keepOut: Rect[], a: { x: number; y: number }) {
  const hw = HALF_W + GAP;
  const out: { room: number; line: number }[] = [];
  keepOut.forEach((r) => {
    if (sp.side === "top" && r.right > a.x - hw && r.left < a.x + hw && r.top < a.y - 1)
      out.push({ room: r.bottom <= a.y + 1 ? a.y - r.bottom : 0, line: Math.min(r.bottom, a.y) });
    if (sp.side === "bottom" && r.right > a.x - hw && r.left < a.x + hw && r.bottom > a.y + 1)
      out.push({ room: r.top >= a.y - 1 ? r.top - a.y : 0, line: Math.max(r.top, a.y) });
    if (sp.side === "right" && r.bottom > a.y - hw && r.top < a.y + hw && r.right > a.x + 1)
      out.push({ room: r.left >= a.x - 1 ? r.left - a.x : 0, line: Math.max(r.left, a.x) });
    if (sp.side === "left" && r.bottom > a.y - hw && r.top < a.y + hw && r.left < a.x - 1)
      out.push({ room: r.right <= a.x + 1 ? a.x - r.right : 0, line: Math.min(r.right, a.x) });
  });
  return out;
}
/** How far the companion may rise out of this edge without coming within GAP of any text. */
export function capFor(M: State, sp: Spot, keepOut: Rect[]) {
  const a = anchorOf(sp);
  const h = HEAD_H * STAGES[M.stage].head;
  const room = blockers(sp, keepOut, a).reduce((m, b) => Math.min(m, b.room), Infinity);
  return Math.min(1.08, (room - GAP) / h);
}
/** The line the companion's outline must stay GAP away from, along the peek direction. */
export function limitFor(sp: Spot, keepOut: Rect[]) {
  const bs = blockers(sp, keepOut, anchorOf(sp));
  if (!bs.length) return null;
  const ls = bs.map((b) => b.line);
  return sp.side === "top" || sp.side === "left" ? Math.max(...ls) : Math.min(...ls);
}
export function validSpot(E: Engine, name: string): Spot | null {
  const L = E.M.layout();
  const sp = L.spots[name];
  if (!sp) return null;
  const f = footprint(E.M, sp);
  const { w, h } = E.host();
  if (f.left < -1 || f.right > w + 1 || f.top < 0 || f.bottom > h) {
    if (sp.side !== "top") return null; // the bar spots may still be used at a lower peek
  }
  if (capFor(E.M, sp, L.keepOut) < MIN_PEEK) return null;
  return sp;
}
// a spot that just scrolled away is held where it was for the moment it takes to duck and move
export function spotNow(M: State, name: string): Spot {
  const L = M.layout();
  if (L.spots[name]) return (M.cache[name] = L.spots[name]);
  return M.cache[name] || L.spots.bar;
}
