// A restricted regression, `a+b\sim115\left\{a>0\right\}` (REGRESSION-15, live Desmos 2026-10-28).
// The model is undefined where the restriction fails. Desmos searches only the parameters the
// restriction reads and solves the others exactly (multi-start-fit.ts); it starts from 1, and when
// 1 breaks the restriction it moves each restricted parameter one inside its constant limit (a
// lower limit L gives L + 1, an upper limit U gives U − 1, both give their middle) and sets every
// other parameter to 0. Pure TypeScript: no DOM.

export interface Restriction {
  params: number[]; // indices, in the fit's parameter order, of the parameters the restriction reads
  // per parameter, its constant limits (`a>1` is lo 1, `115>a` is hi 115), null where it has none
  bounds: { lo: number | null; hi: number | null }[];
  // the model with the restriction left off: which parameters are linear is decided on it (so
  // `ab\sim6\left\{a>0\right\}` searches both, as `ab` searches b only when a is free)
  unrestricted?: (p: Float64Array, i: number) => number;
}

/** The start of a restricted fit: all 1 when the model is defined there, else moved inside. */
export function restrictedStart(
  model: (p: Float64Array, i: number) => number,
  n: number,
  k: number,
  restriction: Restriction
): number[] {
  const ones = new Array<number>(k).fill(1);
  const defined = (p: number[]) => {
    const q = Float64Array.from(p);
    for (let i = 0; i < n; i++) if (!Number.isFinite(model(q, i))) return false;
    return true;
  };
  if (defined(ones)) return ones;
  const moved = new Array<number>(k).fill(0);
  for (const j of restriction.params) {
    const { lo, hi } = restriction.bounds[j];
    moved[j] =
      lo !== null && hi !== null ? (lo + hi) / 2 : lo !== null ? lo + 1 : hi !== null ? hi - 1 : 1;
  }
  return defined(moved) ? moved : ones;
}
