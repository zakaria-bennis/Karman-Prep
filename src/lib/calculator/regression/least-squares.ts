// Linear least squares for regressions (D-25, D-26): min ‖A·p − b‖ by column scaling, Householder
// QR to a p×p triangle, then a one-sided Jacobi SVD of that triangle, whose small singular values
// are dropped, so rank-deficient data get the minimum-norm solution with no error (Desmos fits
// them silently). Pure TypeScript: no DOM.

const EPS = 2.220446049250313e-16;
/** Singular values below this share of the largest are treated as zero. */
const RANK_TOLERANCE = 1e-12;
const JACOBI_SWEEPS = 60;

/**
 * The minimum-norm least-squares solution of A·p ≈ b, A row-major with `rows` × `cols` entries.
 * Rows with a non-finite entry must be removed by the caller.
 */
export function solveLeastSquares(
  a: Float64Array,
  rows: number,
  cols: number,
  b: Float64Array
): Float64Array {
  // Column scaling: every column to unit 2-norm (a zero column stays zero).
  const scale = new Float64Array(cols);
  for (let j = 0; j < cols; j++) {
    let s = 0;
    for (let i = 0; i < rows; i++) s += a[i * cols + j] ** 2;
    scale[j] = s > 0 ? Math.sqrt(s) : 1;
  }
  const m = Math.max(rows, cols);
  // Work on a copy, padded with zero rows when there are fewer rows than columns.
  const w = new Float64Array(m * cols),
    rhs = new Float64Array(m);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) w[i * cols + j] = a[i * cols + j] / scale[j];
    rhs[i] = b[i];
  }
  householder(w, m, cols, rhs);
  // R is the top cols×cols block; Qᵀb its first cols entries.
  const r = new Float64Array(cols * cols);
  for (let i = 0; i < cols; i++) for (let j = i; j < cols; j++) r[i * cols + j] = w[i * cols + j];
  const qtb = rhs.subarray(0, cols);
  const { u, sigma, v } = jacobiSvd(r, cols);
  const smax = Math.max(0, ...sigma);
  const p = new Float64Array(cols);
  for (let k = 0; k < cols; k++) {
    if (!(sigma[k] > RANK_TOLERANCE * smax)) continue;
    let dot = 0;
    for (let i = 0; i < cols; i++) dot += u[i * cols + k] * qtb[i];
    const c = dot / sigma[k];
    for (let j = 0; j < cols; j++) p[j] += v[j * cols + k] * c;
  }
  for (let j = 0; j < cols; j++) p[j] /= scale[j];
  return p;
}

/** In-place Householder QR of the m×n matrix w, applying each reflection to rhs as well. */
function householder(w: Float64Array, m: number, n: number, rhs: Float64Array): void {
  for (let k = 0; k < Math.min(m, n); k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += w[i * n + k] ** 2;
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = w[k * n + k] > 0 ? -norm : norm;
    const v = new Float64Array(m - k);
    for (let i = k; i < m; i++) v[i - k] = w[i * n + k];
    v[0] -= alpha;
    let vv = 0;
    for (const x of v) vv += x * x;
    if (vv === 0) continue;
    for (let j = k; j < n; j++) {
      let dot = 0;
      for (let i = k; i < m; i++) dot += v[i - k] * w[i * n + j];
      const f = (2 * dot) / vv;
      for (let i = k; i < m; i++) w[i * n + j] -= f * v[i - k];
    }
    let dot = 0;
    for (let i = k; i < m; i++) dot += v[i - k] * rhs[i];
    const f = (2 * dot) / vv;
    for (let i = k; i < m; i++) rhs[i] -= f * v[i - k];
  }
}

/** One-sided Jacobi SVD of the n×n matrix r: r = U·diag(sigma)·Vᵀ (U, V row-major). */
function jacobiSvd(
  r: Float64Array,
  n: number
): { u: Float64Array; sigma: number[]; v: Float64Array } {
  const u = Float64Array.from(r),
    v = new Float64Array(n * n);
  for (let i = 0; i < n; i++) v[i * n + i] = 1;
  for (let sweep = 0; sweep < JACOBI_SWEEPS; sweep++) {
    let rotated = false;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        let alpha = 0,
          beta = 0,
          gamma = 0;
        for (let i = 0; i < n; i++) {
          const up = u[i * n + p],
            uq = u[i * n + q];
          alpha += up * up;
          beta += uq * uq;
          gamma += up * uq;
        }
        if (gamma === 0 || Math.abs(gamma) <= EPS * Math.sqrt(alpha * beta)) continue;
        rotated = true;
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t),
          s = c * t;
        for (let i = 0; i < n; i++) {
          const up = u[i * n + p],
            uq = u[i * n + q];
          u[i * n + p] = c * up - s * uq;
          u[i * n + q] = s * up + c * uq;
          const vp = v[i * n + p],
            vq = v[i * n + q];
          v[i * n + p] = c * vp - s * vq;
          v[i * n + q] = s * vp + c * vq;
        }
      }
    }
    if (!rotated) break;
  }
  const sigma: number[] = [];
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += u[i * n + k] ** 2;
    const norm = Math.sqrt(s);
    sigma.push(norm);
    if (norm > 0) for (let i = 0; i < n; i++) u[i * n + k] /= norm;
  }
  return { u, sigma, v };
}
