// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import type { PixelSize } from "@/lib/calculator/plot/viewport";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import { LAYOUT_DESKTOP_MIN_WIDTH, layoutFor, observeHostSize } from "./layout-size";

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

it("RS-1 layoutFor is side by side from 450 px wide and stacked below, at any height", () => {
  expect(LAYOUT_DESKTOP_MIN_WIDTH).toBe(450);
  expect(layoutFor({ width: 450, height: 800 })).toBe("desktop");
  expect(layoutFor({ width: 449, height: 800 })).toBe("stacked");
  expect(layoutFor({ width: 768, height: 1024 })).toBe("desktop");
  expect(layoutFor({ width: 812, height: 375 })).toBe("desktop");
  expect(layoutFor({ width: 375, height: 812 })).toBe("stacked");
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
