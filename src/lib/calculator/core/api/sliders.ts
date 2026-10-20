// Sliders in the engine: the analysis pass that finds slider rows and swaps a typed value the
// limits or step move (SLIDERS-22) for the shown one before the worker sees it, and the commands
// the slider UI runs: value writes from drags, keys and playback, limit and option edits, and the
// per-frame animation step (SLIDERS-3, SLIDERS-21, SLIDERS-26 to SLIDERS-35). Package-internal
// apart from the commands the UI imports.

import { analyzeRows, type AnalysisResult } from "../analysis";
import { advance, playOnceDone } from "../../sliders/animation";
import {
  DEFAULT_SLIDER,
  nextPeriod,
  sameSlider,
  type LoopMode,
  type SliderSettings,
} from "../../sliders/model";
import { plainDecimal } from "../../sliders/numbers";
import { keyMove, snap, type KeyMove } from "../../sliders/range";
import {
  describeSlider,
  sliderTarget,
  withSliderValue,
  type SliderTarget,
  type SliderView,
} from "../../sliders/slider";
import type { HistoryStep, StoredRow } from "./document";
import type { AnalysisSettings } from "../analysis";

export type { SliderView } from "../../sliders/slider";

export interface DocumentAnalysis {
  analysis: AnalysisResult;
  sent: readonly StoredRow[]; // the rows as the worker gets them: slider rows hold their shown value
  sliders: ReadonlyMap<string, SliderView>; // by row id
}

function analyzeSources(rows: readonly StoredRow[], settings: AnalysisSettings): AnalysisResult {
  return analyzeRows(
    rows.map(({ id, latex, hidden, type, columns, logMode }) =>
      type === "table"
        ? { id, latex, hidden, columns: columns ?? [] }
        : { id, latex, hidden, logMode: logMode === true }
    ),
    settings
  );
}

/**
 * AR-51 with sliders: analyses the rows, describes each slider row, and when a slider shows a
 * value other than the one typed (outside hard limits, off the step) analyses again with the shown
 * value, which is then what the worker evaluates. The stored latex never changes here.
 */
export function analyzeDocument(
  rows: readonly StoredRow[],
  settings: AnalysisSettings
): DocumentAnalysis {
  const first = analyzeSources(rows, settings);
  const targets = new Map<string, SliderTarget>();
  const known = new Map<string, number>();
  for (const row of rows) {
    if (row.type === "table") continue;
    const target = sliderTarget(row.latex, first.byId.get(row.id));
    if (target === null) continue;
    targets.set(row.id, target);
    known.set(target.name, target.typed);
  }
  const sliders = new Map<string, SliderView>();
  let changed = false;
  const sent = rows.map((row) => {
    const target = targets.get(row.id);
    if (target === undefined) return row;
    const view = describeSlider(target, row.slider ?? DEFAULT_SLIDER, known);
    sliders.set(row.id, view);
    if (view.error !== null || view.value === target.typed) return row;
    changed = true;
    return { ...row, latex: withSliderValue(row.latex, view.value) };
  });
  return { analysis: changed ? analyzeSources(sent, settings) : first, sent, sliders };
}

// ── commands ──

/** The engine surface the commands use. */
export interface SliderHost {
  getSnapshot(): { rows: readonly { id: string; slider?: SliderView | null }[] };
  editRows(
    edit: (rows: readonly StoredRow[]) => StoredRow[] | null,
    step?: HistoryStep
  ): "row-limit" | null;
}

const STEP: HistoryStep = { kind: "step" };
const NONE: HistoryStep = { kind: "none" };

function viewOf(host: SliderHost, id: string): SliderView | null {
  return host.getSnapshot().rows.find((r) => r.id === id)?.slider ?? null;
}

/**
 * SLIDERS-22: a latex edit to row `id` (`commit` stores it). When a person typed a slider value
 * past a hard limit, that limit goes back to soft (−10 or 10); when the value is off the step, the
 * step is cleared, so the row then shows and uses what was typed. The change joins the edit's
 * history step. A row that was not a slider just before the edit (`a=`, `a=-`) has nothing to
 * loosen: the reference checks against the row's previous evaluation (typing `-` then `3` keeps a
 * hard min of 0, and the row shows 0).
 */
export function editSliderLatex(
  host: SliderHost,
  id: string,
  step: HistoryStep,
  typed: boolean,
  commit: () => void
): void {
  const before = viewOf(host, id);
  commit();
  const view = viewOf(host, id);
  if (!typed || view === null || view.error !== null || before === null || before.error !== null)
    return;
  const t = view.typed;
  const { range } = before; // the limits and step as last evaluated, before this edit
  const belowMin = range.hardMin && t < range.min;
  const aboveMax = range.hardMax && t > range.max;
  const offStep =
    range.step > 0 &&
    snap({
      target: t,
      step: range.step,
      hardMin: range.hardMin && !belowMin ? range.min : undefined,
      hardMax: range.hardMax && !aboveMax ? range.max : undefined,
    }) !== t;
  if (!belowMin && !aboveMax && !offStep) return;
  edit(
    host,
    id,
    (_row, s) => ({
      slider: {
        ...s,
        ...(belowMin && { hardMin: false, min: "-10" }),
        ...(aboveMax && { hardMax: false, max: "10" }),
        ...(offStep && { step: "" }),
      },
    }),
    step.kind === "group" ? step : NONE // a typing group takes it in; otherwise the edit's step
  );
}

/** One row changed by `change` (latex and settings), as one history step of `step`. */
function edit(
  host: SliderHost,
  id: string,
  change: (row: StoredRow, settings: SliderSettings) => { latex?: string; slider?: SliderSettings },
  step: HistoryStep
): void {
  host.editRows((rows) => {
    let touched = false;
    const next = rows.map((row) => {
      if (row.id !== id) return row;
      const settings = row.slider ?? DEFAULT_SLIDER;
      const out = change(row, settings);
      const latex = out.latex ?? row.latex;
      const slider = out.slider ?? settings;
      if (latex === row.latex && sameSlider(slider, settings)) return row;
      touched = true;
      return withSettings({ ...row, latex }, slider);
    });
    return touched ? next : null;
  }, step);
}

/** A row with `settings` stored, or with none when they are the defaults. */
function withSettings(row: StoredRow, settings: SliderSettings): StoredRow {
  const { slider: _drop, ...rest } = row;
  void _drop;
  return sameSlider(settings, DEFAULT_SLIDER) ? rest : { ...rest, slider: Object.freeze(settings) };
}

/** SLIDERS-21: the soft limits the slider shows, saved as numbers so they stay put. */
function savedSoftLimits(settings: SliderSettings, view: SliderView): SliderSettings {
  const { range } = view;
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return settings;
  return {
    ...settings,
    ...(!settings.hardMin && { min: plainDecimal(range.min) }),
    ...(!settings.hardMax && { max: plainDecimal(range.max) }),
  };
}

/** Per engine and row: the smoothly moving animation target and the last frame's time. */
const players = new WeakMap<SliderHost, Map<string, { target: number; last: number | null }>>();
function playersOf(host: SliderHost) {
  let map = players.get(host);
  if (map === undefined) players.set(host, (map = new Map()));
  return map;
}

/**
 * SLIDERS-24, SLIDERS-35: writes a dragged value (already snapped). Pauses playback; the first
 * write of a drag is the undo step (`first`), later ones join it.
 */
export function dragSlider(host: SliderHost, id: string, value: number, first: boolean): void {
  const view = viewOf(host, id);
  if (view === null || view.error !== null) return;
  edit(
    host,
    id,
    (row, s) => ({
      latex: withSliderValue(row.latex, value),
      slider: { ...(first ? savedSoftLimits(s, view) : s), isPlaying: false },
    }),
    first ? STEP : NONE
  );
}

/** SLIDERS-26, SLIDERS-27: one key's move, pausing playback and saving the soft limits first. */
export function keySlider(host: SliderHost, id: string, move: KeyMove): void {
  const view = viewOf(host, id);
  if (view === null || view.error !== null || view.disabled) return;
  const value = keyMove(view.range, view.value, move);
  edit(
    host,
    id,
    (row, s) => ({
      latex: withSliderValue(row.latex, value),
      slider: { ...savedSoftLimits(s, view), isPlaying: false },
    }),
    STEP
  );
}

/** SLIDERS-35, SLIDERS-36: typing into a playing slider's row pauses it first (no undo step). */
export function pauseSlider(host: SliderHost, id: string): void {
  edit(host, id, (_row, s) => ({ slider: { ...s, isPlaying: false } }), NONE);
}

/**
 * SLIDERS-29, SLIDERS-31: Play or Pause. Play saves the soft limits; Play once at its end
 * restarts from min. `now` (the frame clock's ms, as performance.now()) starts the animation's
 * clock at the press, so the first frame already moves by the time since it.
 */
export function togglePlay(host: SliderHost, id: string, now?: number): void {
  const view = viewOf(host, id);
  if (view === null) return;
  const { settings, range } = view;
  const done = playOnceDone(settings.loopMode, view.value, range);
  if (settings.isPlaying && !done) {
    edit(host, id, (_row, s) => ({ slider: { ...s, isPlaying: false } }), STEP);
    return;
  }
  playersOf(host).set(id, { target: done ? range.min : view.value, last: now ?? null });
  edit(
    host,
    id,
    (row, s) => ({
      latex: done ? withSliderValue(row.latex, range.min) : undefined,
      slider: { ...savedSoftLimits(s, view), isPlaying: true },
    }),
    STEP
  );
}

/** SLIDERS-31, SLIDERS-32: a loop mode; Play indefinitely clears the limits. */
export function setLoopMode(host: SliderHost, id: string, mode: LoopMode): void {
  const view = viewOf(host, id);
  if (view === null) return;
  playersOf(host).set(id, { target: view.range.min, last: null });
  edit(
    host,
    id,
    (_row, s) => ({
      slider: {
        ...s,
        loopMode: mode,
        playDirection: 1,
        ...(mode === "PLAY_INDEFINITELY" && { hardMin: false, hardMax: false, min: "", max: "" }),
      },
    }),
    STEP
  );
}

/** SLIDERS-33: the next speed up (+1) or down (-1); nothing past the list's ends. */
export function changeSpeed(host: SliderHost, id: string, direction: 1 | -1): number | null {
  const view = viewOf(host, id);
  if (view === null) return null;
  const period = nextPeriod(view.settings.animationPeriod, direction);
  if (period === null) return null;
  edit(host, id, (_row, s) => ({ slider: { ...s, animationPeriod: period } }), STEP);
  return period;
}

export type LimitField = "min" | "max" | "step";

/**
 * SLIDERS-16: a limit typed in the limits editor. A typed min or max is hard; an empty one goes
 * back to soft (−10 or 10). Typing joins one undo group per row while it continues (KB-2).
 */
export function setSliderLimit(
  host: SliderHost,
  id: string,
  field: LimitField,
  latex: string,
  now: number
): void {
  const empty = latex.trim() === "";
  edit(
    host,
    id,
    (_row, s) => ({
      slider:
        field === "step"
          ? { ...s, step: latex }
          : field === "min"
            ? { ...s, hardMin: !empty, min: empty ? "-10" : latex }
            : { ...s, hardMax: !empty, max: empty ? "10" : latex },
    }),
    { kind: "group", rowId: `${id}:${field}`, at: now }
  );
}

/**
 * SLIDERS-30, SLIDERS-31, SLIDERS-35: one animation frame at `now` (ms) for every playing slider,
 * written as one change with no undo step. Returns whether any slider is still playing.
 */
export function tickSliders(host: SliderHost, now: number): boolean {
  const playing = host
    .getSnapshot()
    .rows.filter((r) => r.slider != null && r.slider.settings.isPlaying && r.slider.error === null);
  const state = playersOf(host);
  for (const id of state.keys()) if (!playing.some((r) => r.id === id)) state.delete(id);
  const writes = new Map<string, { value: number; direction: 1 | -1 }>();
  for (const row of playing) {
    const view = row.slider!;
    const { settings, range } = view;
    if (playOnceDone(settings.loopMode, view.value, range) || view.disabled) continue;
    const player = state.get(row.id) ?? { target: view.value, last: null };
    state.set(row.id, player);
    const elapsed = player.last === null ? 0 : now - player.last;
    // A frame stamped before the press (its clock starts at the frame) waits for the next one.
    if (player.last === null || elapsed > 0) player.last = now;
    if (elapsed <= 0) continue;
    const frame = advance({
      range,
      loopMode: settings.loopMode,
      period: settings.animationPeriod,
      direction: settings.playDirection,
      target: player.target,
      elapsed,
    });
    player.target = frame.target;
    writes.set(row.id, { value: frame.value, direction: frame.direction });
  }
  if (writes.size > 0) {
    host.editRows(
      (rows) =>
        rows.map((row) => {
          const w = writes.get(row.id);
          if (w === undefined) return row;
          const s = row.slider ?? DEFAULT_SLIDER;
          const latex = withSliderValue(row.latex, w.value);
          const settings =
            s.playDirection === w.direction ? s : { ...s, playDirection: w.direction };
          return withSettings({ ...row, latex }, settings);
        }),
      NONE
    );
  }
  return playing.some(
    (r) =>
      !r.slider!.disabled &&
      !playOnceDone(r.slider!.settings.loopMode, r.slider!.value, r.slider!.range)
  );
}
