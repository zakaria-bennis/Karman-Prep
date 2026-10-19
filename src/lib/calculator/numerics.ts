/** Find visible scalar roots, including tangent roots, without crossing poles. */
export function roots(fn: (x: number) => number, lo: number, hi: number): number[] {
  const result: number[] = [];
  if (!(hi > lo)) return result;
  const add = (x: number) => {
    if (
      Number.isFinite(x) &&
      x >= lo &&
      x <= hi &&
      Math.abs(fn(x)) < 1e-7 &&
      !result.some((v) => Math.abs(v - x) < 1e-5 * (1 + Math.abs(x)))
    )
      result.push(x);
  };
  const count = 512,
    step = (hi - lo) / count;
  let x = lo,
    y = fn(x);
  add(x);
  for (let i = 1; i <= count; i++) {
    const next = lo + i * step,
      v = fn(next);
    if (Number.isFinite(y) && Number.isFinite(v) && y * v < 0) {
      let a = x,
        b = next,
        fa = y;
      for (let k = 0; k < 45; k++) {
        const m = (a + b) / 2,
          fm = fn(m);
        if (fa * fm <= 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      add((a + b) / 2);
    }
    if (i % 4 === 0 && Number.isFinite(v)) {
      let p = next;
      for (let k = 0; k < 40; k++) {
        const h = 1e-5 * (1 + Math.abs(p)),
          f = fn(p),
          d = (fn(p + h) - fn(p - h)) / (2 * h);
        if (!Number.isFinite(d) || Math.abs(d) < 1e-12) break;
        const n = p - f / d;
        if (n < lo || n > hi) break;
        p = n;
      }
      add(p);
    }
    x = next;
    y = v;
  }
  return result.sort((a, b) => a - b);
}
export function derivative(fn: (x: number) => number, x: number): number {
  const h = 1e-4 * (1 + Math.abs(x));
  return (fn(x + h) - fn(x - h)) / (2 * h);
}
