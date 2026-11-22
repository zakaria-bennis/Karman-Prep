// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSliderPlayback } from "./use-slider-playback";

const h = vi.hoisted(() => ({ ticks: 0, restarts: 0 }));
vi.mock("@/lib/calculator/core/api/sliders", () => ({
  tickSliders: () => {
    h.ticks++;
    return true;
  },
  restartSliderClocks: () => h.restarts++,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  h.ticks = h.restarts = 0;
});

it("a calculator its host hides pauses the slider loop, without a jump, and resumes when shown (2026-11-22)", () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  let resized: () => void = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: () => void) {
        resized = cb;
      }
      observe() {}
      disconnect() {}
    }
  );
  const holder = document.createElement("div");
  const host = document.createElement("div");
  holder.append(host);
  document.body.append(holder);
  const anchor = document.createElement("div");
  host.attachShadow({ mode: "open" }).append(anchor);
  const engine = {
    getSnapshot: () => ({ rows: [{ slider: { settings: { isPlaying: true } } }] }),
    subscribe: () => () => {},
  };
  renderHook(() => useSliderPlayback(engine as never, { current: anchor }));
  frames.shift()!(16);
  expect(h.ticks).toBe(1);
  holder.hidden = true; // the quiz closes the calculator
  frames.shift()!(32);
  expect([h.ticks, h.restarts, frames.length]).toEqual([1, 1, 0]);
  holder.hidden = false;
  resized();
  frames.shift()!(5000);
  expect(h.ticks).toBe(2);
});
