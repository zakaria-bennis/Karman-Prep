// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { homeFadeMs, useHomePresence } from "./home-presence";

let restoreDom: () => void;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  restoreDom = installDomStubs();
});

afterEach(() => {
  restoreDom();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Advances `n` animation frames inside act. */
function frames(n: number): void {
  act(() => {
    for (let i = 0; i < n; i++) vi.advanceTimersToNextFrame();
  });
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function presence(fadeMs: () => number) {
  return renderHook(({ show }: { show: boolean }) => useHomePresence(show, fadeMs), {
    initialProps: { show: false },
  });
}

it("AN-8 Home enters, fades in over two frames, fades out for the fade time and leaves", () => {
  const { result, rerender } = presence(() => 100);
  expect(result.current).toBe("absent");

  rerender({ show: true });
  expect(result.current).toBe("entering");
  frames(2);
  expect(result.current).toBe("present");

  rerender({ show: false });
  expect(result.current).toBe("leaving");
  advance(99);
  expect(result.current).toBe("leaving");
  advance(1);
  expect(result.current).toBe("absent");

  rerender({ show: true });
  frames(2);
  rerender({ show: false });
  rerender({ show: true });
  expect(result.current).toBe("present");
});

it("AN-8 with no fade time Home appears and disappears at once", () => {
  const { result, rerender } = presence(() => 0);
  rerender({ show: true });
  expect(result.current).toBe("present");
  rerender({ show: false });
  expect(result.current).toBe("absent");
});

it("AN-8 homeFadeMs reads the opacity transition and is 0 under reduced motion", () => {
  const el = document.createElement("button");
  const styled = (transitionProperty: string, transitionDuration: string) =>
    vi
      .spyOn(window, "getComputedStyle")
      .mockReturnValue({ transitionProperty, transitionDuration } as CSSStyleDeclaration);

  styled("background-color, opacity", "0.1s, 0.1s");
  expect(homeFadeMs(false, el)).toBe(100);
  expect(homeFadeMs(true, el)).toBe(0);

  styled("opacity", "250ms");
  expect(homeFadeMs(false, el)).toBe(250);

  styled("opacity", "0s");
  expect(homeFadeMs(false, el)).toBe(0);

  expect(homeFadeMs(false, null)).toBe(0);
});
