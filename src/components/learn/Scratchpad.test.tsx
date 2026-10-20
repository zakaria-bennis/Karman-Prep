// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import Scratchpad from "./Scratchpad";

const root = document.documentElement;
const setViewport = (clientWidth: number, innerWidth: number) => {
  Object.defineProperty(root, "clientWidth", { configurable: true, value: clientWidth });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
};
afterEach(() => {
  delete (root as { clientWidth?: number }).clientWidth;
  setViewport(1024, 1024);
});
const right = (el: HTMLElement) => parseFloat(el.style.left) + parseFloat(el.style.width);

it("fits the pad to the visible width, not an innerWidth widened by overflowing content, when it opens and on resize", () => {
  // The Pixel 7 diagnostic page while loading: 412 px screen, innerWidth briefly 432.
  setViewport(412, 432);
  const view = render(<Scratchpad onClose={() => {}} open={false} />);
  setViewport(412, 412); // settled, with no resize event
  view.rerender(<Scratchpad onClose={() => {}} open />);
  const pad = screen.getByRole("region", { name: "Scratchpad" });
  expect(parseFloat(pad.style.left)).toBeGreaterThanOrEqual(12);
  expect(right(pad)).toBeLessThanOrEqual(412 - 12);
  setViewport(360, 360);
  act(() => void window.dispatchEvent(new Event("resize")));
  expect(right(pad)).toBeLessThanOrEqual(360 - 12);
});

it("ignores the overflow width even when the pad mounts open during it", () => {
  setViewport(412, 432);
  render(<Scratchpad onClose={() => {}} />);
  expect(right(screen.getByRole("region", { name: "Scratchpad" }))).toBeLessThanOrEqual(400);
});
