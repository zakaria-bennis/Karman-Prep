// The key sounds' recipes (founder decisions, 2026-10-26). Most keys are a soft mechanical key, a
// short band of filtered noise for the click and a low resonant body for the "thock", warm and
// low-mid (bodies 110 to 400 Hz, clicks under 2.4 kHz), never piercing; each has its own recipe,
// related by that shared body: a pitch that rises or falls (open and close pairs, raising and
// lowering) and extra soft taps that say "that worked" (operators, functions, Enter). The keys
// typed most, digits and letters, are only a very quiet tick that says "you hit a key", like a
// phone keyboard's click; constants are a softer, rounder tick. Every function is one family, the
// sound the founder chose for sin, cos and tan, varied in pitch per function. Pure data, so a unit
// test can check that every category is distinct.

export type KeySound =
  | "digit" // 0 to 9 and the point: a quiet tick
  | "letter" // any other letter: the tick, a shade lower
  | "variable" // x, y and θ: the tick, a shade brighter
  | "constant" // π, τ, ∞: a softer, rounder tick
  | "minus"
  | "plus"
  | "times"
  | "divide"
  | "exponent" // ^ and x²: raising
  | "subscript" // _: lowering
  | "regression" // ~ (and the keypad's double =): running a regression
  | "equals"
  | "sqrt" // √, cube and nth roots
  | "function" // every function name, |a|, % and "percent of"; varied per function
  | "openParen"
  | "closeParen"
  | "openBracket" // [ and {
  | "closeBracket" // ] and }
  | "comparison" // < > ≤ ≥
  | "symbol" // , | ! : and the like
  | "delete" // Backspace and Delete
  | "enter"
  | "move"; // the arrow keys

/** A later, softer tap of the same body: `delay` s after the first, at `body` Hz. */
export interface Tap {
  delay: number;
  body: number;
  level: number;
}

export interface Recipe {
  body: number; // Hz at the start of the resonant body
  glide: number; // the body's end pitch as a ratio of its start (above 1 rises, below 1 falls)
  decay: number; // s for the body to fade
  bodyLevel: number; // 0: a tick with no body
  click: number; // Hz, the centre of the noise band
  clickQ: number;
  clickLevel: number;
  clickDecay: number; // s
  taps?: readonly Tap[];
}

const key = (r: Partial<Recipe> & Pick<Recipe, "body">): Recipe => ({
  glide: 0.85,
  decay: 0.055,
  bodyLevel: 0.5,
  click: 1700,
  clickQ: 1.2,
  clickLevel: 0.35,
  clickDecay: 0.012,
  ...r,
});

/** A tick: a very short, quiet click with almost no body. */
const tick = (click: number, r: Partial<Recipe> = {}): Recipe =>
  key({
    body: 300,
    glide: 1,
    decay: 0.02,
    bodyLevel: 0,
    click,
    clickQ: 1.4,
    clickLevel: 0.16,
    clickDecay: 0.008,
    ...r,
  });

export const RECIPES: Readonly<Record<KeySound, Recipe>> = {
  digit: tick(2000),
  letter: tick(1800),
  variable: tick(2150, { clickLevel: 0.17 }),
  constant: tick(1250, {
    clickQ: 0.9,
    clickLevel: 0.13,
    clickDecay: 0.014,
    body: 320,
    bodyLevel: 0.08,
    decay: 0.03,
  }),
  minus: key({ body: 150, glide: 0.7, decay: 0.06, click: 1300 }),
  plus: key({ body: 170, taps: [{ delay: 0.03, body: 255, level: 0.22 }] }),
  times: key({ body: 160, click: 2000, clickQ: 2, taps: [{ delay: 0.03, body: 200, level: 0.2 }] }),
  divide: key({
    body: 145,
    glide: 0.75,
    click: 1100,
    taps: [{ delay: 0.045, body: 120, level: 0.2 }],
  }),
  exponent: key({ body: 200, glide: 1.35, decay: 0.07 }),
  subscript: key({ body: 230, glide: 0.7, decay: 0.06 }),
  regression: key({
    body: 180,
    glide: 1,
    taps: [
      { delay: 0.05, body: 240, level: 0.24 },
      { delay: 0.1, body: 320, level: 0.18 },
    ],
  }),
  equals: key({ body: 175, glide: 1, decay: 0.06, taps: [{ delay: 0.03, body: 175, level: 0.3 }] }),
  sqrt: key({ body: 210, glide: 1.2, decay: 0.08, click: 900 }),
  // The sin, cos and tan sound (kept as the founder chose it), for every function.
  function: key({
    body: 260,
    glide: 0.95,
    decay: 0.08,
    click: 1000,
    clickQ: 3,
    taps: [{ delay: 0.04, body: 390, level: 0.18 }],
  }),
  openParen: key({ body: 200, glide: 1.15 }),
  closeParen: key({ body: 200, glide: 0.82 }),
  openBracket: key({ body: 160, glide: 1.15, click: 2200, clickQ: 1.8 }),
  closeBracket: key({ body: 160, glide: 0.82, click: 2200, clickQ: 1.8 }),
  comparison: key({ body: 185, glide: 0.9, click: 1600, clickQ: 2.5 }),
  symbol: key({ body: 210, glide: 0.88, decay: 0.045, click: 1700, clickQ: 0.8 }),
  delete: key({ body: 120, glide: 0.7, decay: 0.07, click: 900, clickLevel: 0.3 }),
  enter: key({ body: 170, glide: 1, decay: 0.06, taps: [{ delay: 0.06, body: 255, level: 0.3 }] }),
  move: key({ body: 300, glide: 1, decay: 0.025, bodyLevel: 0.15, clickLevel: 0.18 }),
};

/** Every category, in RECIPES order. */
export const KEY_SOUNDS = Object.keys(RECIPES) as KeySound[];

/** Semitones up from the function sound per name; sin, cos and tan keep the founder's three. */
const FIXED_VARIANTS: Readonly<Record<string, number>> = { sin: 0, cos: 1, tan: 2 };

/**
 * A function's variant: sin, cos and tan as chosen; any other name a pitch from 0 to 6 semitones
 * in half steps, from its letters, so each function sounds its own.
 */
export function functionVariant(name: string): number {
  if (Object.hasOwn(FIXED_VARIANTS, name)) return FIXED_VARIANTS[name];
  let hash = 7;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 13;
  return hash / 2;
}
