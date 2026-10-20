// Regression statistics (RT section 1, REG-STATISTICS-1 to -8): every fit reports exactly one of
// {RMSE}, {Rsquared} or {r, rsquared}. RMSE when the variance of y is not positive (or the left
// side is not a bare name); otherwise R² = 1 − MSE/Var(y) with population variance, replaced by
// r and r·r when the model fits exactly as well as the best straight line on the unique predictor
// (an 8-bit floating-point equality of the two MSEs). Pure TypeScript: no DOM.

export type RegressionStatistics =
  | { kind: "RMSE"; RMSE: number }
  | { kind: "Rsquared"; Rsquared: number }
  | { kind: "r"; r: number; rsquared: number };

export interface StatisticsInput {
  observed: ArrayLike<number>; // y, or ln y in LOGLIN / LOGLOG log mode
  predicted: ArrayLike<number>; // the model at each point, on the same scale
  predictor: ArrayLike<number> | null; // the unique predictor list (x or ln x), or null
  plainLeft: boolean; // the left side is a bare identifier
  /** Log mode: the model is a straight line on the transformed scale, so r always shows. */
  forceR?: boolean;
}

const mean = (v: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i];
  return s / v.length;
};

/** Population variance (divide by n). */
export function populationVariance(v: ArrayLike<number>): number {
  const m = mean(v);
  let s = 0;
  for (let i = 0; i < v.length; i++) s += (v[i] - m) ** 2;
  return s / v.length;
}

/** Pearson correlation of u and v; NaN when either has no spread. */
export function pearson(u: ArrayLike<number>, v: ArrayLike<number>): number {
  const mu = mean(u),
    mv = mean(v);
  let suv = 0,
    suu = 0,
    svv = 0;
  for (let i = 0; i < u.length; i++) {
    suv += (u[i] - mu) * (v[i] - mv);
    suu += (u[i] - mu) ** 2;
    svv += (v[i] - mv) ** 2;
  }
  return suv / Math.sqrt(suu * svv);
}

/** MSE of the least-squares line v ≈ m·u + b. */
function lineMse(u: ArrayLike<number>, v: ArrayLike<number>): number {
  const mu = mean(u),
    mv = mean(v);
  let suv = 0,
    suu = 0;
  for (let i = 0; i < u.length; i++) {
    suv += (u[i] - mu) * (v[i] - mv);
    suu += (u[i] - mu) ** 2;
  }
  const m = suu > 0 ? suv / suu : 0,
    b = mv - m * mu;
  let s = 0;
  for (let i = 0; i < u.length; i++) s += (v[i] - (m * u[i] + b)) ** 2;
  return s / u.length;
}

/** REG-STATISTICS-6: equal, or equal under 8 bits of slack relative to max(|a|, |b|, 1). */
export function approxEqual8Bits(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const n = Math.max(Math.abs(a), Math.abs(b), 1);
  return n + Math.abs(a - b) / 256 === n;
}

/** The statistics of a fit, or null when the MSE is not finite (the fit then fails). */
export function regressionStatistics(input: StatisticsInput): RegressionStatistics | null {
  const { observed: y, predicted } = input;
  const n = y.length;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (y[i] - predicted[i]) ** 2;
  const mse = sse / n;
  if (!Number.isFinite(mse)) return null;
  const variance = populationVariance(y);
  if (!input.plainLeft || !(variance > 0) || !Number.isFinite(variance)) {
    return { kind: "RMSE", RMSE: Math.sqrt(mse) };
  }
  const rsq = 1 - mse / variance;
  const x = input.predictor;
  if (x !== null) {
    const r = pearson(x, y);
    if (Number.isFinite(r) && (input.forceR === true || approxEqual8Bits(lineMse(x, y), mse))) {
      return { kind: "r", r, rsquared: r * r };
    }
  }
  return { kind: "Rsquared", Rsquared: rsq };
}
