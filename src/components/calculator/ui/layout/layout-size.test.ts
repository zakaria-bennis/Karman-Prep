// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import type { PixelSize } from "@/lib/calculator/plot/viewport";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import {
  LAYOUT_DESKTOP_MIN_ASPECT,
  LAYOUT_DESKTOP_MIN_WIDTH,
  layoutFor,
  observeHostSize,
} from "./layout-size";

let host: HTMLDivElement;
let restore: () => void;

beforeEach(() => {
  restore = installDomStubs();
  host = document.body.appendChild(document.createElement("div"));
});
afterEach(() => {
  host.remove();
  restore();
});

it("L-8 layoutFor needs a container at least 560 px wide and at least 1.2 times as wide as tall", () => {
  expect(LAYOUT_DESKTOP_MIN_WIDTH).toBe(560);
  expect(LAYOUT_DESKTOP_MIN_ASPECT).toBe(1.2);
  expect(layoutFor({ width: 560, height: 400 })).toBe("desktop");
  expect(layoutFor({ width: 559.9, height: 100 })).toBe("stacked");
  expect(layoutFor({ width: 600, height: 500 })).toBe("desktop"); // exactly 1.2
  expect(layoutFor({ width: 600, height: 500.5 })).toBe("stacked");
});

it("L-2 a docked portrait column (576x750) is stacked so the graph keeps the full width", () => {
  expect(layoutFor({ width: 576, height: 750 })).toBe("stacked");
});

it("L-2 a 700x700 square, a 559x300 narrow container and a 900x800 container below 1.2 are stacked", () => {
  expect(layoutFor({ width: 700, height: 700 })).toBe("stacked");
  expect(layoutFor({ width: 559, height: 300 })).toBe("stacked");
  expect(layoutFor({ width: 900, height: 800 })).toBe("stacked");
});

it("L-1 landscape containers of at least 560 px (800x500, 1024x768) are desktop", () => {
  expect(layoutFor({ width: 800, height: 500 })).toBe("desktop");
  expect(layoutFor({ width: 1024, height: 768 })).toBe("desktop");
});

it("L-8 a 0-height or non-finite first measurement falls back to the width-only rule", () => {
  expect(layoutFor({ width: 600, height: 0 })).toBe("desktop");
  expect(layoutFor({ width: 559, height: 0 })).toBe("stacked");
  expect(layoutFor({ width: 800, height: Number.NaN })).toBe("desktop");
  expect(layoutFor({ width: 800, height: Number.POSITIVE_INFINITY })).toBe("desktop");
  expect(layoutFor({ width: 400, height: Number.NaN })).toBe("stacked");
  expect(layoutFor({ width: 0, height: 0 })).toBe("stacked");
});

it("AR-29 observeHostSize reports ResizeObserver sizes and re-reads the host on measure()", () => {
  const sizes: PixelSize[] = [];
  const o = observeHostSize(host, (s) => sizes.push(s));
  triggerResize(host, { width: 461, height: 300 });
  host.getBoundingClientRect = () => ({ width: 700, height: 400 }) as DOMRect;
  o.measure();
  expect(sizes).toEqual([
    { width: 461, height: 300 },
    { width: 700, height: 400 },
  ]);
});
