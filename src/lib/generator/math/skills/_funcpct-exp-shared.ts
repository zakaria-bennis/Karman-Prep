/*
 * Contexts and small helpers shared by the exponential-functions templates.
 */
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { int } from "../core/tex";
import { dn } from "./_funcpct-common";

export interface Model {
  /** The quantity, as a noun phrase: "the estimated number of sea lions in a bay". */
  q: string;
  unit: string;
  units: string;
  /** The moment t = 0: "the study began". */
  start: string;
  grow: boolean;
}

export const MODELS: Model[] = [
  {
    q: "the estimated number of sea lions in a bay",
    unit: "year",
    units: "years",
    start: "the study began",
    grow: true,
  },
  {
    q: "the number of bacteria in a sample",
    unit: "hour",
    units: "hours",
    start: "the sample was first measured",
    grow: true,
  },
  {
    q: "the number of subscribers to a newsletter",
    unit: "month",
    units: "months",
    start: "the newsletter launched",
    grow: true,
  },
  {
    q: "the area, in square centimeters, covered by mold on a slice of bread",
    unit: "day",
    units: "days",
    start: "the mold was first observed",
    grow: true,
  },
  {
    q: "the number of students at a school who have heard a rumor",
    unit: "day",
    units: "days",
    start: "the rumor started",
    grow: true,
  },
  {
    q: "the balance, in dollars, of a savings account",
    unit: "year",
    units: "years",
    start: "the account was opened",
    grow: true,
  },
  {
    q: "the estimated value, in dollars, of a used tractor",
    unit: "year",
    units: "years",
    start: "the tractor was bought",
    grow: false,
  },
  {
    q: "the mass, in grams, of a radioactive sample",
    unit: "day",
    units: "days",
    start: "the experiment began",
    grow: false,
  },
  {
    q: "the amount, in milligrams, of a medicine in a patient's body",
    unit: "hour",
    units: "hours",
    start: "the dose was given",
    grow: false,
  },
  {
    q: "the number of fish in a pond with a spreading disease",
    unit: "week",
    units: "weeks",
    start: "the count began",
    grow: false,
  },
  {
    q: "the brightness, in lumens, of a fading glow stick",
    unit: "hour",
    units: "hours",
    start: "the glow stick was snapped",
    grow: false,
  },
];

export const GROW = [2, 3, 1.5, 1.2, 1.1, 1.25, 1.04, 1.06, 1.08, 1.05, 1.03, 1.15, 1.4, 1.02];
export const DECAY = [0.5, 0.8, 0.9, 0.75, 0.6, 0.95, 0.85, 0.7, 0.4, 0.96, 0.92, 0.3];

/** The factor as it is printed in a formula: 2, 0.5, 1.06. */
export const fac = (b: Frac) => dn(b);

/** A starting amount that makes a times b^k a whole number. */
export function startFor(rng: Rng, b: Frac, k: number, lo: number, hi: number): Frac {
  const d = b.d ** k;
  const jlo = Math.ceil(lo / d);
  const jhi = Math.floor(hi / d);
  if (jlo > jhi) throw new RangeError("no start in range");
  return F(d * rng.int(jlo, jhi));
}

/** "f(t) = 1{,}200(1.06)^{t}" as LaTeX, from its parts; exponent is LaTeX. */
export function model(name: string, v: string, a: Frac, b: Frac, exponent: string): string {
  return `${name}(${v}) = ${int(a.n)}(${fac(b)})^{${exponent}}`;
}
