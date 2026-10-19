import { beforeEach, expect, it, vi } from "vitest";
import {
  calculatorWindowStore,
  clampDockWidth,
  clampFloatingRect,
  defaultDockWidth,
  defaultFloatingRect,
  windowModeFor,
} from "./calculator-window-store";

const get = () => calculatorWindowStore.get();

beforeEach(() => calculatorWindowStore.resetForTests());

it("AR-25 the page-session store starts empty, merges patches and notifies subscribers", () => {
  expect(get()).toEqual({
    mode: null,
    restoreMode: "floating",
    floatingRect: null,
    dockWidth: null,
    displaySize: null,
    reverseContrast: null,
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
