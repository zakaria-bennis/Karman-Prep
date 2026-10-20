// Tabular paste (RT-8, TABLES-49, -51): a pasted numeric grid becomes a new table, named x_n, y_n,
// z_n, u_n, v_n, w_n with the lowest n none of whose names is in use, in place of an empty row or
// after the row pasted into, as one undo step. When a pasted point (first two columns) lies outside
// the view, the view zooms to fit them by TABLES-48's rule.

import type { Viewport } from "../../plot/viewport";
import { PASTED_HEADER_LETTERS } from "../data/paste-grid";
import type { StoredColumn, StoredRow } from "./document";
import type { CalculatorEngine } from "./engine";

/** TABLES-48: the zoom-fit view of points: origin pulled in, degenerate ±0.5, 50% padding. */
export function zoomFitBounds(points: readonly (readonly [number, number])[]): Viewport | null {
  const finite = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (finite.length === 0) return null;
  const axis = (values: number[]): [number, number] => {
    let lo = Math.min(...values),
      hi = Math.max(...values);
    if (lo > 0 && hi > 0 && lo / (hi - lo) < 1.2) lo = 0;
    else if (lo < 0 && hi < 0 && hi / (lo - hi) < 1.2) hi = 0;
    if (lo === hi) [lo, hi] = [lo - 0.5, hi + 0.5];
    const pad = (hi - lo) / 2;
    return [lo - pad, hi + pad];
  };
  const [left, right] = axis(finite.map((p) => p[0]));
  const [bottom, top] = axis(finite.map((p) => p[1]));
  return { left, right, bottom, top };
}

/** The new table's id and whether the view zoomed, or null when nothing was pasted. */
export function pasteTable(
  engine: CalculatorEngine,
  atRowId: string | null,
  columns: readonly string[][]
): { id: string; zoomed: boolean } | null {
  let made: string | null = null;
  engine.editRows((rows, ctx) => {
    let n = 1;
    const names = () => columns.map((_, j) => `${PASTED_HEADER_LETTERS[j]}_{${n}}`);
    while (names().some((name) => ctx.used.has(name))) n++;
    const i = atRowId === null ? -1 : rows.findIndex((r) => r.id === atRowId);
    const replace = i >= 0 && rows[i].type !== "table" && rows[i].latex.trim() === "";
    const index = replace ? i : i < 0 ? rows.length : i + 1;
    const id = replace ? rows[i].id : ctx.nextId();
    const length = Math.max(...columns.map((c) => c.length));
    // RT-2: every pasted column takes the next colour.
    const stored: StoredColumn[] = names().map((latex, j) => ({
      latex,
      values: Array.from({ length }, (_, k) => columns[j][k] ?? ""),
      color: ctx.nextColour(),
      hidden: false,
    }));
    const table: StoredRow = {
      id,
      latex: "",
      color: stored[0]?.color ?? "c1",
      blankColor: ctx.nextColour(),
      hidden: false,
      type: "table",
      columns: stored,
    };
    made = id;
    return replace
      ? rows.map((r, k) => (k === i ? table : r))
      : [...rows.slice(0, index), table, ...rows.slice(index)];
  });
  if (made === null) return null;
  const points = columns[0].flatMap((x, k): [number, number][] =>
    x === "" || (columns[1][k] ?? "") === "" ? [] : [[Number(x), Number(columns[1][k])]]
  );
  const view = engine.getSnapshot().viewport;
  const outside = points.some(
    ([x, y]) => x < view.left || x > view.right || y < view.bottom || y > view.top
  );
  const fit = outside ? zoomFitBounds(points) : null;
  if (fit !== null) engine.setMathBounds(fit);
  return { id: made, zoomed: fit !== null };
}

/** TABLES-48 for plotted series of world [x, y, …] pairs. */
export function zoomFitSeries(series: readonly Float64Array[]): Viewport | null {
  const points: [number, number][] = [];
  for (const coords of series) {
    for (let k = 0; k + 1 < coords.length; k += 2) points.push([coords[k], coords[k + 1]]);
  }
  return zoomFitBounds(points);
}
