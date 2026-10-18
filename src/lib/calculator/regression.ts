import { logRegression } from "./log-regression";
import { at, compileMath, pearson, real, unwrap, type Scope } from "./math";

export interface RegressionResult {
  parameters: Record<string, number>;
  logMode?: boolean;
  r2: number;
  r: number;
  rmse: number;
  residuals: number[];
  converged: boolean;
  predict(x: number): number;
}
function solve(matrix: number[][], vector: number[], tolerance = 1e-20): number[] | null {
  const a = matrix.map((row, i) => [...row, vector[i]]),
    n = vector.length;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    if (Math.abs(a[i][i]) < tolerance) return null;
    const divisor = a[i][i];
    for (let k = i; k <= n; k++) a[i][k] /= divisor;
    for (let j = 0; j < n; j++)
      if (j !== i) {
        const f = a[j][i];
        for (let k = i; k <= n; k++) a[j][k] -= f * a[i][k];
      }
  }
  return a.map((row) => row[n]);
}
/** Damped least-squares fitting; arbitrary scalar parameters, with bounded work. */
export function fitRegression(lhs: string, rhs: string, scope: Scope): RegressionResult {
  const target = unwrap(compileMath(lhs, scope, true).evaluate());
  const y = (Array.isArray(target) ? target : [target]).map(real);
  if (!y.length || y.some((v) => !Number.isFinite(v)))
    throw new Error("Regression needs finite numeric data.");
  if (y.length > 2000)
    throw new Error("Regression supports up to 2,000 observations. Use a smaller table.");
  const expression = compileMath(rhs, scope, true);
  const parameters = expression.symbols.filter((s) => s !== "x" && s !== "y");
  if (!parameters.length) throw new Error("Use an undefined parameter, for example y_1 ~ m*x_1+b.");
  if (parameters.length > 8 || parameters.length > y.length)
    throw new Error(
      "Regression needs at least one observation per parameter (up to eight parameters)."
    );
  const lists = [...scope.entries()].filter(([, v]) => Array.isArray(unwrap(v)));
  const predictorLists = lists.filter(
    ([name, list]) =>
      expression.references.includes(name) && (unwrap(list) as unknown[]).length === y.length
  );
  if (predictorLists.length === 1) {
    const [name, data] = predictorLists[0];
    const logFit = logRegression(rhs, name, (unwrap(data) as unknown[]).map(real), y, parameters);
    if (logFit) return logFit;
  }
  const samples = y.map((_, i) => {
    const s = new Map(scope);
    lists.forEach(([name, list]) => {
      const a = unwrap(list) as unknown[];
      if (a.length !== y.length) return;
      s.set(name, real(a[i]));
    });
    return s;
  });
  const prediction = (p: number[]) =>
    samples.map((s) => {
      const vars = Object.fromEntries(parameters.map((name, i) => [name, p[i]]));
      return at(expression, s, vars);
    });
  const error = (values: number[]) => values.reduce((sum, v, i) => sum + (y[i] - v) ** 2, 0);
  let bestP = parameters.map(() => 1),
    bestScore = Infinity,
    bestConverged = false;
  for (const seed of [1, 0.1, -1]) {
    let p = parameters.map(() => seed),
      values = prediction(p),
      score = error(values),
      damping = 0.01,
      converged = false;
    for (let iteration = 0; iteration < 80; iteration++) {
      if (!Number.isFinite(score)) break;
      if (score < 1e-22) {
        converged = true;
        break;
      }
      const columns = p.map((v, j) => {
        const h = 1e-5 * (Math.abs(v) + 1),
          changed = [...p];
        changed[j] += h;
        return prediction(changed).map((n, i) => (n - values[i]) / h);
      });
      const gram = p.map((_, j) =>
        p.map((__, k) => columns[j].reduce((sum, v, i) => sum + v * columns[k][i], 0))
      );
      const gradient = p.map((_, j) =>
        columns[j].reduce((sum, v, i) => sum + v * (y[i] - values[i]), 0)
      );
      if (Math.max(...gradient.map(Math.abs)) < 1e-10) {
        converged = true;
        break;
      }
      gram.forEach((row, j) => {
        row[j] += damping * (1 + row[j]);
      });
      const step = solve(gram, gradient);
      if (!step || step.some((v) => !Number.isFinite(v))) break;
      const next = p.map((v, i) => v + step[i]),
        predicted = prediction(next),
        nextScore = error(predicted);
      if (Number.isFinite(nextScore) && nextScore < score) {
        const improvement = score - nextScore;
        p = next;
        values = predicted;
        score = nextScore;
        damping = Math.max(1e-12, damping / 3);
        if (improvement < 1e-12 * (1 + score) || Math.max(...step.map(Math.abs)) < 1e-9) {
          converged = true;
          break;
        }
      } else damping *= 10;
      if (damping > 1e14) break;
    }
    if (score < bestScore) {
      bestScore = score;
      bestP = p;
      bestConverged = converged;
    }
  }
  if (!Number.isFinite(bestScore))
    throw new Error("Could not fit this model. Check the data and parameterization.");
  const finalValues = prediction(bestP);
  const derivatives = bestP.map((v, j) => {
    const changed = [...bestP],
      h = 1e-5 * (1 + Math.abs(v));
    changed[j] += h;
    return prediction(changed).map((n, i) => (n - finalValues[i]) / h);
  });
  // Damping can stabilize a step but cannot make unidentified parameters valid.
  // Check the normalized Jacobian before reporting a usable fit.
  const lengths = derivatives.map((column) => Math.hypot(...column));
  const correlation = derivatives.map((column, j) =>
    derivatives.map(
      (other, k) => column.reduce((sum, v, i) => sum + v * other[i], 0) / (lengths[j] * lengths[k])
    )
  );
  if (
    lengths.some((n) => !Number.isFinite(n) || n < 1e-12) ||
    !solve(
      correlation,
      parameters.map(() => 1),
      1e-8
    )
  ) {
    throw new Error("These data do not uniquely determine the model parameters.");
  }
  const fitted = Object.fromEntries(parameters.map((name, i) => [name, bestP[i]]));
  const residuals = prediction(bestP).map((v, i) => y[i] - v),
    mean = y.reduce((a, b) => a + b, 0) / y.length;
  const total = y.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  const predictors = lists.filter(
    ([name, list]) =>
      expression.references.includes(name) && (unwrap(list) as unknown[]).length === y.length
  );
  // Correlation is defined only for one actual independent data column.
  const xEntry = predictors.length === 1 ? predictors[0] : undefined;
  const x = xEntry ? (unwrap(xEntry[1]) as unknown[]).map(real) : [];
  return {
    parameters: fitted,
    r2: total > 0 ? 1 - bestScore / total : NaN,
    r: pearson(x, y),
    rmse: Math.sqrt(bestScore / y.length),
    residuals,
    converged: bestConverged,
    predict: (x: number) =>
      at(expression, scope, { ...fitted, ...(xEntry ? { [xEntry[0]]: x } : {}) }),
  };
}
