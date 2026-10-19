// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import {
  onCalculatorFontsLoaded,
  resetFontWarmupForTests,
  warmCalculatorFonts,
} from "./font-warmup";

const load = vi.fn();
let handlers: Record<string, () => void> = {};

beforeEach(() => {
  resetFontWarmupForTests();
  load.mockReset().mockResolvedValue([]);
  handlers = {};
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      load,
      addEventListener: (type: string, h: () => void) => (handlers[type] = h),
      removeEventListener: () => {},
    },
  });
});

it("AR-41 warmCalculatorFonts loads the upright and italic Times math faces once per page", async () => {
  await Promise.all([warmCalculatorFonts(), warmCalculatorFonts()]);
  expect(load.mock.calls).toEqual([['16px "Times New Roman"'], ['italic 16px "Times New Roman"']]);
});

it("AR-41 the warm-up never rejects, with a failing load or without document.fonts", async () => {
  load.mockRejectedValue(new Error("blocked"));
  await expect(warmCalculatorFonts()).resolves.toBeUndefined();
  resetFontWarmupForTests();
  Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
  await expect(warmCalculatorFonts()).resolves.toBeUndefined();
});

it("AR-41 listeners run when the warm-up resolves and on every loadingdone until removed", async () => {
  const listener = vi.fn();
  const off = onCalculatorFontsLoaded(listener);
  await warmCalculatorFonts();
  expect(listener).toHaveBeenCalledTimes(1);
  handlers.loadingdone();
  expect(listener).toHaveBeenCalledTimes(2);
  off();
  handlers.loadingdone?.();
  expect(listener).toHaveBeenCalledTimes(2);
});
