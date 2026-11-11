// The "arman" of the founder's signature, written twelve ways for him to choose from (2026-11-11). Each
// version is the same five joined letters, leaning to the right like the first "a", with a different lean,
// width, height and roundness. The letters are laid out on a baseline, sheared to lean, and fitted between
// the end of the K and the start of the tail. Once he picks, keep that one path and delete the rest.

/** Each letter as points on a unit grid: x across, y up from the baseline (1 is the letter's height). */
const LETTERS: [number, number][][] = [
  /* a: round the bowl, up to close it, straight down the stem, out */
  [
    [0.72, 0.78],
    [0.42, 1],
    [0.08, 0.62],
    [0.14, 0.14],
    [0.42, 0.02],
    [0.68, 0.4],
    [0.76, 0.96],
    [0.76, 0.5],
    [0.8, 0.06],
    [1, 0.08],
  ],
  /* r: up the stem, back down a little, over the shoulder */
  [
    [0, 0.08],
    [0.18, 0.98],
    [0.2, 0.66],
    [0.46, 1],
    [0.72, 0.84],
    [0.76, 0.58],
  ],
  /* m: a stem and two arches, each coming back down to the line */
  [
    [0, 0.05],
    [0.1, 0.96],
    [0.1, 0.05],
    [0.16, 0.7],
    [0.36, 1],
    [0.5, 0.6],
    [0.5, 0.05],
    [0.56, 0.7],
    [0.76, 1],
    [0.9, 0.6],
    [0.9, 0.06],
    [1.05, 0.1],
  ],
  [
    [0.72, 0.78],
    [0.42, 1],
    [0.08, 0.62],
    [0.14, 0.14],
    [0.42, 0.02],
    [0.68, 0.4],
    [0.76, 0.96],
    [0.76, 0.5],
    [0.8, 0.06],
    [1, 0.08],
  ],
  /* n: a stem and one arch, then away up into the tail */
  [
    [0, 0.05],
    [0.1, 0.96],
    [0.1, 0.05],
    [0.16, 0.7],
    [0.4, 1],
    [0.56, 0.6],
    [0.56, 0.06],
    [0.7, 0.2],
    [1, 0.9],
  ],
];

export interface SigStyle {
  /** How far the letters lean to the right. */
  lean: number;
  /** How tall the letters stand, in the drawing's units. */
  tall: number;
  /** How wide the "m" is beside the other letters. */
  wideM: number;
  /** How round the joins are: 0 is sharp, 1 is loose. */
  round: number;
  /** The pen's width. */
  pen: number;
}

export const SIG_STYLES: SigStyle[] = [
  { lean: 0.45, tall: 40, wideM: 1.2, round: 0.3, pen: 7.5 },
  { lean: 0.7, tall: 40, wideM: 1.2, round: 0.3, pen: 7.5 },
  { lean: 1, tall: 40, wideM: 1.2, round: 0.3, pen: 7.5 },
  { lean: 0.6, tall: 54, wideM: 1.1, round: 0.28, pen: 7 },
  { lean: 0.85, tall: 60, wideM: 1.15, round: 0.3, pen: 6.5 },
  { lean: 0.6, tall: 28, wideM: 1.5, round: 0.35, pen: 8.5 },
  { lean: 0.9, tall: 30, wideM: 1.6, round: 0.4, pen: 8 },
  { lean: 0.55, tall: 46, wideM: 1.3, round: 0.12, pen: 6.5 },
  { lean: 0.8, tall: 48, wideM: 1.35, round: 0.1, pen: 6 },
  { lean: 0.65, tall: 44, wideM: 1.25, round: 0.6, pen: 9.5 },
  { lean: 0.95, tall: 50, wideM: 1.4, round: 0.55, pen: 8.5 },
  { lean: 1.15, tall: 36, wideM: 1.3, round: 0.22, pen: 5.5 },
];

const X0 = 414;
const X1 = 786;
const BASE = 254;
const END: [number, number] = [786, 212];

/** The joined letters as one path, from the K's leg to where the tail begins. */
export function arman(s: SigStyle): string {
  const widths = [1, 0.8, s.wideM, 1, 1];
  const pts: [number, number][] = [];
  let x = 0;
  LETTERS.forEach((letter, i) => {
    for (const [lx, ly] of letter) pts.push([x + lx * widths[i], ly]);
    x += widths[i] + 0.1;
  });
  const total = x;
  const run = X1 - X0 - s.lean * s.tall;
  const place = ([px, py]: [number, number]): [number, number] => [
    X0 + (px / total) * run + s.lean * py * s.tall,
    BASE - py * s.tall,
  ];
  const p = pts.map(place);
  p[p.length - 1] = END;
  const k = s.round / 2.2;
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[i];
    const c = p[i + 1];
    const e = p[Math.min(p.length - 1, i + 2)];
    const c1 = [b[0] + (c[0] - a[0]) * k, b[1] + (c[1] - a[1]) * k];
    const c2 = [c[0] - (e[0] - b[0]) * k, c[1] - (e[1] - b[1]) * k];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return d;
}
