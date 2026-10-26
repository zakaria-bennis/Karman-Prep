// The key sounds' recipes (founder decision, 2026-10-26): every sound is a soft mechanical key, a
// short band of filtered noise for the click and a low resonant body for the "thock", warm and
// low-mid (bodies 110 to 400 Hz, clicks under 2.4 kHz), never piercing. Each kind of key has its
// own recipe, related by that shared body: a pitch that rises or falls (open and close pairs,
// raising and lowering), extra soft taps that say "that worked" (operators, functions, Enter),
// and for constants a short voice through two vowel formants. Pure data, so a unit test can check
// that every category is distinct.

export type KeySound =
  | "digit" // 0 to 9 and the point
  | "letter" // any other letter
  | "variable" // x and y (and θ)
  | "minus"
  | "plus"
  | "times"
  | "divide"
  | "exponent" // ^ and x²: raising
  | "subscript" // _: lowering
  | "regression" // ~ (and the keypad's double =): running a regression
  | "equals"
  | "sqrt"
  | "percent" // % and "percent of"
  | "trig" // sin, cos, tan and their inverses and hyperbolics
  | "log" // ln, log, exp
  | "stats" // statistics, lists, distributions, inference
  | "calculus" // d/dx, integrals, sums and products
  | "function" // every other function
  | "openParen"
  | "closeParen"
  | "openBracket" // [ and {
  | "closeBracket" // ] and }
  | "comparison" // < > ≤ ≥
  | "symbol" // , | ! : and the like
  | "constant" // π, τ: app-like and a little "talky"
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
  bodyLevel: number;
  click: number; // Hz, the centre of the noise band
  clickQ: number;
  clickLevel: number;
  clickDecay: number; // s
  taps?: readonly Tap[];
  vowel?: readonly [from: number, to: number][]; // formant glides for the talky blip
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

export const RECIPES: Readonly<Record<KeySound, Recipe>> = {
  digit: key({ body: 190 }),
  letter: key({ body: 240, glide: 0.9, decay: 0.045, click: 1500, clickLevel: 0.3 }),
  variable: key({ body: 215, glide: 0.92, taps: [{ delay: 0.035, body: 320, level: 0.22 }] }),
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
  percent: key({ body: 200, glide: 0.95, taps: [{ delay: 0.03, body: 150, level: 0.25 }] }),
  trig: key({
    body: 260,
    glide: 0.95,
    decay: 0.08,
    click: 1000,
    clickQ: 3,
    taps: [{ delay: 0.04, body: 390, level: 0.18 }],
  }),
  log: key({
    body: 230,
    glide: 1.05,
    decay: 0.07,
    taps: [{ delay: 0.04, body: 310, level: 0.18 }],
  }),
  stats: key({
    body: 200,
    glide: 1,
    decay: 0.06,
    taps: [
      { delay: 0.035, body: 250, level: 0.18 },
      { delay: 0.07, body: 300, level: 0.14 },
    ],
  }),
  calculus: key({
    body: 180,
    glide: 1.25,
    decay: 0.08,
    taps: [{ delay: 0.05, body: 270, level: 0.18 }],
  }),
  function: key({
    body: 240,
    glide: 1,
    decay: 0.065,
    taps: [{ delay: 0.04, body: 300, level: 0.16 }],
  }),
  openParen: key({ body: 200, glide: 1.15 }),
  closeParen: key({ body: 200, glide: 0.82 }),
  openBracket: key({ body: 160, glide: 1.15, click: 2200, clickQ: 1.8 }),
  closeBracket: key({ body: 160, glide: 0.82, click: 2200, clickQ: 1.8 }),
  comparison: key({ body: 185, glide: 0.9, click: 1600, clickQ: 2.5 }),
  symbol: key({ body: 210, glide: 0.88, decay: 0.045, click: 1700, clickQ: 0.8 }),
  constant: key({
    body: 180,
    glide: 0.85,
    decay: 0.11,
    bodyLevel: 0.35,
    clickLevel: 0.2,
    vowel: [
      [700, 420],
      [1100, 1800],
    ],
  }),
  delete: key({ body: 120, glide: 0.7, decay: 0.07, click: 900, clickLevel: 0.3 }),
  enter: key({ body: 170, glide: 1, decay: 0.06, taps: [{ delay: 0.06, body: 255, level: 0.3 }] }),
  move: key({ body: 300, glide: 1, decay: 0.025, bodyLevel: 0.15, clickLevel: 0.18 }),
};

/** Every category, in RECIPES order. */
export const KEY_SOUNDS = Object.keys(RECIPES) as KeySound[];
