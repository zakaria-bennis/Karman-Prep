// The text of a regression's results (D-37, D-45, A11Y-10): each value as shown ("m = 600") and as
// read ("b equals negative 1164000"), and the row's summary, "Regression: m equals 600, b equals
// negative 1164000, R squared equals 1, r equals 1". RMSE replaces R² when R² is undefined (D-32).

import type { RowView } from "@/lib/calculator/core/api/engine";
import { formatParameter, formatStatistic } from "@/lib/calculator/regression/format";
import { latexToSpeech } from "../../math-field/speech";
import { headerName } from "./table-model";

export interface ShownValue {
  key: string;
  shown: string; // "m", "R²", "r", "RMSE"
  value: string; // as formatted (D-45)
  spoken: string; // "m equals 600"
}

/** "-12" or "−12" read as "negative 12". */
export function spokenNumber(text: string): string {
  return text.replace(/^[-−]/, "negative ");
}

const value = (key: string, shown: string, said: string, text: string): ShownValue => ({
  key,
  shown,
  value: text,
  spoken: `${said} equals ${spokenNumber(text)}`,
});

/** D-37: the fitted parameters in order, as shown and read. */
export function parameterValues(row: RowView): ShownValue[] {
  const fit = row.regression?.result;
  if (fit === null || fit === undefined || !fit.ok) return [];
  return fit.params.map(({ name, value: v }, k) =>
    value(`p${k}`, headerName(name, k), latexToSpeech(name), formatParameter(v))
  );
}

/** D-31, D-32: R² (or RMSE in its place) and r when defined. */
export function statisticValues(row: RowView): ShownValue[] {
  const fit = row.regression?.result;
  if (fit === null || fit === undefined || !fit.ok) return [];
  const out: ShownValue[] = [];
  if (fit.r2 !== null) out.push(value("r2", "R²", "R squared", formatStatistic(fit.r2)));
  else if (fit.rmse !== null) out.push(value("rmse", "RMSE", "RMSE", formatParameter(fit.rmse)));
  if (fit.r !== null) out.push(value("r", "r", "r", formatStatistic(fit.r)));
  return out;
}

/** A11Y-10, D-37: the summary read 750 ms after a change, or null while there is no fit. */
export function regressionSummary(row: RowView): string | null {
  const fit = row.regression?.result;
  if (fit === null || fit === undefined || !fit.ok) return null;
  const parts = [...parameterValues(row), ...statisticValues(row)].map((v) => v.spoken);
  return `Regression: ${parts.join(", ")}`;
}
