// @vitest-environment jsdom
import { render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnnouncerContext, LiveRegion, createAnnouncer, useAnnouncer } from "./announcer";

afterEach(() => vi.useRealTimers());
function setup(initialText = "") {
  vi.useFakeTimers();
  const region = document.createElement("div");
  region.textContent = initialText;
  return { region, announcer: createAnnouncer(region) };
}

it("createAnnouncer writes the text exactly delayMs after announce and empties the region 50 ms before", () => {
  const { region, announcer } = setup("Angle mode degrees");
  announcer.announce("Expression 2 equals 9", { delayMs: 750, key: "value" });
  vi.advanceTimersByTime(699); // t = 699
  expect(region.textContent).toBe("Angle mode degrees");
  vi.advanceTimersByTime(1); // t = 700: cleared
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(49); // t = 749
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 750: written
  expect(region.textContent).toBe("Expression 2 equals 9");
  announcer.announce("Calculator cleared for this question.", { delayMs: 500, key: "reset" });
  vi.advanceTimersByTime(499);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // exactly 500 ms after the call
  expect(region.textContent).toBe("Calculator cleared for this question.");
});
it("createAnnouncer re-reads equal text: below 50 ms it empties at once and writes at 50 ms", () => {
  const { region, announcer } = setup("Expression 2 equals 9");
  announcer.announce("Expression 2 equals 9");
  vi.advanceTimersByTime(0);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(49);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1);
  expect(region.textContent).toBe("Expression 2 equals 9");
  announcer.announce("Expression 2 equals 9", { delayMs: 20 });
  vi.advanceTimersByTime(0);
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(50);
  expect(region.textContent).toBe("Expression 2 equals 9");
});
it("createAnnouncer replaces a pending same-key announcement before or after its clear", () => {
  const { region, announcer } = setup();
  announcer.announce("Expression 1 equals 2", { delayMs: 750, key: "value" }); // t = 0
  vi.advanceTimersByTime(500);
  announcer.announce("Expression 1 equals 3", { delayMs: 750, key: "value" }); // t = 500
  vi.advanceTimersByTime(300); // t = 800: the first one would have been written at 750
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(449); // t = 1249
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(1); // t = 1250
  expect(region.textContent).toBe("Expression 1 equals 3");
  announcer.announce("Expression 1 equals 4", { delayMs: 750, key: "value" }); // t = 1250
  vi.advanceTimersByTime(720); // t = 1970: cleared at 1950, write due at 2000
  expect(region.textContent).toBe("");
  announcer.announce("Expression 1 equals 5", { delayMs: 750, key: "value" }); // t = 1970
  vi.advanceTimersByTime(30); // t = 2000: the replaced write does not run
  expect(region.textContent).toBe("");
  vi.advanceTimersByTime(720); // t = 2720
  expect(region.textContent).toBe("Expression 1 equals 5");
});
it("createAnnouncer cancel(key) stops both timers, including a write due after the clear ran", () => {
  const { region, announcer } = setup("Expression 1 equals 3");
  announcer.announce("Angle mode degrees", { delayMs: 100, key: "mode" });
  announcer.cancel("mode");
  vi.advanceTimersByTime(1000);
  expect(region.textContent).toBe("Expression 1 equals 3"); // neither timer ran
  announcer.announce("Angle mode radians", { delayMs: 750, key: "mode" });
  vi.advanceTimersByTime(720); // cleared at 700, write due at 750
  expect(region.textContent).toBe("");
  announcer.cancel("mode");
  vi.advanceTimersByTime(1000);
  expect(region.textContent).toBe("");
});
it("createAnnouncer destroy stops every pending write and empties the region", () => {
  const { region, announcer } = setup("old");
  announcer.announce("Cleared", { delayMs: 10 });
  announcer.destroy();
  announcer.announce("After");
  vi.advanceTimersByTime(1000);
  expect(region.textContent).toBe("");
});
it("LiveRegion is one polite status region, never an alert, ready once", () => {
  const onReady = vi.fn();
  const { container, rerender } = render(<LiveRegion onReady={onReady} />);
  rerender(<LiveRegion onReady={onReady} />);
  const region = screen.getByRole("status");
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(onReady).toHaveBeenCalledWith(region);
});
it("useAnnouncer returns the provided announcer and throws outside AnnouncerContext", () => {
  const announcer = createAnnouncer(document.createElement("div"));
  const { result } = renderHook(() => useAnnouncer(), {
    wrapper: ({ children }) => (
      <AnnouncerContext.Provider value={announcer}>{children}</AnnouncerContext.Provider>
    ),
  });
  expect(result.current).toBe(announcer);
  expect(() => renderHook(() => useAnnouncer())).toThrow(
    "useAnnouncer must be used inside AnnouncerContext"
  );
});
