/*
 * The portals' endless world (founder, 2026-11-14): "auto-generated ... endless and forever", many lands
 * that "smoothly transition from one to another", like flying over a Minecraft world in creative mode.
 *
 * Each land is one row of numbers below. The route is cut into stretches; each stretch is one land,
 * chosen by a fixed shuffle so the world is the same for everybody and never ends, and near the end of a
 * stretch its numbers slide into the next land's. The shader (world-glsl.ts) reads those numbers from a
 * small table of the route just ahead, which strip() fills.
 *
 * Colours are the ground's own colour in plain light, red green blue, each from 0 to 1.
 */
type RGB = [number, number, number];

export interface Land {
  name: string;
  /** How tall the mountains are, 0 to 1.5. */
  amp: number;
  /** Half the width of the valley floor, 0 to 2. */
  width: number;
  /** How high the valley floor lies, -0.25 to 0.25. Below 0 it is under water. */
  lift: number;
  /** How much the valley floor rises and falls, 0 to 0.5. */
  floor: number;
  /** Steps in the land (mesas, cliffs, terraced fields), sand dunes, soft rolling swells, and towers of
   *  rock or islands: each 0 to 1. */
  terrace: number;
  dunes: number;
  roll: number;
  karst: number;
  /** The height where trees stop (0 to 1.2) and where snow starts (0 to 1.5). */
  treeLine: number;
  snowLine: number;
  /** How thick the trees stand (0 to 1) and their kind: 0 pine, 0.5 round crowns, 1 bamboo. */
  trees: number;
  kind: number;
  grass: RGB;
  /** How much of the grass is in flower, 0 to 1, and the two petal colours. */
  flowers: number;
  petalA: RGB;
  petalB: RGB;
  /** The forest's dark and light colours, and how much of the level ground is open grass (0 to 1). */
  forest: RGB;
  forest2: RGB;
  meadow: number;
  /** How many villages, 0 to 1. */
  towns: number;
  rock: RGB;
  /** How much of the level ground is sand (0 to 1), and the sand's colour (also the beaches and the bed). */
  sand: number;
  sandCol: RGB;
  /** Coral under the shallows (0 to 1), the colour of shallow water, and how far down the eye sees (0 to 1). */
  reef: number;
  shallow: RGB;
  clear: number;
  /** Frozen water and falling snow (0 to 1), and mist lying on the ground (0 to 1). */
  ice: number;
  mist: number;
}

const BASE: Land = {
  name: "",
  amp: 0.8,
  width: 0.9,
  lift: 0.02,
  floor: 0.2,
  terrace: 0,
  dunes: 0,
  roll: 0,
  karst: 0,
  treeLine: 0.6,
  snowLine: 0.85,
  trees: 0.72,
  kind: 0,
  grass: [0.1, 0.17, 0.045],
  flowers: 0.25,
  petalA: [0.72, 0.24, 0.4],
  petalB: [0.86, 0.7, 0.18],
  forest: [0.02, 0.07, 0.03],
  forest2: [0.08, 0.15, 0.04],
  meadow: 0,
  towns: 0.4,
  rock: [0.2, 0.18, 0.16],
  sand: 0,
  sandCol: [0.36, 0.31, 0.22],
  reef: 0,
  shallow: [0.05, 0.2, 0.19],
  clear: 0,
  ice: 0,
  mist: 0,
};
const land = (name: string, over: Partial<Land>): Land => ({ ...BASE, ...over, name });

export const LANDS: Land[] = [
  land("fjord", { amp: 1.25, width: 0.9, lift: -0.1, floor: 0.06, treeLine: 0.55, snowLine: 0.74 }),
  land("alpine-valley", {
    amp: 1.3,
    width: 0.7,
    lift: 0.06,
    floor: 0.25,
    treeLine: 0.66,
    snowLine: 0.82,
    meadow: 0.5,
    flowers: 0.45,
    towns: 0.6,
  }),
  land("green-hills", {
    amp: 0.5,
    width: 1.0,
    lift: 0.03,
    floor: 0.45,
    roll: 1,
    treeLine: 0.5,
    snowLine: 1.5,
    trees: 0.3,
    kind: 0.5,
    meadow: 1,
    flowers: 0.3,
    towns: 0.9,
    grass: [0.11, 0.2, 0.045],
  }),
  land("flower-fields", {
    amp: 0.36,
    width: 1.2,
    lift: 0.035,
    floor: 0.5,
    roll: 1,
    snowLine: 1.5,
    trees: 0.12,
    kind: 0.5,
    meadow: 1,
    flowers: 1,
    petalA: [0.9, 0.2, 0.36],
    petalB: [0.95, 0.74, 0.1],
    towns: 0.5,
    grass: [0.12, 0.21, 0.05],
  }),
  land("pine-forest", {
    amp: 0.62,
    width: 0.8,
    lift: 0.03,
    floor: 0.35,
    treeLine: 0.9,
    snowLine: 1.1,
    trees: 1,
    flowers: 0.1,
    towns: 0.25,
    mist: 0.35,
  }),
  land("autumn-forest", {
    amp: 0.5,
    width: 1,
    lift: 0.02,
    floor: 0.4,
    roll: 0.5,
    treeLine: 0.9,
    snowLine: 1.5,
    trees: 0.95,
    kind: 0.5,
    forest: [0.2, 0.05, 0.02],
    forest2: [0.5, 0.3, 0.04],
    grass: [0.2, 0.17, 0.05],
    flowers: 0.1,
    towns: 0.5,
  }),
  land("blossom-grove", {
    amp: 0.4,
    width: 1.1,
    lift: 0.025,
    floor: 0.4,
    roll: 0.8,
    treeLine: 0.8,
    snowLine: 1.5,
    trees: 0.8,
    kind: 0.5,
    forest: [0.5, 0.2, 0.3],
    forest2: [0.78, 0.5, 0.6],
    meadow: 0.3,
    grass: [0.1, 0.2, 0.06],
    flowers: 0.15,
    petalA: [0.9, 0.5, 0.6],
    petalB: [0.9, 0.84, 0.86],
    towns: 0.7,
  }),
  land("bamboo-forest", {
    amp: 0.55,
    width: 0.7,
    lift: 0.02,
    floor: 0.4,
    roll: 0.4,
    karst: 0.25,
    treeLine: 1,
    snowLine: 1.5,
    trees: 1,
    kind: 1,
    forest: [0.05, 0.16, 0.04],
    forest2: [0.2, 0.36, 0.08],
    grass: [0.09, 0.19, 0.05],
    flowers: 0,
    towns: 0.35,
    mist: 0.6,
  }),
  land("ocean-islands", {
    amp: 0.5,
    width: 1.9,
    lift: -0.2,
    floor: 0,
    karst: 0.75,
    roll: 0.4,
    treeLine: 0.6,
    snowLine: 1.5,
    trees: 0.6,
    kind: 0.5,
    sand: 0.2,
    towns: 0.3,
    shallow: [0.04, 0.24, 0.26],
    clear: 0.3,
  }),
  land("lagoon", {
    amp: 0.34,
    width: 1.2,
    lift: -0.06,
    floor: 0.12,
    roll: 0.9,
    treeLine: 0.5,
    snowLine: 1.5,
    trees: 0.5,
    kind: 0.5,
    forest: [0.03, 0.12, 0.04],
    forest2: [0.14, 0.3, 0.06],
    sand: 0.5,
    sandCol: [0.62, 0.55, 0.4],
    shallow: [0.06, 0.42, 0.38],
    clear: 1,
    flowers: 0.1,
    towns: 0.3,
  }),
  land("reef", {
    amp: 0.2,
    width: 1.6,
    lift: -0.07,
    floor: 0.3,
    roll: 1,
    snowLine: 1.5,
    trees: 0.3,
    kind: 0.5,
    sand: 0.6,
    sandCol: [0.64, 0.58, 0.44],
    reef: 1,
    shallow: [0.07, 0.44, 0.42],
    clear: 1,
    towns: 0,
  }),
  land("sheer-cliffs", {
    amp: 0.7,
    width: 0.5,
    lift: -0.1,
    floor: 0,
    terrace: 0.9,
    roll: 0.6,
    treeLine: 0.3,
    snowLine: 1.5,
    trees: 0.15,
    kind: 0.5,
    meadow: 1,
    grass: [0.1, 0.21, 0.05],
    flowers: 0.2,
    rock: [0.17, 0.165, 0.16],
    towns: 0.2,
    shallow: [0.03, 0.17, 0.2],
  }),
  land("karst-bay", {
    amp: 0.35,
    width: 1.6,
    lift: -0.12,
    floor: 0,
    karst: 1,
    treeLine: 1,
    snowLine: 1.5,
    trees: 0.9,
    kind: 0.5,
    forest: [0.03, 0.11, 0.04],
    forest2: [0.12, 0.26, 0.07],
    rock: [0.18, 0.18, 0.17],
    shallow: [0.05, 0.24, 0.2],
    clear: 0.4,
    towns: 0.2,
    mist: 0.5,
  }),
  land("desert-dunes", {
    amp: 0.5,
    width: 1.2,
    lift: 0.05,
    floor: 0.5,
    dunes: 1,
    roll: 0.9,
    treeLine: 0,
    snowLine: 1.5,
    trees: 0,
    sand: 1,
    sandCol: [0.6, 0.4, 0.2],
    rock: [0.36, 0.2, 0.11],
    flowers: 0,
    towns: 0.15,
  }),
  land("canyon", {
    amp: 0.8,
    width: 0.22,
    lift: -0.015,
    floor: 0.1,
    terrace: 1,
    treeLine: 0.12,
    snowLine: 1.5,
    trees: 0.25,
    kind: 0.5,
    rock: [0.42, 0.17, 0.085],
    sand: 0,
    sandCol: [0.5, 0.3, 0.17],
    flowers: 0,
    towns: 0.1,
    shallow: [0.07, 0.22, 0.17],
  }),
  land("snow-and-ice", {
    amp: 0.5,
    width: 1.2,
    lift: -0.03,
    floor: 0.3,
    roll: 0.6,
    treeLine: 0.5,
    snowLine: 0,
    trees: 0.35,
    flowers: 0,
    towns: 0.3,
    ice: 1,
    rock: [0.16, 0.17, 0.19],
  }),
  land("savanna", {
    amp: 0.32,
    width: 1.3,
    lift: 0.04,
    floor: 0.5,
    roll: 1,
    treeLine: 0.5,
    snowLine: 1.5,
    trees: 0.1,
    kind: 0.5,
    meadow: 1,
    grass: [0.3, 0.24, 0.08],
    forest: [0.05, 0.1, 0.03],
    forest2: [0.16, 0.22, 0.06],
    flowers: 0,
    rock: [0.26, 0.19, 0.13],
    towns: 0.15,
  }),
  land("wetlands", {
    amp: 0.26,
    width: 1.5,
    lift: -0.06,
    floor: 0.5,
    roll: 1,
    treeLine: 0.5,
    snowLine: 1.5,
    trees: 0.3,
    kind: 0.5,
    meadow: 1,
    grass: [0.12, 0.18, 0.06],
    flowers: 0.08,
    petalA: [0.9, 0.86, 0.8],
    petalB: [0.86, 0.5, 0.66],
    shallow: [0.06, 0.15, 0.1],
    towns: 0.2,
    mist: 0.8,
  }),
  land("rice-terraces", {
    amp: 0.5,
    width: 0.5,
    lift: 0.02,
    floor: 0.5,
    roll: 1,
    terrace: 0.7,
    treeLine: 0.9,
    snowLine: 1.5,
    trees: 0.25,
    kind: 0.5,
    meadow: 1,
    grass: [0.14, 0.26, 0.05],
    flowers: 0,
    towns: 0.8,
    mist: 0.4,
  }),
  land("lavender-fields", {
    amp: 0.4,
    width: 1.1,
    lift: 0.03,
    floor: 0.45,
    roll: 1,
    treeLine: 0.5,
    snowLine: 1.5,
    trees: 0.15,
    kind: 0.5,
    meadow: 1,
    grass: [0.13, 0.17, 0.07],
    flowers: 0.9,
    petalA: [0.36, 0.22, 0.62],
    petalB: [0.5, 0.3, 0.72],
    towns: 0.6,
  }),
  land("glacier-peaks", {
    amp: 1.45,
    width: 0.6,
    lift: 0.0,
    floor: 0.2,
    treeLine: 0.14,
    snowLine: 0.16,
    trees: 0.3,
    flowers: 0,
    towns: 0.1,
    ice: 0.8,
    shallow: [0.14, 0.32, 0.34],
    clear: 0.5,
  }),
];

/** How long one land lasts along the route, and how much of its end blends into the next. */
export const STRETCH = 4;
const BLEND = 1.6;
/** The table: columns along the route, how many per unit of distance, and how far behind the camera it starts. */
export const COLS = 128;
export const PER_UNIT = 4;
export const BEHIND = 6;
const ROWS = 16;
/** The shader's own distance starts again after this far, so its numbers stay exact. */
export const WRAP = 128;

const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** The order of the lands in the round numbered `round`: every land once, shuffled its own way. */
const rounds = new Map<number, number[]>();
function order(round: number, count: number): number[] {
  const key = round * 1000 + count;
  let o = rounds.get(key);
  if (!o) {
    o = Array.from({ length: count }, (_, k) => k);
    for (let k = count - 1; k > 0; k--) {
      const j = Math.floor(hash(round * 7919 + k) * (k + 1));
      [o[k], o[j]] = [o[j], o[k]];
    }
    if (rounds.size > 64) rounds.clear();
    rounds.set(key, o);
  }
  return o;
}
/** Which land the stretch numbered i is. Every land comes round before any repeats, and never the same
 *  land twice running. */
export function landIndex(i: number, count = LANDS.length): number {
  const round = Math.floor(i / count);
  const at = i - round * count;
  const o = order(round, count);
  if (count < 3) return o[at];
  /* where two rounds meet, the first two of the new round change places if the join would repeat */
  const last = order(round - 1, count)[count - 1];
  if (o[0] === last && at < 2) return o[1 - at];
  return o[at];
}

const FIELDS: (keyof Land)[][] = [
  ["amp", "width", "lift", "floor"],
  ["terrace", "dunes", "roll", "karst"],
  ["treeLine", "snowLine", "trees", "kind"],
];
const SCALE: Partial<Record<keyof Land, (v: number) => number>> = {
  amp: (v) => v / 1.5,
  width: (v) => v / 2,
  lift: (v) => (v + 0.25) * 2,
  floor: (v) => v * 2,
  treeLine: (v) => v / 1.2,
  snowLine: (v) => v / 1.5,
};
/** One land as the table's numbers (0 to 1), row after row, four to a row. */
function numbers(l: Land): number[] {
  const out: number[] = [];
  for (const row of FIELDS)
    for (const k of row) out.push((SCALE[k]?.(l[k] as number) ?? l[k]) as number);
  const rgb = (c: RGB, a: number) => out.push(c[0], c[1], c[2], a);
  rgb(l.grass, l.flowers);
  rgb(l.forest, l.meadow);
  rgb(l.forest2, l.towns);
  rgb(l.rock, l.sand);
  rgb(l.sandCol, l.reef);
  rgb(l.shallow, l.clear);
  rgb(l.petalA, l.ice);
  rgb(l.petalB, l.mist);
  return out;
}
const TABLE = LANDS.map(numbers);
const smooth = (t: number) => t * t * (3 - 2 * t);

/** The land's numbers at a distance d along the endless route. `only` holds one land everywhere. */
export function landAt(d: number, only?: number): number[] {
  if (only !== undefined) return TABLE[only];
  const i = Math.floor(d / STRETCH);
  const into = d - i * STRETCH;
  const a = TABLE[landIndex(i)];
  if (into <= STRETCH - BLEND) return a;
  const b = TABLE[landIndex(i + 1)];
  const t = smooth((into - (STRETCH - BLEND)) / BLEND);
  return a.map((v, k) => v + (b[k] - v) * t);
}

/** The table for the route from `start` on: COLS columns, ROWS rows, four bytes each. */
export function strip(start: number, only?: number): Uint8Array {
  const data = new Uint8Array(COLS * ROWS * 4);
  for (let c = 0; c < COLS; c++) {
    const v = landAt(start + c / PER_UNIT, only);
    for (let k = 0; k < v.length; k++) {
      const row = k >> 2;
      data[(row * COLS + c) * 4 + (k & 3)] = Math.round(Math.min(1, Math.max(0, v[k])) * 255);
    }
  }
  return data;
}
export const STRIP_ROWS = ROWS;

/** How fast the camera drifts, in units of distance a second: a new land about every two minutes. */
export const DRIFT = 0.03;
/** How long the sky takes to settle after the portal opens (founder, 2026-11-14: twenty minutes). */
export const SETTLE_MS = 20 * 60_000;

/**
 * Where the sun is (founder, 2026-11-14): light mode opens at dawn and is full day twenty minutes later;
 * dark mode opens late in the sunset and is full night twenty minutes later. `t` runs 0 to 1 over that
 * time. Returns how high the sun is and which way it lies, both in degrees.
 */
export function sunAt(dark: boolean, t: number): [number, number] {
  const e = smooth(Math.min(1, Math.max(0, t)));
  return dark ? [2.5 - 30.5 * e, 8 + 20 * e] : [1.5 + 26.5 * e, -30 + 26 * e];
}
