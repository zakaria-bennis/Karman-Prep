/*
 * Life in Karman's paintings once they are finished. Positions are in picture units
 * (0 to 1 across and down the painting). Ported from prototypes/today-directions/life.js.
 */
import type { TimeOfDay } from "../light";

export interface Item {
  kind: string;
  a: number[];
  parts: unknown[];
  clock: number;
}

export interface LifeState {
  scene: number;
  time: TimeOfDay;
  items: Item[];
  birdsAt: number;
  ringsAt: number;
}

export interface LifeCtx {
  g: CanvasRenderingContext2D;
  dt: number;
  t: number;
  X: (u: number) => number;
  Y: (v: number) => number;
  S: number;
  /** Silhouette ink: dark by day, a little lifted by night so it still reads against the sky. */
  ink: string;
  night: boolean;
  time: TimeOfDay;
  state: LifeState;
}

export type Drawer = (it: Item, c: LifeCtx) => void;

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const TAU = 6.283;

/** What lives in each of the ten landscapes, in order. Each kind only appears at fitting hours. */
export const LIFE_SCENES: [string, ...number[]][][] = [
  [
    ["birds", 0.1, 0.42],
    ["hawk", 0.62, 0.2],
    ["ducks", 0.3, 0.95, 0.7, 0.86],
    ["fishJump", 0.3, 0.9, 0.66, 0.85],
    ["glints", 0.3, 1, 0.63, 0.88],
    ["rings", 0.3, 0.95, 0.66, 0.86],
    ["moonpath", 0.8, 0.63, 0.9],
    ["owl", 0.808, 0.62, 1],
    ["bats", 0.2, 0.9, 0.1, 0.4],
    ["shootingStar"],
    ["fireflies", 0.55, 1, 0.86, 1],
  ],
  [
    ["birds", 0.08, 0.38],
    ["geese", 0.12, 0.3],
    ["hawk", 0.5, 0.18],
    ["swallows", 0.3, 1, 0.6, 0.8],
    ["deer", 0.25, 0.72, 0.86],
    ["mist", 0.52, 0.7],
    ["glints", 0.5, 0.66, 0.7, 1],
    ["butterflies", 0.3, 0.8, 0.84, 0.98],
    ["owl", 0.85, 0.64, 1],
    ["bats", 0.2, 0.9, 0.1, 0.4],
    ["shootingStar"],
    ["fireflies", 0.3, 1, 0.84, 1],
  ],
  [
    ["smoke", 0.716, 0.655],
    ["windowGlow", 0.688, 0.757],
    ["snow"],
    ["birds", 0.08, 0.3],
    ["fox", 0.05, 0.6, 0.9],
    ["aurora"],
    ["owl", 0.815, 0.6, 1],
    ["shootingStar"],
  ],
  [
    ["leaves", 0.8, 0.93, 0.5, 0.75],
    ["geese", 0.1, 0.3],
    ["ducks", 0.2, 0.8, 0.68, 0.86],
    ["fishJump", 0.2, 0.8, 0.66, 0.85],
    ["glints", 0.2, 1, 0.61, 0.92],
    ["rings", 0.2, 0.8, 0.64, 0.88],
    ["birds", 0.1, 0.35],
    ["moonpath", 0.8, 0.61, 0.92],
    ["owl", 0.875, 0.6, -1],
    ["bats", 0.2, 0.9, 0.1, 0.4],
  ],
  [
    ["waves", 0, 0.62, 0.68, 0.87],
    ["glints", 0, 1, 0.54, 0.68],
    ["gulls", 0.1, 0.45],
    ["sailboat", 0.05, 0.55, 0.55],
    ["moonpath", 0.8, 0.53, 0.86],
    ["shootingStar"],
    ["bats", 0.2, 0.7, 0.1, 0.35],
  ],
  [
    ["birds", 0.08, 0.4],
    ["swallows", 0.2, 1, 0.6, 0.8],
    ["deer", 0.15, 0.6, 0.86],
    ["butterflies", 0.3, 1, 0.8, 0.98],
    ["owl", 0.832, 0.5, 1],
    ["bats", 0.2, 0.9, 0.1, 0.4],
    ["shootingStar"],
    ["fireflies", 0, 1, 0.78, 1],
  ],
  [
    ["birds", 0.08, 0.3],
    ["fall", 0.645, 0.695, 0.36, 0.78],
    ["spray", 0.67, 0.785],
    ["glints", 0.3, 1, 0.8, 1],
    ["mist", 0.45, 0.55],
    ["heron", 0.36, 0.9],
    ["owl", 0.56, 0.7, 1],
    ["bats", 0.2, 0.9, 0.1, 0.35],
  ],
  [
    ["birds", 0.06, 0.3],
    ["hawk", 0.42, 0.16],
    ["geese", 0.08, 0.25],
    ["ducks", 0.25, 0.85, 0.7, 0.86],
    ["sailboat", 0.15, 0.6, 0.63],
    ["glints", 0.2, 1, 0.61, 0.9],
    ["rings", 0.2, 0.9, 0.64, 0.88],
    ["moonpath", 0.8, 0.61, 0.9],
    ["shootingStar"],
  ],
  [
    ["birds", 0.1, 0.4],
    ["heron", 0.6, 0.86],
    ["dragonflies", 0.3, 0.9, 0.72, 0.9],
    ["ducks", 0.1, 0.6, 0.68, 0.8],
    ["glints", 0, 1, 0.64, 0.82],
    ["butterflies", 0.4, 1, 0.84, 0.98],
    ["moonpath", 0.8, 0.64, 0.82],
    ["owl", 0.823, 0.4, -1],
    ["bats", 0.2, 0.9, 0.1, 0.4],
    ["fireflies", 0.3, 1, 0.8, 1],
  ],
  [
    ["birds", 0.08, 0.35],
    ["hawk", 0.55, 0.16],
    ["deer", 0.55, 0.62, 0.78],
    ["mist", 0.5, 0.6],
    ["butterflies", 0.45, 0.75, 0.75, 0.98],
    ["owl", 0.792, 0.62, -1],
    ["bats", 0.2, 0.9, 0.1, 0.4],
    ["shootingStar"],
    ["fireflies", 0, 1, 0.65, 1],
  ],
];

/** The hours each kind appears at. Kinds not listed appear at every hour. */
export const WHEN: Record<string, TimeOfDay[]> = {
  birds: ["dawn", "day", "sunset"],
  hawk: ["day", "dawn"],
  geese: ["dawn", "sunset"],
  gulls: ["dawn", "day", "sunset"],
  ducks: ["dawn", "day", "sunset"],
  deer: ["dawn", "sunset", "day"],
  swallows: ["sunset", "dawn"],
  sailboat: ["day", "sunset"],
  heron: ["dawn", "day"],
  dragonflies: ["day"],
  butterflies: ["dawn", "day", "sunset"],
  fishJump: ["dawn", "day", "sunset"],
  owl: ["night"],
  bats: ["sunset", "night"],
  shootingStar: ["night"],
  moonpath: ["night"],
  aurora: ["night"],
  fox: ["night", "dawn"],
  fireflies: ["night", "sunset"],
};
