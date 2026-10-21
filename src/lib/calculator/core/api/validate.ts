// Hand-written validation of public API input (API-1, API-7, API-13). No Zod in
// core/api, so AR-44's guard sees no code-generation probe. Objects are strict: an unknown key
// throws invalid-argument. A key whose value is undefined counts as omitted. Every message names
// the method and the field, for example "setExpression: latex is longer than 2048 characters".
// Package-internal: the engine calls these before it changes anything.

import type { Viewport } from "../../plot/viewport";
import { TABLE_MODELS } from "../../regression/table-models";
import { LOOP_MODES, type SliderSettings } from "../../sliders/model";
import { CURVE_SLOTS } from "../../theme/skins";
import { MAX_ROW_CHARACTERS, MAX_ROWS } from "../latex";
import { KarmanCalculatorError } from "./errors";
import { MAX_CELL_CHARACTERS, MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "./document";
import {
  DEFAULT_SETTINGS,
  type AxisSettings,
  type CalculatorOptions,
  type CalculatorSettings,
  type CalculatorState,
  type ExpressionState,
  type SettingsUpdate,
  type TableRegressionState,
} from "./types";

type Check<T> = (value: unknown, method: string, field: string) => T;
type Fields = Record<string, unknown>;

/** API-7: the settings updateSettings accepts, in API-7 order. */
export const SETTINGS_KEYS: readonly (keyof CalculatorSettings)[] = Object.freeze([
  "angleMode",
  "complex",
  "showGrid",
  "polarGrid",
  "minorGridlines",
  "arrows",
  "axisNumbers",
  "xAxis",
  "yAxis",
  "lockViewport",
  "piAxisLabels",
  "displaySize",
  "reverseContrast",
  "keypad",
  "expressionsCollapsed",
  "mode",
  "reducedMotion",
  "trace",
  "pointsOfInterest",
  "brailleMode",
  "sixKeyInput",
] as const);

/** SETTINGS-13: keys added after saved states existed; a whole settings object may leave them out. */
const DEFAULTED_KEYS: ReadonlySet<keyof CalculatorSettings> = new Set([
  "brailleMode",
  "sixKeyInput",
  "trace",
  "pointsOfInterest",
]);

function invalid(method: string, text: string): never {
  throw new KarmanCalculatorError("invalid-argument", `${method}: ${text}`);
}

function unsupported(method: string, text: string): never {
  throw new KarmanCalculatorError("unsupported", `${method}: ${text}`);
}

/** A plain object (not null, an array, a Map or a Date) whose own keys are all in `keys`. */
function strictObject(
  value: unknown,
  method: string,
  field: string,
  keys: readonly string[]
): Fields {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    invalid(method, `${field} must be an object`);
  }
  const fields = value as Fields;
  for (const key of Object.keys(fields)) {
    if (!keys.includes(key)) invalid(method, `${field} has an unknown key "${key}"`);
  }
  return fields;
}

/** An own property, so nothing inherited from a prototype is read as input. */
function own(fields: Fields, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined;
}

const bool: Check<boolean> = (value, method, field) =>
  typeof value === "boolean" ? value : invalid(method, `${field} must be true or false`);

const text: Check<string> = (value, method, field) =>
  typeof value === "string" ? value : invalid(method, `${field} must be a string`);

function oneOf<T extends string>(allowed: readonly T[]): Check<T> {
  return (value, method, field) =>
    typeof value === "string" && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : invalid(method, `${field} must be ${allowed.map((a) => `"${a}"`).join(" or ")}`);
}

/** API-7's phase rule: a well-formed value other than `only` throws unsupported. */
function phaseOne<T>(check: Check<T>, only: T): Check<T> {
  return (value, method, field) => {
    const checked = check(value, method, field);
    if (checked !== only) {
      unsupported(method, `${field} accepts only ${JSON.stringify(only)} for now`);
    }
    return checked;
  };
}

const AXIS_KEYS = ["show", "label", "step"] as const;

/** `{ show, label, step }`, all three required; step is null (automatic) or a finite number > 0. */
const axis: Check<AxisSettings> = (value, method, field) => {
  const fields = strictObject(value, method, field, AXIS_KEYS);
  const step = own(fields, "step");
  if (step !== null && !(typeof step === "number" && Number.isFinite(step) && step > 0)) {
    invalid(method, `${field}.step must be null or a finite number greater than 0`);
  }
  return {
    show: bool(own(fields, "show"), method, `${field}.show`),
    label: text(own(fields, "label"), method, `${field}.label`),
    step,
  };
};

const SETTING_CHECKS: { [K in keyof CalculatorSettings]: Check<CalculatorSettings[K]> } = {
  angleMode: oneOf(["radians", "degrees"]),
  complex: bool,
  showGrid: bool,
  polarGrid: bool,
  minorGridlines: bool,
  arrows: bool,
  axisNumbers: bool,
  xAxis: axis,
  yAxis: axis,
  lockViewport: bool, // SETTINGS-20
  piAxisLabels: phaseOne(bool, false),
  displaySize: oneOf(["default", "large"]), // SETTINGS-11
  reverseContrast: bool, // SETTINGS-12
  keypad: bool,
  expressionsCollapsed: bool,
  mode: phaseOne(oneOf(["graphing", "scientific"]), "graphing"),
  reducedMotion: bool,
  trace: bool,
  pointsOfInterest: bool,
  brailleMode: oneOf(["none", "nemeth", "ueb"]),
  sixKeyInput: bool,
};

const seed: Check<number> = (value, method, field) =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : invalid(method, `${field} must be a finite number`);

const onError: Check<(error: Error) => void> = (value, method, field) =>
  typeof value === "function"
    ? (value as (error: Error) => void)
    : invalid(method, `${field} must be a function`);

const OPTION_CHECKS: {
  [K in keyof CalculatorOptions]-?: Check<NonNullable<CalculatorOptions[K]>>;
} = {
  mode: SETTING_CHECKS.mode,
  angleMode: SETTING_CHECKS.angleMode,
  keypad: bool,
  expressionsCollapsed: bool,
  onError,
  seed,
  reducedMotion: bool,
  displaySize: SETTING_CHECKS.displaySize,
  reverseContrast: SETTING_CHECKS.reverseContrast,
};
const OPTION_KEYS = Object.keys(OPTION_CHECKS);

/** API-1: the constructor options; undefined means no options. */
export function validateOptions(options: unknown): CalculatorOptions {
  if (options === undefined) return {};
  const method = "KarmanCalculator";
  const fields = strictObject(options, method, "options", OPTION_KEYS);
  const out: Fields = {};
  for (const key of OPTION_KEYS) {
    const value = own(fields, key);
    if (value === undefined) continue;
    out[key] = OPTION_CHECKS[key as keyof CalculatorOptions](value, method, `options.${key}`);
  }
  return out as CalculatorOptions;
}

/** API-7: a partial settings object for updateSettings. */
export function validateSettingsUpdate(partial: unknown): SettingsUpdate {
  return settingsFields(partial, "updateSettings", "settings", false);
}

/** A whole settings object (setState): every key required except DEFAULTED_KEYS. */
export function validateSettings(settings: unknown): CalculatorSettings {
  return settingsFields(settings, "setState", "settings", true) as CalculatorSettings;
}

function settingsFields(
  value: unknown,
  method: string,
  field: string,
  complete: boolean
): SettingsUpdate {
  const fields = strictObject(value, method, field, SETTINGS_KEYS);
  const out: Fields = {};
  for (const key of SETTINGS_KEYS) {
    const name = complete ? `${field}.${key}` : key;
    const setting = own(fields, key);
    if (setting === undefined) {
      if (complete && DEFAULTED_KEYS.has(key)) out[key] = DEFAULT_SETTINGS[key];
      else if (complete) invalid(method, `${name} is missing`);
      continue;
    }
    out[key] = SETTING_CHECKS[key](setting, method, name);
  }
  return out as SettingsUpdate;
}

const BOUND_KEYS = ["left", "right", "bottom", "top"] as const;

/** Bounds named `field`; `prefix` starts each bound's name in messages ("" or "viewport."). */
function boundsFields(value: unknown, method: string, field: string, prefix: string): Viewport {
  const fields = strictObject(value, method, field, BOUND_KEYS);
  const [left, right, bottom, top] = BOUND_KEYS.map((key) => {
    const bound = own(fields, key);
    return typeof bound === "number" && Number.isFinite(bound)
      ? bound
      : invalid(method, `${prefix}${key} must be a finite number`);
  });
  if (!(left < right)) invalid(method, `${prefix}left must be less than ${prefix}right`);
  if (!(bottom < top)) invalid(method, `${prefix}bottom must be less than ${prefix}top`);
  return { left, right, bottom, top };
}

/** API-7: exactly left, right, bottom and top, finite, left < right and bottom < top. The G-23
 * limits are not checked here: setMathBounds and setState clamp (Decision 11). */
export function validateBounds(bounds: unknown): Viewport {
  return boundsFields(bounds, "setMathBounds", "bounds", "");
}

const EXPRESSION_KEYS = [
  "id",
  "type",
  "latex",
  "color",
  "hidden",
  "lineStyle",
  "pointStyle",
  "slider",
  "sliderBounds",
  "columns",
  "regression",
  "displayEvaluationAsFraction",
] as const;
// API-2 and OI-23: other item types are rejected as unsupported; tables ship with D-1 (parity)
const UNSUPPORTED_TYPES: readonly string[] = ["note", "folder", "image", "text"];
const COLUMN_KEYS = ["latex", "values", "color", "hidden"] as const;
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
const SLIDER_KEYS = ["min", "max", "step"] as const;
const SLIDER_SETTING_KEYS = [
  "hardMin",
  "hardMax",
  "min",
  "max",
  "step",
  "loopMode",
  "animationPeriod",
  "playDirection",
  "isPlaying",
] as const;

const id: Check<string> = (value, method, field) =>
  typeof value === "string" && value !== ""
    ? value
    : invalid(method, `${field} must be a non-empty string`);

const latex: Check<string> = (value, method, field) => {
  const checked = text(value, method, field);
  if (checked.length > MAX_ROW_CHARACTERS) {
    invalid(method, `${field} is longer than ${MAX_ROW_CHARACTERS} characters`); // NM-42
  }
  return checked;
};

/** A skin slot "c1".."c6" (TH-10) or "#rrggbb" (TH-11), returned lower-cased. */
const colour: Check<string> = (value, method, field) => {
  if (typeof value === "string") {
    if ((CURVE_SLOTS as readonly string[]).includes(value)) return value;
    if (HEX_COLOUR.test(value)) return value.toLowerCase();
  }
  return invalid(method, `${field} must be "c1" to "c6" or "#rrggbb"`);
};

const sliderBounds: Check<NonNullable<ExpressionState["sliderBounds"]>> = (
  value,
  method,
  field
) => {
  const fields = strictObject(value, method, field, SLIDER_KEYS);
  return {
    min: text(own(fields, "min"), method, `${field}.min`),
    max: text(own(fields, "max"), method, `${field}.max`),
    step: text(own(fields, "step"), method, `${field}.step`),
  };
};

/** SLIDERS-11: the saved `slider` object; every field optional, each checked by its type. */
const slider: Check<NonNullable<ExpressionState["slider"]>> = (value, method, field) => {
  const fields = strictObject(value, method, field, SLIDER_SETTING_KEYS);
  const out: { -readonly [K in keyof SliderSettings]?: SliderSettings[K] } = {};
  const at = (key: (typeof SLIDER_SETTING_KEYS)[number]) => own(fields, key);
  const name = (key: string) => `${field}.${key}`;
  for (const key of ["hardMin", "hardMax", "isPlaying"] as const) {
    if (at(key) !== undefined) out[key] = bool(at(key), method, name(key));
  }
  for (const key of ["min", "max", "step"] as const) {
    if (at(key) !== undefined) out[key] = text(at(key), method, name(key));
  }
  if (at("loopMode") !== undefined) {
    out.loopMode = oneOf(LOOP_MODES)(at("loopMode"), method, name("loopMode"));
  }
  const period = at("animationPeriod");
  if (period !== undefined) {
    if (typeof period !== "number" || !Number.isFinite(period) || period <= 0) {
      invalid(method, `${name("animationPeriod")} must be a positive number`);
    }
    out.animationPeriod = period;
  }
  const direction = at("playDirection");
  if (direction !== undefined) {
    if (direction !== 1 && direction !== -1)
      invalid(method, `${name("playDirection")} must be 1 or -1`);
    out.playDirection = direction;
  }
  return out;
};

/** D-1, D-6, D-8, D-9: at most 10 columns of at most 1,000 cells of at most 128 characters. */
const columns: Check<NonNullable<ExpressionState["columns"]>> = (value, method, field) => {
  if (!Array.isArray(value)) return invalid(method, `${field} must be an array`);
  if (value.length > MAX_TABLE_COLUMNS)
    invalid(method, `${field} has more than ${MAX_TABLE_COLUMNS} columns: at most 10 columns`);
  return value.map((item: unknown, i) => {
    const name = `${field}[${i}]`;
    const fields = strictObject(item, method, name, COLUMN_KEYS);
    // A computed column's state has no values (RT-3), so a missing list is an empty one.
    const values = own(fields, "values") ?? [];
    if (!Array.isArray(values) || values.length > MAX_TABLE_ROWS) {
      invalid(method, `${name}.values must be an array of at most ${MAX_TABLE_ROWS} strings`);
    }
    const column: NonNullable<ExpressionState["columns"]>[number] = {
      latex: text(own(fields, "latex"), method, `${name}.latex`),
      values: values.map((v: unknown, k: number) => {
        const cell = text(v, method, `${name}.values[${k}]`);
        if (cell.length > MAX_CELL_CHARACTERS) invalid(method, `${name}.values[${k}] is too long`);
        return cell;
      }),
    };
    if (own(fields, "color") !== undefined)
      column.color = colour(own(fields, "color"), method, `${name}.color`);
    if (own(fields, "hidden") !== undefined)
      column.hidden = bool(own(fields, "hidden"), method, `${name}.hidden`);
    return column;
  });
};

const REGRESSION_KEYS = [
  "type",
  "columns",
  "color",
  "hidden",
  "lineStyle",
  "isLogMode",
  "residualVariable",
] as const;

/** RT-28: a table regression; x is the first column, y a later one. */
const regression: Check<TableRegressionState> = (value, method, field) => {
  const fields = strictObject(value, method, field, REGRESSION_KEYS);
  const type = oneOf(TABLE_MODELS)(own(fields, "type"), method, `${field}.type`);
  const columnFields = strictObject(own(fields, "columns"), method, `${field}.columns`, ["x", "y"]);
  const index = (key: "x" | "y") => {
    const v = own(columnFields, key);
    return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < MAX_TABLE_COLUMNS
      ? v
      : invalid(method, `${field}.columns.${key} must be a column index`);
  };
  const x = index("x"),
    y = index("y");
  if (x !== 0 || y < 1) invalid(method, `${field}.columns needs x 0 and a later y column`);
  const out: TableRegressionState = { type, columns: { x, y } };
  if (own(fields, "color") !== undefined)
    out.color = colour(own(fields, "color"), method, `${field}.color`);
  if (own(fields, "hidden") !== undefined)
    out.hidden = bool(own(fields, "hidden"), method, `${field}.hidden`);
  if (own(fields, "isLogMode") !== undefined) {
    out.isLogMode = bool(own(fields, "isLogMode"), method, `${field}.isLogMode`);
  }
  if (own(fields, "lineStyle") !== undefined) {
    out.lineStyle = oneOf(["solid", "dashed", "dotted"] as const)(
      own(fields, "lineStyle"),
      method,
      `${field}.lineStyle`
    );
  }
  if (own(fields, "residualVariable") !== undefined) {
    const name = text(own(fields, "residualVariable"), method, `${field}.residualVariable`);
    if (!/^e_\{?[0-9a-z]+\}?$/i.test(name))
      invalid(method, `${field}.residualVariable must be like e_{1}`);
    out.residualVariable = name;
  }
  return out;
};

/**
 * One expression state named `field`; `prefix` starts each field's name in messages ("" or
 * "expressions[i]."). Omitted fields stay omitted.
 */
function expressionFields(
  state: unknown,
  method: string,
  field: string,
  prefix: string
): ExpressionState {
  if (Object.prototype.toString.call(state) === "[object Object]") {
    const type = own(state as Fields, "type");
    if (typeof type === "string" && UNSUPPORTED_TYPES.includes(type)) {
      unsupported(method, `${prefix}type "${type}" is not supported`);
    }
  }
  const fields = strictObject(state, method, field, EXPRESSION_KEYS);
  const out: ExpressionState = { id: id(own(fields, "id"), method, `${prefix}id`) };
  const value = (key: (typeof EXPRESSION_KEYS)[number]) => own(fields, key);
  const check = <T>(key: (typeof EXPRESSION_KEYS)[number], checker: Check<T>) =>
    checker(value(key), method, `${prefix}${key}`);
  if (value("type") !== undefined) {
    out.type = check("type", oneOf(["expression", "table"] as const));
  }
  if (value("latex") !== undefined) out.latex = check("latex", latex);
  if (value("color") !== undefined) out.color = check("color", colour);
  if (value("hidden") !== undefined) out.hidden = check("hidden", bool);
  if (value("displayEvaluationAsFraction") !== undefined)
    out.displayEvaluationAsFraction = check("displayEvaluationAsFraction", bool);
  if (value("lineStyle") !== undefined) {
    out.lineStyle = check("lineStyle", oneOf(["solid", "dashed", "dotted"] as const));
  }
  if (value("pointStyle") !== undefined) {
    out.pointStyle = check("pointStyle", oneOf(["filled", "open", "cross"] as const));
  }
  if (value("slider") !== undefined) out.slider = check("slider", slider);
  if (value("sliderBounds") !== undefined) out.sliderBounds = check("sliderBounds", sliderBounds);
  if (value("columns") !== undefined) {
    if (out.type !== "table") invalid(method, `${prefix}columns needs type "table"`);
    out.columns = check("columns", columns);
  }
  if (value("regression") !== undefined) {
    if (out.type !== "table") invalid(method, `${prefix}regression needs type "table"`);
    out.regression = check("regression", regression);
  }
  return out;
}

/** API-2, API-13: one expression state for setExpression; omitted fields stay omitted. */
export function validateExpressionState(state: unknown): ExpressionState {
  return expressionFields(state, "setExpression", "state", "");
}

/** API-4: the `{ id }` list of removeExpressions. */
export function validateRowRefs(list: unknown): { id: string }[] {
  const method = "removeExpressions";
  if (!Array.isArray(list)) invalid(method, "list must be an array");
  const refs: { id: string }[] = [];
  for (let i = 0; i < list.length; i++) {
    const fields = strictObject(list[i], method, `list[${i}]`, ["id"]);
    refs.push({ id: id(own(fields, "id"), method, `list[${i}].id`) });
  }
  return refs;
}

const STATE_KEYS = [
  "version",
  "mode",
  "settings",
  "viewport",
  "expressions",
  "scientific",
] as const;

/**
 * API-5, API-13, NM-42: a whole state for setState, with all six keys: version 1, mode and settings
 * under API-7's phase rule, finite ordered bounds (clamped later, Decision 11), at most MAX_ROWS
 * expressions with distinct ids, and an empty scientific object until API-14.
 */
export function validateState(state: unknown): CalculatorState {
  const method = "setState";
  const fields = strictObject(state, method, "state", STATE_KEYS);
  for (const key of STATE_KEYS) {
    if (own(fields, key) === undefined) invalid(method, `${key} is missing`);
  }
  if (own(fields, "version") !== 1) invalid(method, "version must be 1");
  SETTING_CHECKS.mode(own(fields, "mode"), method, "mode");
  const settings = validateSettings(own(fields, "settings"));
  const viewport = boundsFields(own(fields, "viewport"), method, "viewport", "viewport.");
  const list = own(fields, "expressions");
  if (!Array.isArray(list)) invalid(method, "expressions must be an array");
  if (list.length > MAX_ROWS) invalid(method, `more than ${MAX_ROWS} rows`);
  const ids = new Set<string>();
  const expressions = list.map((item: unknown, i) => {
    const expression = expressionFields(item, method, `expressions[${i}]`, `expressions[${i}].`);
    if (ids.has(expression.id)) invalid(method, `expressions[${i}].id is a duplicate`);
    ids.add(expression.id);
    return expression;
  });
  strictObject(own(fields, "scientific"), method, "scientific", []);
  return { version: 1, mode: "graphing", settings, viewport, expressions, scientific: {} };
}

/** API-5, API-6: the `{ allowUndo }` options of setState and setBlank; omitted means false. */
export function validateAllowUndo(options: unknown, method: string): boolean {
  if (options === undefined) return false;
  const allowUndo = own(strictObject(options, method, "options", ["allowUndo"]), "allowUndo");
  return allowUndo === undefined ? false : bool(allowUndo, method, "options.allowUndo");
}
