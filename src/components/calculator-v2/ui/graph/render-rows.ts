// What GraphPanel draws (G-5; 08 Decision "Region spans"): the snapshot's rows as RenderRows in
// list order and skin colours, and the region cache that keeps a row's shading through a pan. 07
// drops region geometry from the snapshot on every view send, and region spans are CSS px for the
// view they were computed in, so the cache keeps each row's last region geometry with that view;
// alignRegionSpans then shifts it by a pan, or withholds the spans after a zoom or resize until
// fresh geometry arrives. Pure functions: GraphPanel holds the cache.

import type { EngineSnapshot, RowView } from "@/lib/calculator-v2/core/api/engine";
import type { Geometry, TableGeometry, RegionGeometry } from "@/lib/calculator-v2/plot/geometry";
import type { ViewSpec } from "@/lib/calculator-v2/plot/viewport";
import { alignRegionSpans } from "@/lib/calculator-v2/render/shading";
import type { RenderRow } from "@/lib/calculator-v2/render/types";
import { resolveRowColor } from "@/lib/calculator-v2/theme/roles";
import type { SkinId } from "@/lib/calculator-v2/theme/skins";

export type RegionEntry = { key: string; geometry: RegionGeometry; source: ViewSpec };
export type RegionCache = ReadonlyMap<string, RegionEntry>; // by row id

/** What a region entry depends on: the row's kind, hidden flag and latex. */
export function regionKey(row: RowView): string {
  return JSON.stringify([row.kind, row.hidden, row.latex]);
}

/** Whether `row` may hold a cache entry made under `key`: present, unchanged and error-free. */
const keeps = (row: RowView | undefined, key: string): row is RowView =>
  row !== undefined && row.error === null && regionKey(row) === key;

/**
 * The cache after snapshot `s`: an entry stays while its row is in `s.rows` with an equal
 * regionKey and no error; each region geometry in `s.geometry` that its entry does not hold
 * replaces it, with `s`'s view as its source (07 accepts plots only for its latest view). Returns
 * `prev` itself when no entry changed.
 */
export function updateRegionCache(prev: RegionCache, s: EngineSnapshot): RegionCache {
  const rows = new Map(s.rows.map((row) => [row.id, row]));
  let next: Map<string, RegionEntry> | null = null;
  for (const [id, entry] of prev) {
    if (!keeps(rows.get(id), entry.key)) (next ??= new Map(prev)).delete(id);
  }
  if (s.view !== null) {
    const source: ViewSpec = { viewport: s.viewport, size: s.view.size, dpr: s.view.dpr };
    for (const [id, geometry] of s.geometry) {
      const row = rows.get(id);
      if (geometry.kind !== "region" || row === undefined || row.error !== null) continue;
      if ((next ?? prev).get(id)?.geometry === geometry) continue;
      (next ??= new Map(prev)).set(id, { key: regionKey(row), geometry, source });
    }
  }
  return next ?? prev;
}

/**
 * `s.geometry` plus each cached region geometry whose row has none in it (as plotted, before any
 * alignment), or `s.geometry` itself when there is nothing to add. A11Y-1's plot count reads it,
 * so the count holds while a pan has dropped region geometry.
 */
export function displayedGeometry(
  s: EngineSnapshot,
  c: RegionCache
): ReadonlyMap<string, Geometry> {
  let merged: Map<string, Geometry> | null = null;
  for (const [id, entry] of c) {
    if (!s.geometry.has(id)) (merged ??= new Map(s.geometry)).set(id, entry.geometry);
  }
  return merged ?? s.geometry;
}

/**
 * The rows to draw in `current`, in list order: hidden rows and rows with neither snapshot nor
 * cached geometry are skipped; a region's spans are aligned from the view they were computed in;
 * colour and fill alpha come from resolveRowColor(row.color, skin).
 */
export function buildRenderRows(
  s: EngineSnapshot,
  skin: SkinId,
  current: ViewSpec,
  cache: RegionCache
): RenderRow[] {
  const rows: RenderRow[] = [];
  for (const row of s.rows) {
    if (row.hidden) continue;
    const entry = cache.get(row.id);
    const g = s.geometry.get(row.id) ?? entry?.geometry;
    if (g === undefined) continue;
    const geometry =
      g.kind === "region" ? alignRegionSpans(g, entry?.source ?? current, current) : g;
    if (geometry.kind === "table") {
      rows.push(...tableRenderRows(row, geometry, skin, row.id === s.selectedRowId));
      continue;
    }
    const { hex, fillAlpha } = resolveRowColor(row.color, skin);
    rows.push({
      rowId: row.id,
      color: hex,
      fillAlpha,
      geometry,
      selected: row.id === s.selectedRowId,
    });
  }
  return rows;
}

/**
 * D-11, D-12: a table's series as point rows in their columns' colours, each preceded by a curve
 * through its points in row order when the column's lines are on.
 */
function tableRenderRows(
  row: EngineSnapshot["rows"][number],
  g: TableGeometry,
  skin: SkinId,
  selected: boolean
): RenderRow[] {
  const out: RenderRow[] = [];
  for (const { column, coords } of g.series) {
    const stored = row.columns?.[column];
    if (stored === undefined) continue;
    const { hex, fillAlpha } = resolveRowColor(stored.color, skin);
    if (stored.lines === true) {
      out.push({
        rowId: row.id,
        color: hex,
        fillAlpha,
        selected,
        geometry: {
          kind: "curve",
          rowId: row.id,
          evaluations: 0,
          polylines: coords,
          bands: new Float64Array(0),
          dashed: stored.lineStyle === "dashed",
        },
        lineStyle: stored.lineStyle,
      });
    }
    out.push({
      rowId: row.id,
      color: hex,
      fillAlpha,
      selected,
      geometry: { kind: "points", rowId: row.id, evaluations: 0, coords },
      pointStyle: stored.pointStyle,
    });
  }
  return out;
}
