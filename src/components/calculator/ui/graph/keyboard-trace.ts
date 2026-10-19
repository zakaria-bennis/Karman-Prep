// The keyboard trace (POI-20, A11Y-9, KB-14, K-9): Alt/Option+T or the keypad's audio key starts a
// trace of a row's curve at its first point of interest; Page Down and Page Up step through the
// points in x order, Left and Right move along the curve by 1/100 of the view, Home and End go to
// its ends in view, Ctrl or Cmd with Up and Down switch expression, and Escape stops and returns
// focus to the row. Each step is announced; A11Y-13's tones arrive in Phase 4.

import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { formatPoiLabel, formatTraceLabel, roundTraceX } from "@/lib/calculator/poi/format";
import type { PoiKind, PoiPoint } from "@/lib/calculator/poi/types";
import { createContext } from "react";

export const TRACE_HELP =
  "Page Down and Page Up move between points of interest, Left and Right move along the curve, Home and End go to its ends, Escape stops.";
const NO_MORE = "No more points of interest.";
const STEP_FRACTION = 0.01; // Desmos steps 1/100 of the view's width

const KIND_WORDS: Readonly<Record<PoiKind, string>> = {
  zero: "Zero",
  "x-intercept": "X-intercept",
  "y-intercept": "Y-intercept",
  maximum: "Maximum",
  minimum: "Minimum",
  top: "Top",
  bottom: "Bottom",
  intersection: "Intersection",
};

/** A11Y-9: "Y-intercept and Minimum", "Intersection with Expression 2". */
export function kindWords(
  kinds: readonly PoiKind[],
  withRowId: string | null,
  rowNumbers: ReadonlyMap<string, number>
): string {
  return kinds
    .map((k) => {
      const n = withRowId === null ? undefined : rowNumbers.get(withRowId);
      return k === "intersection" && n !== undefined
        ? `Intersection with Expression ${n}`
        : KIND_WORDS[k];
    })
    .join(" and ");
}

/** The label's coordinates as words: "(−2, 4)" reads "x negative 2, y 4". */
function coordinateWords(label: string): string {
  const [x, y] = label.slice(1, -1).split(", ");
  const spoken = (s: string) => (s.startsWith("−") ? `negative ${s.slice(1)}` : s);
  return `x ${spoken(x)}, y ${spoken(y)}`;
}

/** A11Y-9: the kind words, then the visible label's coordinates. */
export function poiAnnouncement(
  point: PoiPoint,
  rowNumbers: ReadonlyMap<string, number>,
  view: ViewSpec
): string {
  return `${kindWords(point.kinds, point.withRowId, rowNumbers)} at ${coordinateWords(formatPoiLabel(point, view))}`;
}

export interface TraceView {
  rowId: string;
  x: number;
  y: number;
}
export interface KeyboardTraceDeps {
  engine: CalculatorEngine;
  announce(text: string): void;
  focusRow(rowId: string): void;
}
type Key = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

export class KeyboardTrace {
  private readonly deps: KeyboardTraceDeps;
  private current: (TraceView & { index: number | null }) | null = null;
  /** The announcement that waits for the row's points: the text before the point. */
  private pending: string | null = null;
  private readonly listeners = new Set<() => void>();
  private offEngine: (() => void) | null = null;

  constructor(deps: KeyboardTraceDeps) {
    this.deps = deps;
  }

  get state(): TraceView | null {
    return this.current;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Starts a trace of `rowId` (or the first graphable row), or stops the running one. */
  toggle(rowId: string | null): void {
    if (this.current !== null) {
      this.stop();
      return;
    }
    const s = this.deps.engine.getSnapshot();
    const id = rowId ?? s.rows.find((r) => this.traceable(r.id))?.id ?? null;
    if (id === null) return;
    this.offEngine = this.deps.engine.subscribe(() => this.onEngine());
    this.begin(id, `Audio trace on. ${TRACE_HELP} `);
  }

  stop(): void {
    if (this.current === null) return;
    const { rowId } = this.current;
    this.current = null;
    this.pending = null;
    this.offEngine?.();
    this.offEngine = null;
    this.deps.announce("Audio trace off");
    this.deps.focusRow(rowId);
    this.notify();
  }

  /** True when the trace used the key (the caller prevents its default and stops it). */
  handleKey(e: Key): boolean {
    const c = this.current;
    if (c === null) return false;
    const command = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case "Escape":
        this.stop();
        return true;
      case "PageDown":
      case "PageUp":
        this.step(e.key === "PageDown" ? 1 : -1);
        return true;
      case "Home":
      case "End":
        this.moveTo(e.key === "Home" ? this.view().viewport.left : this.view().viewport.right);
        return true;
      case "ArrowLeft":
      case "ArrowRight": {
        const { left, right } = this.view().viewport;
        this.moveTo(c.x + (e.key === "ArrowRight" ? 1 : -1) * STEP_FRACTION * (right - left));
        return true;
      }
      case "ArrowUp":
      case "ArrowDown": {
        if (!command) return false;
        const s = this.deps.engine.getSnapshot();
        const graphed = s.rows.filter((r) => r.id === c.rowId || this.traceable(r.id));
        const at = graphed.findIndex((r) => r.id === c.rowId);
        const next = graphed[at + (e.key === "ArrowDown" ? 1 : -1)];
        if (next !== undefined) this.begin(next.id, `Expression ${s.rows.indexOf(next) + 1}. `);
        return true;
      }
      default:
        return false;
    }
  }

  private begin(rowId: string, prefix: string): void {
    this.deps.engine.setSelectedRow(rowId);
    this.current = { rowId, x: 0, y: 0, index: null };
    this.pending = prefix;
    this.notify();
    this.onEngine();
  }

  /** Lands on the first point once the row's points arrive, announcing the pending prefix. */
  private onEngine(): void {
    const c = this.current;
    if (c === null || this.pending === null) return;
    const s = this.deps.engine.getSnapshot();
    if (s.poi === null || s.poi.rowId !== c.rowId || s.view === null) return;
    const prefix = this.pending;
    this.pending = null;
    const first = s.poi.points[0];
    if (first === undefined) {
      const { left, right } = s.view.viewport;
      this.moveTo((left + right) / 2, prefix);
      return;
    }
    this.current = { rowId: c.rowId, x: first.x, y: first.y, index: 0 };
    this.notify();
    this.deps.announce(`${prefix}${poiAnnouncement(first, this.rowNumbers(), s.view)}`);
  }

  private step(direction: 1 | -1): void {
    const c = this.current!;
    const s = this.deps.engine.getSnapshot();
    const points = s.poi?.rowId === c.rowId ? s.poi.points : [];
    let index: number;
    if (c.index === null) {
      index =
        direction > 0 ? points.findIndex((p) => p.x > c.x) : points.findLastIndex((p) => p.x < c.x);
    } else {
      index = c.index + direction;
    }
    const view = this.view();
    if (index < 0 || index >= points.length) {
      const here = c.index === null ? null : points[c.index];
      const tail =
        here === undefined || here === null
          ? coordinateWords(formatTraceLabel(c.x, c.y, view))
          : poiAnnouncement(here, this.rowNumbers(), view);
      this.deps.announce(`${NO_MORE} ${tail}`);
      return;
    }
    const p = points[index];
    this.current = { rowId: c.rowId, x: p.x, y: p.y, index };
    this.notify();
    this.deps.announce(poiAnnouncement(p, this.rowNumbers(), view));
  }

  /** Moves along an explicit y=f(x) curve to x (rounded to the view's precision) and announces. */
  private moveTo(x: number, prefix = ""): void {
    const c = this.current!;
    const view = this.view();
    const curve = this.deps.engine.poiCurves(c.rowId)[0];
    if (curve === undefined || curve.kind !== "explicit" || curve.independent !== "x") return;
    const { left, right } = view.viewport;
    const xr = roundTraceX(Math.min(right, Math.max(left, x)), view);
    const y = curve.f(xr);
    if (!Number.isFinite(y)) return;
    this.current = { rowId: c.rowId, x: xr, y, index: null };
    this.notify();
    this.deps.announce(`${prefix}${coordinateWords(formatTraceLabel(xr, y, view))}`);
  }

  /** A row with a curve to trace: graphable, with at least one curve (not a point or region fill). */
  private traceable(rowId: string): boolean {
    return this.deps.engine.poiCurves(rowId).length > 0;
  }

  private view(): ViewSpec {
    const s = this.deps.engine.getSnapshot();
    return s.view ?? { viewport: s.viewport, size: { width: 800, height: 600 }, dpr: 1 };
  }

  private rowNumbers(): Map<string, number> {
    return new Map(this.deps.engine.getSnapshot().rows.map((r, i) => [r.id, i + 1]));
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/** The calculator's keyboard trace; null outside a calculator (component tests of one part). */
export const KeyboardTraceContext = createContext<KeyboardTrace | null>(null);
