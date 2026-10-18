// Regression result text (D-45, appendix F regression requirements 6 and 7): parameters at 6
// significant digits, R² and r at 4 decimals, trailing zeros trimmed; a parameter used in another
// row keeps its full value (NM-1). Pure TypeScript: no DOM.

import { formatNumber } from "../core/eval/format";

export function formatParameter(v: number): string {
  return Number.isFinite(v) ? formatNumber(Number(v.toPrecision(6))) : "undefined";
}

export function formatStatistic(v: number): string {
  return Number.isFinite(v) ? formatNumber(Number(v.toFixed(4))) : "undefined";
}
