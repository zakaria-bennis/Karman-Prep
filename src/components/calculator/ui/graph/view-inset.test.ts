import { expect, it } from "vitest";
import { defaultViewport } from "@/lib/calculator/plot/viewport";
import { insetHome, isInsetHome, raiseView } from "./view-inset";

const SIZE = { width: 800, height: 600 };

it("raising the view moves its content up by px at the same scale", () => {
  const v = raiseView(defaultViewport(SIZE), SIZE, 40); // 40 px is 1 unit here
  expect(v).toEqual({ left: -10, right: 10, bottom: -8.5, top: 6.5 });
});

it("Home with an inset is the default view centred above it, and only that view counts as home", () => {
  const home = insetHome(SIZE, 200);
  expect(home.top).toBeCloseTo(5, 9);
  expect(home.bottom).toBeCloseTo(-10, 9);
  expect(isInsetHome(home, SIZE, 200)).toBe(true);
  expect(isInsetHome(defaultViewport(SIZE), SIZE, 200)).toBe(false);
  expect(isInsetHome(defaultViewport(SIZE), SIZE, 0)).toBe(true);
});
