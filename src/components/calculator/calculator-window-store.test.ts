// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import {
  WINDOW_STORAGE_KEY,
  calculatorWindowStore,
  PREFERENCE_KEYS,
  parseStoredGeometry,
  preferencesOf,
  clampDockWidth,
  clampFloatingRect,
  defaultDockWidth,
  defaultFloatingRect,
  windowModeFor,
} from "./calculator-window-store";
import { DEFAULT_SETTINGS } from "@/lib/calculator/core/api/types";

const get = () => calculatorWindowStore.get();

beforeEach(() => calculatorWindowStore.resetForTests());

/** A reload: the page state goes, the stored geometry stays. */
function reload() {
  const stored = localStorage.getItem(WINDOW_STORAGE_KEY);
  calculatorWindowStore.resetForTests();
  if (stored !== null) localStorage.setItem(WINDOW_STORAGE_KEY, stored);
}

it("AR-25 the store starts empty, merges patches and notifies subscribers", () => {
  expect(get()).toEqual({
    mode: null,
    restoreMode: "floating",
    floatingRect: null,
    dockWidth: null,
    preferences: null,
  });
  const listener = vi.fn();
  const off = calculatorWindowStore.subscribe(listener);
  calculatorWindowStore.set({ floatingRect: { x: 200, y: 150, width: 500, height: 400 } });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(get().floatingRect).toEqual({ x: 200, y: 150, width: 500, height: 400 });
  off();
  calculatorWindowStore.set({ dockWidth: 500 });
  expect(listener).toHaveBeenCalledTimes(1);
});

it("AR-26 floating and docked set the restore mode; maximized and full screen keep it", () => {
  calculatorWindowStore.set({ mode: "docked" });
  expect(get().restoreMode).toBe("docked");
  calculatorWindowStore.set({ mode: "fullscreen" });
  expect(get().restoreMode).toBe("docked");
  expect(windowModeFor(get(), false)).toBe("docked");
  expect(windowModeFor(get(), true)).toBe("fullscreen");
  calculatorWindowStore.set({ mode: "maximized" });
  expect(windowModeFor(get(), false)).toBe("maximized");
  calculatorWindowStore.set({ mode: "floating" });
  expect(get().restoreMode).toBe("floating");
});

it("AR-22 floating geometry starts at 16, 64 with its default size and is clamped to the viewport", () => {
  const view = { width: 1280, height: 800 };
  expect(defaultFloatingRect(view)).toEqual({ x: 16, y: 64, width: 880, height: 600 });
  expect(defaultFloatingRect({ width: 1024, height: 560 })).toEqual({
    x: 16,
    y: 64,
    width: 880,
    height: 480,
  });
  expect(clampFloatingRect({ x: 1000, y: -5, width: 880, height: 600 }, view)).toEqual({
    x: 400,
    y: 0,
    width: 880,
    height: 600,
  });
  expect(clampFloatingRect({ x: 10, y: 10, width: 100, height: 100 }, view)).toEqual({
    x: 10,
    y: 10,
    width: 360,
    height: 280,
  });
  expect(clampFloatingRect({ x: 5, y: 5, width: 2000, height: 1500 }, view)).toEqual({
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
  });
});

it("AR-23 the dock defaults to clamp(400px, 45vw, 720px) and stays between 400 and min(900, 100vw - 480)", () => {
  expect([800, 1024, 1280, 1920].map(defaultDockWidth)).toEqual([400, 461, 576, 720]);
  expect([
    clampDockWidth(350, 1280),
    clampDockWidth(1000, 1280),
    clampDockWidth(1000, 1920),
    clampDockWidth(600, 1024),
  ]).toEqual([400, 800, 900, 544]);
});

it("the geometry survives a reload through localStorage; preferences stay in the page session (owner, 2026-10-21)", () => {
  const rect = { x: 300, y: 120, width: 520, height: 410 };
  calculatorWindowStore.set({ mode: "floating", floatingRect: rect, dockWidth: 610 });
  calculatorWindowStore.set({ preferences: { angleMode: "degrees" } as never });
  expect(JSON.parse(localStorage.getItem(WINDOW_STORAGE_KEY)!)).toEqual({
    mode: "floating",
    restoreMode: "floating",
    floatingRect: rect,
    dockWidth: 610,
  });
  reload();
  expect(get()).toEqual({
    mode: "floating",
    restoreMode: "floating",
    floatingRect: rect,
    dockWidth: 610,
    preferences: null,
  });
});

it("maximized is kept across a reload; full screen is stored as the mode to restore", () => {
  calculatorWindowStore.set({ mode: "docked" });
  calculatorWindowStore.set({ mode: "maximized" });
  reload();
  expect(get()).toMatchObject({ mode: "maximized", restoreMode: "docked" });
  calculatorWindowStore.set({ mode: "fullscreen" });
  reload();
  expect(get()).toMatchObject({ mode: "docked", restoreMode: "docked" });
});

it("malformed or partial stored geometry is ignored field by field", () => {
  expect(parseStoredGeometry(null)).toEqual({});
  expect(parseStoredGeometry("{not json")).toEqual({});
  expect(parseStoredGeometry("42")).toEqual({});
  expect(
    parseStoredGeometry(
      JSON.stringify({
        mode: "fullscreen",
        restoreMode: "maximized",
        floatingRect: { x: 1, y: 2, width: "wide", height: 3 },
        dockWidth: 500,
      })
    )
  ).toEqual({ dockWidth: 500 });
  expect(
    parseStoredGeometry(
      JSON.stringify({ mode: "docked", floatingRect: { x: 1, y: 2, width: 400, height: 300 } })
    )
  ).toEqual({ mode: "docked", floatingRect: { x: 1, y: 2, width: 400, height: 300 } });
});

it("the store works when storage throws on every access", () => {
  const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("SecurityError");
  });
  const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  calculatorWindowStore.resetForTests();
  expect(get().mode).toBeNull();
  calculatorWindowStore.set({ mode: "floating", dockWidth: 500 });
  expect(get()).toMatchObject({ mode: "floating", dockWidth: 500 });
  spy.mockRestore();
  setSpy.mockRestore();
});

it("the preference keys leave out mode, reduced motion and the collapsed list", () => {
  expect(PREFERENCE_KEYS).toContain("angleMode");
  expect(PREFERENCE_KEYS).not.toContain("mode");
  expect(PREFERENCE_KEYS).not.toContain("reducedMotion");
  expect(PREFERENCE_KEYS).not.toContain("expressionsCollapsed");
  const settings = { ...DEFAULT_SETTINGS, xAxis: { show: true, label: "t", step: null } };
  const copy = preferencesOf(settings);
  expect(copy.xAxis).not.toBe(settings.xAxis);
});

it("the graph-view settings reset with each question; the student's toggles carry (owner, 2026-10-21)", () => {
  // the view settings never carry
  for (const key of ["lockViewport", "piAxisLabels"] as const)
    expect(PREFERENCE_KEYS).not.toContain(key);
  const settings = {
    ...DEFAULT_SETTINGS,
    lockViewport: true,
    xAxis: { show: false, label: "time", step: 2 },
    yAxis: { show: true, label: "h", step: 0.5 },
    angleMode: "degrees" as const,
    complex: true,
    showGrid: false,
    axisNumbers: false,
    arrows: true,
    minorGridlines: false,
    displaySize: 6 as const,
    keypad: true,
    brailleMode: "nemeth" as const,
  };
  const carried = preferencesOf(settings);
  expect(carried).not.toHaveProperty("lockViewport");
  expect(carried.xAxis).toEqual({ show: false, label: "", step: null });
  expect(carried.yAxis).toEqual(DEFAULT_SETTINGS.yAxis);
  expect(carried).toMatchObject({
    angleMode: "degrees",
    complex: true,
    showGrid: false,
    axisNumbers: false,
    arrows: true,
    minorGridlines: false,
    displaySize: 6,
    keypad: true,
    brailleMode: "nemeth",
  });
});
