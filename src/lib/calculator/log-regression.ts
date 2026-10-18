import { pearson } from "./math";
import type { RegressionResult } from "./regression";

/** The linearizable forms documented for SAT automatic Log Mode.
 * Residuals stay in original units; r and R² use the transformed data. */
export function logRegression(
  rhs: string,
  xName: string,
  x: number[],
  y: number[],
  parameters: string[]
): RegressionResult | null {
  const text = rhs.replace(/\s/g, "");
  const variable = xName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const p = "([a-z](?:_\\d+)?)";
  const exponential = text.match(new RegExp(`^${p}\\*?${p}\\^${variable}$`));
  const natural = text.match(new RegExp(`^${p}\\*?exp\\(${p}\\*?${variable}\\)$`));
  const power = text.match(new RegExp(`^${p}\\*?${variable}\\^${p}$`));
  const logarithmic = text.match(new RegExp(`^${p}\\*?ln\\(${variable}\\)\\+${p}$`));
  const fixedBase = text.match(
    new RegExp(`^(\\d+(?:\\.\\d+)?)\\^\\(${p}\\*?${variable}\\+${p}\\)$`)
  );
  const match = exponential ?? natural ?? power ?? logarithmic ?? fixedBase;
  if (!match) return null;
  const names = fixedBase ? [match[2], match[3]] : [match[1], match[2]];
  if (names[0] === names[1] || names.some((name) => !parameters.includes(name))) return null;
  const logX = !!(power || logarithmic),
    logY = !logarithmic;
  if (x.length !== y.length || x.length < 2)
    throw new Error("Log mode needs at least two paired observations.");
  if ((logX && x.some((v) => v <= 0)) || (logY && y.some((v) => v <= 0)))
    throw new Error("Log mode needs positive values for every logarithm.");
  const tx = x.map((v) => (logX ? Math.log(v) : v)),
    ty = y.map((v) => (logY ? Math.log(v) : v));
  const mx = tx.reduce((a, b) => a + b, 0) / tx.length,
    my = ty.reduce((a, b) => a + b, 0) / ty.length;
  const variance = tx.reduce((sum, v) => sum + (v - mx) ** 2, 0);
  if (!variance) throw new Error("These data do not uniquely determine the model parameters.");
  const slope = tx.reduce((sum, v, i) => sum + (v - mx) * (ty[i] - my), 0) / variance;
  const intercept = my - slope * mx;
  let values: number[];
  if (exponential) values = [Math.exp(intercept), Math.exp(slope)];
  else if (natural || power) values = [Math.exp(intercept), slope];
  else if (fixedBase) {
    const base = Number(match[1]);
    if (base <= 0 || base === 1) return null;
    values = [slope / Math.log(base), intercept / Math.log(base)];
  } else values = [slope, intercept];
  const predict = (value: number) => {
    const transformed = intercept + slope * (logX ? Math.log(value) : value);
    return logY ? Math.exp(transformed) : transformed;
  };
  const residuals = x.map((v, i) => y[i] - predict(v));
  const sst = ty.reduce((sum, v) => sum + (v - my) ** 2, 0);
  const sse = tx.reduce((sum, v, i) => sum + (ty[i] - intercept - slope * v) ** 2, 0);
  return {
    parameters: Object.fromEntries(names.map((name, i) => [name, values[i]])),
    r2: sst > 0 ? 1 - sse / sst : NaN,
    r: pearson(tx, ty),
    rmse: Math.sqrt(residuals.reduce((sum, v) => sum + v * v, 0) / y.length),
    residuals,
    converged: true,
    predict,
    logMode: true,
  };
}
