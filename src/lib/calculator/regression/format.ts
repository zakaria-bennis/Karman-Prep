// Regression result text for typed rows (RT-22.1, RT-22.3): parameters with max(T(v), P) significant
// digits (T is 6, or the integer digits + 5 up to 9), statistics with 4 significant digits, both
// trimmed and scientific outside the plain range, as plain text ("1.23457×10^-9"). Pure TypeScript.

import { formatParameterValue, formatStatisticValue } from "./display";

/** `1.2\times10^{-9}` → "1.2×10^-9"; `\mathrm{undefined}` → "undefined". */
function text(latex: string): string {
  return latex
    .replace(/\\times10\^\{(-?\d+)\}/, "×10^$1")
    .replace("\\mathrm{undefined}", "undefined");
}

export function formatParameter(v: number, precision = 4): string {
  return text(formatParameterValue(v, precision));
}

export function formatStatistic(v: number): string {
  return text(formatStatisticValue(v));
}
