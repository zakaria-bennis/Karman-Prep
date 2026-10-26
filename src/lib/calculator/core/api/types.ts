// Public calculator API types (spec d-architecture-integration.md
// section 11). Shared by the headless engine, KarmanCalculator and the hosts.

import type { PixelSize, Viewport } from "../../plot/viewport";
import type { TableModel } from "../../regression/table-models";
import type { SavedSlider } from "../../sliders/model";

export type AngleMode = "radians" | "degrees";
export type LineStyle = "solid" | "dashed" | "dotted"; // R-4 (Phase 2 picker)
export type PointStyle = "filled" | "open" | "cross";
/** SETTINGS-13: the Braille code the settings popover records (UI only; no Braille input yet). */
export type BrailleMode = "none" | "nemeth" | "ueb";
/**
 * SETTINGS-11 (founder decision, 2026-10-26): the expression list's text size, one of the seven
 * notches of the settings popover's size slider. 3 is the default; 5 is the reference's Large.
 */
export type DisplaySize = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const DISPLAY_SIZES: readonly DisplaySize[] = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export interface AxisSettings {
  show: boolean;
  label: string;
  step: number | null;
} // null = automatic
export interface CalculatorSettings {
  angleMode: AngleMode;
  complex: boolean;
  showGrid: boolean;
  polarGrid: boolean;
  minorGridlines: boolean;
  arrows: boolean;
  axisNumbers: boolean;
  xAxis: AxisSettings;
  yAxis: AxisSettings;
  lockViewport: boolean;
  piAxisLabels: boolean;
  displaySize: DisplaySize;
  keypad: boolean;
  expressionsCollapsed: boolean;
  mode: "graphing" | "scientific";
  reducedMotion: boolean;
  /** POI-TRACE-2: pressing a curve traces it; off, a press only selects it and no dots show. */
  trace: boolean;
  /** POI-TRACE-2: the selected curve's grey dots (both this and trace must be on). */
  pointsOfInterest: boolean;
  brailleMode: BrailleMode;
  sixKeyInput: boolean;
}

/** S-9: the per-question defaults (and API-1's option defaults). Deep-frozen. */
export const DEFAULT_SETTINGS: CalculatorSettings = Object.freeze({
  angleMode: "radians",
  complex: false,
  showGrid: true,
  polarGrid: false,
  minorGridlines: true,
  arrows: false,
  axisNumbers: true,
  xAxis: Object.freeze({ show: true, label: "", step: null }),
  yAxis: Object.freeze({ show: true, label: "", step: null }),
  lockViewport: false,
  piAxisLabels: false,
  displaySize: 3,
  keypad: false,
  expressionsCollapsed: false,
  mode: "graphing",
  reducedMotion: false,
  trace: true,
  pointsOfInterest: true,
  brailleMode: "none",
  sixKeyInput: false,
});

export interface CalculatorOptions {
  mode?: "graphing" | "scientific";
  angleMode?: AngleMode;
  keypad?: boolean;
  expressionsCollapsed?: boolean;
  onError?: (error: Error) => void;
  seed?: number;
  reducedMotion?: boolean;
  displaySize?: DisplaySize;
}
export interface ExpressionState {
  id: string;
  type?: "expression" | "table";
  latex?: string;
  color?: string; // "c1".."c6" or "#rrggbb"
  hidden?: boolean;
  lineStyle?: LineStyle;
  pointStyle?: PointStyle;
  slider?: SavedSlider; // SLIDERS-11: settings that differ from the defaults
  sliderBounds?: { min: string; max: string; step: string }; // input only: non-empty bounds are hard
  columns?: { latex: string; values: string[]; color?: string; hidden?: boolean }[];
  regression?: TableRegressionState; // RT-28: tables only
  displayEvaluationAsFraction?: boolean; // R-5: Desmos's per-row decimal/fraction choice
}
/** RT-28: a table's regression; `columns.x` is always 0. */
export interface TableRegressionState {
  type: TableModel;
  columns: { x: number; y: number };
  color?: string;
  hidden?: boolean;
  lineStyle?: LineStyle;
  isLogMode?: boolean;
  residualVariable?: string;
}
export interface CalculatorState {
  version: 1;
  mode: "graphing";
  settings: CalculatorSettings;
  viewport: Viewport;
  expressions: ExpressionState[];
  scientific: Record<string, never>;
}
export type SettingsUpdate = Partial<CalculatorSettings>;
export type ApiEvaluation =
  | { type: "number"; value: number }
  | { type: "complex"; value: { re: number; im: number } }
  | { type: "list"; value: number[] }
  | { type: "point"; value: [number, number] }
  | { type: "undefined" }
  | { type: "other"; display: string }; // "other": OI-24
export interface ExpressionAnalysis {
  isGraphable: boolean;
  isError: boolean;
  errorMessage?: string;
  evaluationDisplayed: boolean;
  evaluation?: ApiEvaluation;
}
export type ObservableName =
  | "expressionAnalysis"
  | "graphpaperBounds"
  | "settings"
  | "focusedExpression"
  | "mode";
export interface GraphpaperBounds {
  mathCoordinates: Viewport;
  pixelCoordinates: PixelSize;
}
export interface ChangeEvent {
  revision: number;
  isUserInitiated: boolean;
}
