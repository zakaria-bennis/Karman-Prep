// random and shuffle, as Desmos evaluates them (captured 2026-10-20): `random()` is a number in
// [0, 1); `random(n)` a list of round(n) of them, `random(n, s)` the same with seed s; `random(L)`
// one element of L and `random(L, n)` n elements drawn with replacement (undefined from an empty
// list); `shuffle(L)` and `shuffle(L, s)` a permutation of L. A sample size that is negative or
// not finite is Desmos's "Sample size must be a finite, non-negative number."; more than 10,000
// is `list-too-long`. Values come from a seeded generator keyed by the call and its seed, so a
// row keeps its values every time it is evaluated (Desmos keeps them until re-randomized). A
// distribution's samples have not shipped and are undefined. Pure TypeScript: no DOM (AR-44).

import { ListError, makeList, MAX_LIST_ELEMENTS } from "./lists";
import { numberValue, UNDEFINED, type Value } from "./values";

/** A 32-bit hash of a string (FNV-1a). */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: numbers in [0, 1) from a 32-bit seed. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleSize(v: Value): number {
  const n = v.type === "number" ? v.value : NaN;
  if (!Number.isFinite(n) || n < 0) throw new ListError("sample-size");
  const count = Math.round(n);
  if (count > MAX_LIST_ELEMENTS) throw new ListError("list-too-long");
  return count;
}

const seedOf = (key: number, v: Value | undefined) =>
  v === undefined ? key : hashText(`${key}:${v.type === "number" ? v.value : NaN}`);

/** `random(…)` with evaluated `args`; `key` identifies the call. */
export function randomValue(args: readonly Value[], key: number): Value {
  const [first, second, third] = args;
  if (first === undefined) return numberValue(generator(key)());
  if (first.type === "distribution") return UNDEFINED;
  if (first.type === "list") {
    const next = generator(seedOf(key, third));
    const pick = () => {
      const k = Math.floor(next() * first.value.length);
      return first.value.length === 0 ? UNDEFINED : first.value[k];
    };
    if (second === undefined) return pick();
    return makeList(Array.from({ length: sampleSize(second) }, pick));
  }
  const count = sampleSize(first);
  const next = generator(seedOf(key, second));
  return makeList(Array.from({ length: count }, () => numberValue(next())));
}

/** `shuffle(L)` or `shuffle(L, s)`; anything but a list is undefined (analysis reports it). */
export function shuffleValue(args: readonly Value[], key: number): Value {
  const [list, seed] = args;
  if (list === undefined || list.type !== "list") return UNDEFINED;
  const next = generator(seedOf(key, seed));
  const items = [...list.value];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return { type: "list", value: items };
}
