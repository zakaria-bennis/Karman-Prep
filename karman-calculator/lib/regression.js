/* Original bounded least-squares solver. No remote service or external math library. */
function solveLinear(matrix, vector, tolerance = 1e-12) {
  const a = matrix.map((row, i) => [...row, vector[i]]),
    n = vector.length;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    if (!Number.isFinite(a[i][i]) || Math.abs(a[i][i]) <= tolerance) return null;
    const divisor = a[i][i];
    for (let k = i; k <= n; k++) a[i][k] /= divisor;
    for (let j = 0; j < n; j++)
      if (j !== i) {
        const factor = a[j][i];
        for (let k = i; k <= n; k++) a[j][k] -= factor * a[i][k];
      }
  }
  return a.map((row) => row[n]);
}
function regressionMetrics(xs, ys, predicted) {
  const n = ys.length,
    mean = ys.reduce((sum, v) => sum + v, 0) / n;
  const residuals = ys.map((v, i) => v - predicted[i]);
  const sse = residuals.reduce((sum, v) => sum + v * v, 0);
  const sst = ys.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  let r = NaN;
  if (xs?.length === n && n > 1) {
    const mx = xs.reduce((sum, v) => sum + v, 0) / n;
    const xx = xs.reduce((sum, v) => sum + (v - mx) ** 2, 0);
    if (xx > 0 && sst > 0)
      r = clamp(
        xs.reduce((sum, v, i) => sum + (v - mx) * (ys[i] - mean), 0) / Math.sqrt(xx * sst),
        -1,
        1
      );
  }
  return { r2: sst > 0 ? 1 - sse / sst : NaN, r, rmse: Math.sqrt(sse / n), residuals };
}
function fitModel(target, expression, scope, math) {
  const ys = scope[target];
  if (!Array.isArray(ys) || !ys.length || ys.length > 1000)
    throw new Error("Regression needs a table with 1–1,000 numeric pairs.");
  const predictors = expression.references.filter((name) => Array.isArray(scope[name]));
  if (
    predictors.length > 1 ||
    predictors.some((name) => scope[name].length !== ys.length || name === target)
  )
    throw new Error("Use one matching independent table column, such as x₁.");
  const parameters = expression.references.filter((name) => !own(scope, name));
  if (!parameters.length || parameters.length > 8 || parameters.length > ys.length)
    throw new Error("Use 1–8 unknown parameters and at least one data pair per parameter.");
  if (parameters.some((name) => name === "x" || name === "y"))
    throw new Error("Use x₁ for table regression, not x.");
  const predictor = predictors[0];
  const evaluate = (values) =>
    ys.map((_, i) =>
      expression.fn(
        { ...scope, ...values, ...(predictor ? { [predictor]: scope[predictor][i] } : {}) },
        math
      )
    );
  const valuesFor = (p) => Object.fromEntries(parameters.map((name, i) => [name, p[i]]));
  const score = (predicted) => predicted.reduce((sum, v, i) => sum + (v - ys[i]) ** 2, 0);
  let best = null;
  for (const seed of [1, 0.1, -1, 0, 10]) {
    let p = parameters.map(() => seed),
      predicted = evaluate(valuesFor(p)),
      error = score(predicted),
      damping = 0.01,
      converged = false;
    for (let iteration = 0; iteration < 100 && Number.isFinite(error); iteration++) {
      if (error < 1e-24) {
        converged = true;
        break;
      }
      const columns = p.map((v, j) => {
        const h = 1e-5 * (1 + Math.abs(v)),
          next = [...p];
        next[j] += h;
        return evaluate(valuesFor(next)).map((w, i) => (w - predicted[i]) / h);
      });
      const gram = p.map((_, j) =>
        p.map((__, k) => columns[j].reduce((sum, v, i) => sum + v * columns[k][i], 0))
      );
      const gradient = p.map((_, j) =>
        columns[j].reduce((sum, v, i) => sum + v * (ys[i] - predicted[i]), 0)
      );
      if (Math.max(...gradient.map(Math.abs)) < 1e-10) {
        converged = true;
        break;
      }
      gram.forEach((row, j) => {
        row[j] += damping * (1 + row[j]);
      });
      const step = solveLinear(gram, gradient, 1e-24);
      if (!step || step.some((v) => !Number.isFinite(v))) break;
      const next = p.map((v, i) => v + step[i]),
        trial = evaluate(valuesFor(next)),
        nextError = score(trial);
      if (Number.isFinite(nextError) && nextError < error) {
        const improvement = error - nextError;
        p = next;
        predicted = trial;
        error = nextError;
        damping = Math.max(1e-12, damping / 3);
        if (improvement < 1e-13 * (1 + error)) {
          converged = true;
          break;
        }
      } else damping *= 10;
      if (damping > 1e15) break;
    }
    if (Number.isFinite(error) && (!best || error < best.error))
      best = { p, error, predicted, converged };
  }
  if (!best) throw new Error("This model could not be fitted to the data. Check its domain.");
  const columns = best.p.map((v, j) => {
    const next = [...best.p],
      h = 1e-5 * (1 + Math.abs(v));
    next[j] += h;
    return evaluate(valuesFor(next)).map((w, i) => (w - best.predicted[i]) / h);
  });
  const lengths = columns.map((c) => Math.hypot(...c));
  const gram = columns.map((c, j) =>
    columns.map(
      (other, k) => c.reduce((sum, v, i) => sum + v * other[i], 0) / (lengths[j] * lengths[k])
    )
  );
  if (
    lengths.some((v) => !Number.isFinite(v) || v < 1e-12) ||
    !solveLinear(
      gram,
      parameters.map(() => 1),
      1e-8
    )
  )
    throw new Error("These data do not uniquely determine the model parameters.");
  return {
    parameters: valuesFor(best.p),
    converged: best.converged,
    predictor,
    ys,
    xs: predictor ? scope[predictor] : null,
    evaluate,
    predict: (x, parameters) =>
      expression.fn({ ...scope, ...parameters, ...(predictor ? { [predictor]: x } : {}) }, math),
  };
}
