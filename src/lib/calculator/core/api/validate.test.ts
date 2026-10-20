import { expect, it } from "vitest";
import { KarmanCalculatorError } from "./errors";
import { DEFAULT_SETTINGS } from "./types";
import * as v from "./validate";

const code = (f: () => unknown) => {
  try {
    f();
    return "none";
  } catch (e) {
    return e instanceof KarmanCalculatorError ? e.code : "other";
  }
};
it("API-1 options validate with their defaults and the Phase 1 rules", () => {
  expect(v.validateOptions(undefined)).toEqual({});
  expect(v.validateOptions({ angleMode: "degrees", seed: 7, keypad: true })).toEqual({
    angleMode: "degrees",
    seed: 7,
    keypad: true,
  });
  for (const o of [{ mode: "scientific" }, { displaySize: "large" }, { reverseContrast: true }])
    expect(code(() => v.validateOptions(o))).toBe("unsupported");
  for (const o of [
    null,
    3,
    { angleMode: "gradians" },
    { keypad: "yes" },
    { seed: Number.NaN },
    { onError: 1 },
    { transferTarget: "x" },
    { mode: "3d" },
  ])
    expect(code(() => v.validateOptions(o))).toBe("invalid-argument");
});
it("API-7 updateSettings accepts only the listed keys and the Phase 1 values", () => {
  expect(v.SETTINGS_KEYS).toEqual([
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
  ]);
  expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual([...v.SETTINGS_KEYS].sort());
  expect(
    v.validateSettingsUpdate({ angleMode: "degrees", xAxis: { show: false, label: "t", step: 2 } })
  ).toEqual({ angleMode: "degrees", xAxis: { show: false, label: "t", step: 2 } });
  for (const [k, val] of [
    ["lockViewport", true],
    ["piAxisLabels", true],
    ["displaySize", "large"],
    ["reverseContrast", true],
    ["mode", "scientific"],
  ] as const)
    expect(code(() => v.validateSettingsUpdate({ [k]: val }))).toBe("unsupported");
  for (const bad of [
    { zoom: 2 },
    { showGrid: 1 },
    { xAxis: { show: true } },
    { yAxis: { show: true, label: "", step: 0 } },
    { mode: "polar" },
    null,
  ])
    expect(code(() => v.validateSettingsUpdate(bad))).toBe("invalid-argument");
});
it("POI-TRACE-2 trace and pointsOfInterest are booleans a saved settings object may omit", () => {
  expect(v.validateSettingsUpdate({ trace: false, pointsOfInterest: false })).toEqual({
    trace: false,
    pointsOfInterest: false,
  });
  expect(code(() => v.validateSettingsUpdate({ trace: "no" }))).toBe("invalid-argument");
  const { trace: _t, pointsOfInterest: _p, ...saved } = DEFAULT_SETTINGS;
  void _t;
  void _p;
  expect(v.validateSettings({ ...saved })).toMatchObject({ trace: true, pointsOfInterest: true });
});
it("API-7 bounds need finite left < right and bottom < top", () => {
  expect(v.validateBounds({ left: -1, right: 1, bottom: -2, top: 2 })).toEqual({
    left: -1,
    right: 1,
    bottom: -2,
    top: 2,
  });
  // finite and ordered but outside G-23: valid here; setMathBounds clamps it
  expect(v.validateBounds({ left: -1e16, right: 0, bottom: 0, top: 1 })).toEqual({
    left: -1e16,
    right: 0,
    bottom: 0,
    top: 1,
  });
  for (const b of [
    { left: 1, right: 1, bottom: 0, top: 1 },
    { left: 0, right: 1, bottom: 2, top: 1 },
    { left: Number.NaN, right: 1, bottom: 0, top: 1 },
    { left: 0, right: Number.POSITIVE_INFINITY, bottom: 0, top: 1 },
    { left: 0, right: 1, bottom: 0 },
    { left: 0, right: 1, bottom: 0, top: 1, extra: 1 },
    null,
  ])
    expect(code(() => v.validateBounds(b))).toBe("invalid-argument");
});
it("API-13 malformed expression states throw invalid-argument", () => {
  expect(v.validateExpressionState({ id: "a", color: "#A0b1C2" })).toEqual({
    id: "a",
    color: "#a0b1c2",
  });
  for (const s of [
    { id: "" },
    { id: 3 },
    { id: "a", latex: 5 },
    { id: "a", color: "red" },
    { id: "a", color: "c7" },
    { id: "a", hidden: "no" },
    { id: "a", lineStyle: "wavy" },
    { id: "a", columns: [] },
    { id: "a", extra: 1 },
    { id: "a", latex: "1".repeat(2049) },
  ])
    expect(code(() => v.validateExpressionState(s))).toBe("invalid-argument");
  expect(new KarmanCalculatorError("destroyed", "x")).toMatchObject({
    name: "KarmanCalculatorError",
    code: "destroyed",
    message: "x",
  });
});
