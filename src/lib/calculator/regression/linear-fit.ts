// Models linear in their parameters (RT-17, REG-MODELS-12): least squares min ‖A·p − y‖ by
// Householder QR taken in column order. A column that is (numerically) a combination of the
// columns before it gets no pivot and its parameter is 0, which is what exact Gauss–Jordan on the
// normal equations does: owner cubic d = 0, two points quadratic `-0.5x²+3.5x+0`. Not a minimum-
// norm solution. Two refinement steps follow, as the reference's two Gauss–Newton steps from 0.
// Pure TypeScript: no DOM.

/** Remaining column norm, relative to the column's own norm, under which it has no pivot. */
const RANK_TOLERANCE = 1e-10;

/** p for `rows` × `cols` row-major `a` and right side `y`; every entry must be finite. */
export function solveColumnOrder(
  a: ArrayLike<number>,
  rows: number,
  cols: number,
  y: ArrayLike<number>
): Float64Array {
  const p = solveOnce(a, rows, cols, y);
  for (let step = 0; step < 2; step++) {
    const r = Float64Array.from({ length: rows }, (_, i) => {
      let s = y[i];
      for (let j = 0; j < cols; j++) s -= a[i * cols + j] * p[j];
      return s;
    });
    const dp = solveOnce(a, rows, cols, r);
    if (!dp.every(Number.isFinite)) break;
    for (let j = 0; j < cols; j++) p[j] += dp[j];
  }
  return p;
}

function solveOnce(
  a: ArrayLike<number>,
  rows: number,
  cols: number,
  y: ArrayLike<number>
): Float64Array {
  // Columns scaled to unit norm, so the rank test is relative to each column.
  const scale = new Float64Array(cols);
  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < rows; i++) s += a[i * cols + j] ** 2;
    scale[j] = s > 0 ? Math.sqrt(s) : 0;
  }
  const w = new Float64Array(rows * cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) w[i * cols + j] = scale[j] > 0 ? a[i * cols + j] / scale[j] : 0;
  }
  const b = Float64Array.from(y);
  const pivots: number[] = []; // pivot column of each reflected row k
  let k = 0;
  for (let j = 0; j < cols && k < rows; j++) {
    if (scale[j] === 0) continue;
    let norm = 0;
    for (let i = k; i < rows; i++) norm += w[i * cols + j] ** 2;
    norm = Math.sqrt(norm);
    if (norm <= RANK_TOLERANCE) continue; // dependent on earlier columns: free, 0
    // Householder reflector zeroing column j below row k.
    const alpha = w[k * cols + j] > 0 ? -norm : norm;
    const v = new Float64Array(rows - k);
    for (let i = k; i < rows; i++) v[i - k] = w[i * cols + j];
    v[0] -= alpha;
    let vv = 0;
    for (const t of v) vv += t * t;
    if (vv === 0) {
      pivots.push(j);
      k++;
      continue;
    }
    for (let c = j; c < cols; c++) {
      let dot = 0;
      for (let i = k; i < rows; i++) dot += v[i - k] * w[i * cols + c];
      const f = (2 * dot) / vv;
      for (let i = k; i < rows; i++) w[i * cols + c] -= f * v[i - k];
    }
    let dot = 0;
    for (let i = k; i < rows; i++) dot += v[i - k] * b[i];
    const f = (2 * dot) / vv;
    for (let i = k; i < rows; i++) b[i] -= f * v[i - k];
    pivots.push(j);
    k++;
  }
  // Back substitution over the pivot columns; every other parameter stays 0.
  const p = new Float64Array(cols);
  for (let r = pivots.length - 1; r >= 0; r--) {
    const j = pivots[r];
    let s = b[r];
    for (let q = r + 1; q < pivots.length; q++) s -= w[r * cols + pivots[q]] * p[pivots[q]];
    p[j] = s / w[r * cols + j];
  }
  for (let j = 0; j < cols; j++) p[j] = scale[j] > 0 ? p[j] / scale[j] : 0;
  return p;
}
