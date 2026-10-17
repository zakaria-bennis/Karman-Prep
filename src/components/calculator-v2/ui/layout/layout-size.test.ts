// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import type { PixelSize } from "@/lib/calculator-v2/plot/viewport";
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

it("AR-29 layoutFor switches at 560 px of container width", () => {
  expect(LAYOUT_DESKTOP_MIN_WIDTH).toBe(560);
  expect([560, 559.9, 461, 0].map(layoutFor)).toEqual(["desktop", "stacked", "stacked", "stacked"]);
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
