// The graph's accessible name (A11Y-1): "Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots", with
// bounds to at most 4 significant digits and the plotted visible rows counted. GraphPanel debounces
// it (NAME_DEBOUNCE_MS, NAME_MAX_WAIT_MS) and re-exports graphAccessibleName (01 section 10).

import type { RowView } from "@/lib/calculator-v2/core/api/engine";
import type { RowKind } from "@/lib/calculator-v2/core/corpus/types";
import type { Geometry } from "@/lib/calculator-v2/plot/geometry";
import type { Viewport } from "@/lib/calculator-v2/plot/viewport";

/**
 * The kinds that always draw when visible and error-free. countPlots adds point,
 * constant-relation and function-definition rows by rule.
 */
export const PLOT_KINDS: ReadonlySet<RowKind> = new Set<RowKind>([
  "curve-y",
  "curve-x",
  "implicit",
  "vertical-lines",
  "horizontal-lines",
  "region",
]);

/**
 * A bound to at most 4 significant digits in the NM display style: plain for 1e-4 ≤ |v| < 1e6,
 * otherwise `mantissa×10^exponent` with U+00D7 and a hyphen-minus; -0 shows as "0".
 */
export function formatBound(v: number): string {
  const r = Number(v.toPrecision(4));
  if (r === 0) return "0";
  const abs = Math.abs(r);
  if (abs >= 1e-4 && abs < 1e6) return String(r);
  const [digits, expPart] = r.toExponential(3).split("e");
  const mantissa = digits.replace(/0+$/, "").replace(/\.$/, "");
  const exponent = String(Number(expPart));
  return `${mantissa}×10^${exponent}`;
}

/** Whether a visible, error-free, chip-free row draws something on the graph. */
function drawsPlot(row: RowView, geo: ReadonlyMap<string, Geometry>): boolean {
  if (PLOT_KINDS.has(row.kind)) return true;
  switch (row.kind) {
    case "point":
      return (
        row.value?.type === "point" &&
        Number.isFinite(row.value.value[0]) &&
        Number.isFinite(row.value.value[1])
      );
    case "table": {
      // D-11: a table draws when some column has points
      const g = geo.get(row.id);
      return g?.kind === "table" && g.series.some((series) => series.coords.length > 0);
    }
    case "constant-relation": {
      // only a true inequality draws: its region has spans
      const g = geo.get(row.id);
      return g?.kind === "region" && g.spans.length > 0;
    }
    case "function-definition":
      // only a one-parameter definition ever gets geometry (01-interfaces.md section 3)
      return geo.has(row.id);
    default:
      return false;
  }
}

/**
 * A11Y-1's plot count: rows that are not hidden, have no error and no chips, and draw. GraphPanel
 * passes its displayed geometry, so the count holds while a pan has dropped region geometry.
 */
export function countPlots(rows: readonly RowView[], geo: ReadonlyMap<string, Geometry>): number {
  let n = 0;
  for (const row of rows) {
    if (!row.hidden && row.error === null && row.chips.length === 0 && drawsPlot(row, geo)) n++;
  }
  return n;
}

/** "Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots"; "1 plot" in the singular. */
export function graphAccessibleName(viewport: Viewport, plots: number): string {
  const b = formatBound;
  const { left, right, bottom, top } = viewport;
  return `Graph from x=${b(left)} to ${b(right)}, y=${b(bottom)} to ${b(top)}, ${plots} plot${plots === 1 ? "" : "s"}`;
}
