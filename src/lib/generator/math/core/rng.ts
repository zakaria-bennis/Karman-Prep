/*
 * The generator's only source of chance. Every Math question is a pure function of
 * (template id, seed): the same pair always draws the same numbers, so a question can be
 * rebuilt at any time from the two values stored with it (quiz_questions.generator).
 *
 * xmur3 turns the text "<template>#<seed>#<attempt>" into a 32-bit state; sfc32 draws from it.
 * Both are small, public-domain, well-tested generators; nothing here is cryptographic.
 */

function xmur3(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer from lo to hi, both included. */
  int(lo: number, hi: number): number;
  /** A nonzero integer from lo to hi, both included. */
  nonzero(lo: number, hi: number): number;
  /** One item of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** k different items of a list, in random order. */
  sample<T>(items: readonly T[], k: number): T[];
  /** A shuffled copy of a list. */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p (default one half). */
  bool(p?: number): boolean;
  /** 1 or -1. */
  sign(): 1 | -1;
}

export function makeRng(text: string): Rng {
  const seed = xmur3(text);
  const draw = sfc32(seed(), seed(), seed(), seed());
  // Warm up: the first outputs of sfc32 from a fresh state are weakly mixed.
  for (let i = 0; i < 12; i++) draw();
  const int = (lo: number, hi: number) => {
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
      throw new RangeError(`rng.int needs integers lo <= hi, got ${lo}, ${hi}`);
    }
    return lo + Math.floor(draw() * (hi - lo + 1));
  };
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(draw() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return {
    next: draw,
    int,
    nonzero(lo, hi) {
      if (lo > 0 || hi < 0) return int(lo, hi);
      if (lo === 0 && hi === 0) throw new RangeError("rng.nonzero needs a range with a nonzero");
      for (;;) {
        const v = int(lo, hi);
        if (v !== 0) return v;
      }
    },
    pick(items) {
      if (items.length === 0) throw new RangeError("rng.pick needs a non-empty list");
      return items[Math.floor(draw() * items.length)];
    },
    sample(items, k) {
      if (k > items.length) throw new RangeError("rng.sample asks for more items than exist");
      return shuffle(items).slice(0, k);
    },
    shuffle,
    bool(p = 0.5) {
      return draw() < p;
    },
    sign() {
      return draw() < 0.5 ? 1 : -1;
    },
  };
}

/** The random draws for one attempt at one question. */
export function rngFor(templateId: string, seed: number, attempt = 0): Rng {
  return makeRng(`${templateId}#${seed}#${attempt}`);
}
