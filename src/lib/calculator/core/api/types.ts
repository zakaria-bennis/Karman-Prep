// Public calculator API types (spec d-architecture-integration.md
// section 11). Shared by the headless engine, KarmanCalculator and the hosts.

import type { PixelSize, Viewport } from "../../plot/viewport";

export type AngleMode = "radians" | "degrees";
export type LineStyle = "solid" | "dashed" | "dotted"; // R-4 (Phase 2 picker)
export type PointStyle = "filled" | "open" | "cross";
/** SETTINGS-13: the Braille code the settings popover records (UI only; no Braille input yet). */
export type BrailleMode = "none" | "nemeth" | "ueb";
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
  displaySize: "default" | "large";
  reverseContrast: boolean;
  keypad: boolean;
  expressionsCollapsed: boolean;
  mode: "graphing" | "scientific";
  reducedMotion: boolean;
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
  displaySize: "default",
  reverseContrast: false,
  keypad: false,
  expressionsCollapsed: false,
  mode: "graphing",
  reducedMotion: false,
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
  displaySize?: "default" | "large";
  reverseContrast?: boolean;
}
export interface ExpressionState {
  id: string;
  type?: "expression" | "table";
  latex?: string;
  color?: string; // "c1".."c6" or "#rrggbb"
  hidden?: boolean;
  lineStyle?: LineStyle;
  pointStyle?: PointStyle;
  sliderBounds?: { min: string; max: string; step: string };
  columns?: { latex: string; values: string[]; color?: string; hidden?: boolean }[];
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
