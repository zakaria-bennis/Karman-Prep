// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installDomStubs } from "@/components/calculator/__fixtures__/dom-stubs";
import { FULL_SCREEN_QUERY, PHONE_QUERY } from "./breakpoints";
import { MOUNT_FAILED_COPY } from "./CalculatorLoader";
import { CalculatorScope, CalculatorTrigger, useCalculator } from "./CalculatorScope";
import { CalculatorSourceAction } from "./CalculatorSourceAction";
import type { CalculatorWindowProps } from "./CalculatorWindow";
import { calculatorWindowStore } from "./calculator-window-store";

const h = vi.hoisted(() => ({
  throwWindow: false,
  bridge: null as unknown,
  handles: [] as { focusOnOpen: ReturnType<typeof vi.fn> }[],
}));
vi.mock("@/components/calculator/host/quiz-host", () => ({
  mountQuizCalculator: () => {
    const handle = {
      calculator: {},
      focusOnOpen: vi.fn(),
      focusBoundary: vi.fn(),
      setReducedMotion: vi.fn(),
      reflow: vi.fn(),
      destroy: vi.fn(),
    };
    h.handles.push(handle);
    return handle;
  },
}));
vi.mock("./CalculatorWindow", async (original) => {
  const m = await original<typeof import("./CalculatorWindow")>();
  return {
    ...m,
    CalculatorWindow: (p: CalculatorWindowProps) => {
      if (h.throwWindow) throw new Error("render");
      return m.CalculatorWindow(p);
    },
  };
});

function Probe() {
  h.bridge = useCalculator();
  return null;
}

function Host({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <CalculatorScope enabled={enabled} open={open} onOpenChange={setOpen} questionKey="attempt:q1">
      <p>Question body</p>
      <CalculatorTrigger />
      <CalculatorSourceAction latex="\sin(30)" />
      <Probe />
    </CalculatorScope>
  );
}

// hidden: true once open: from tasks 8 and 9 a phone open is full screen, which makes the
// workspace aria-hidden
const trigger = (hidden = false) =>
  screen.getByRole("button", { name: "Toggle Karman calculator", hidden });
let restore = () => {};
// installDomStubs' restore undoes it
const phone = () => {
  window.matchMedia = ((q: string) => ({
    matches: q === PHONE_QUERY || q === FULL_SCREEN_QUERY,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  restore = installDomStubs();
  calculatorWindowStore.resetForTests();
  h.throwWindow = false;
  h.handles = [];
});
afterEach(() => restore());

it("AR-9 CalculatorScope renders CalculatorWindow with CalculatorLoader", () => {
  render(<Host />);
  fireEvent.click(trigger());
  expect(document.querySelector("[data-calculator-window] [data-calculator-host]")).not.toBeNull();
});

it("AR-9 useCalculator is null when ineligible and the bridge otherwise", () => {
  render(<Host enabled={false} />).unmount();
  expect(h.bridge).toBeNull();
  render(<Host />);
  expect(h.bridge).toMatchObject({
    open: false,
    status: "idle",
    failure: null,
    questionKey: "attempt:q1",
  });
});

it("A11Y-7 the trigger is a toggle (aria-pressed), the side button uses aria-expanded, and both name the shadow host", () => {
  phone();
  render(<Host />);
  const side = screen.getByRole("button", { name: "Open Karman calculator" });
  const id = side.getAttribute("aria-controls")!;
  expect(id).toMatch(/^\S+$/);
  expect(trigger()).toHaveAttribute("aria-controls", id);
  expect(trigger()).toHaveAttribute("aria-pressed", "false");
  expect(side).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(side);
  expect(document.getElementById(id)).toHaveAttribute("data-calculator-host");
  expect(trigger(true)).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Open Karman calculator", hidden: true })).toBeNull();
});

it('KB-4 a touch tap on the side button opens with the "touch" trigger and Enter on the toolbar trigger with "keyboard" (OI-7)', async () => {
  phone();
  render(<Host />);
  const side = screen.getByRole("button", { name: "Open Karman calculator" });
  fireEvent.pointerDown(side, { pointerType: "touch" });
  fireEvent.click(side);
  await waitFor(() => expect(h.handles.at(-1)?.focusOnOpen).toHaveBeenLastCalledWith("touch"));
  fireEvent.click(trigger(true));
  fireEvent.keyDown(trigger(true), { key: "Enter" });
  fireEvent.click(trigger(true));
  await waitFor(() => expect(h.handles.at(-1)?.focusOnOpen).toHaveBeenLastCalledWith("keyboard"));
  expect(h.handles).toHaveLength(1);
});

it("AR-53 a render error in the window leaves the question mounted and offers Retry", () => {
  h.throwWindow = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<Host />);
  fireEvent.click(trigger());
  expect(screen.getByText(MOUNT_FAILED_COPY, { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Question body")).toBeInTheDocument();
  h.throwWindow = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(document.querySelector("[data-calculator-window]")).not.toBeNull();
});

it("AR-53 the render-error fallback is a window-shaped dialog that Close calculator hides, and a later open retries", () => {
  h.throwWindow = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  phone();
  render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: "Open Karman calculator" }));
  const fallback = screen.getByRole("dialog", { name: "Karman calculator" });
  expect(fallback).toHaveAttribute("data-calculator-window-fallback");
  expect(fallback.style.width).not.toBe("");
  // full screen's modal inertness is dropped while the fallback shows (AR-28 resumes on retry)
  expect(screen.getByText("Question body").closest("[inert]")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close calculator" }));
  expect(trigger()).toHaveAttribute("aria-pressed", "false");
  h.throwWindow = false;
  fireEvent.click(screen.getByRole("button", { name: "Open Karman calculator" }));
  expect(screen.queryByText(MOUNT_FAILED_COPY, { exact: true })).toBeNull();
  expect(document.querySelector("[data-calculator-window]")).not.toBeNull();
});

it("L-4 the toolbar opens the calculator docked on a wide viewport and full screen on a narrow one", () => {
  const mode = () => document.querySelector("[data-mode]")?.getAttribute("data-mode");
  const { unmount } = render(<Host />);
  fireEvent.click(trigger());
  expect(calculatorWindowStore.get()).toMatchObject({ mode: "docked", restoreMode: "docked" });
  expect(mode()).toBe("docked");
  // The student undocks; closing and reopening keeps the floating window.
  calculatorWindowStore.set({ mode: "floating" });
  fireEvent.click(trigger());
  fireEvent.click(trigger());
  expect(mode()).toBe("floating");
  unmount();
  calculatorWindowStore.resetForTests();
  phone();
  render(<Host />);
  fireEvent.click(trigger());
  expect(mode()).toBe("fullscreen");
  expect(calculatorWindowStore.get().mode).not.toBe("docked");
});

it("the toolbar trigger toggles the window, and reopening restores the floating rect, the dock or maximized (owner, 2026-10-21)", () => {
  const mode = () => document.querySelector("[data-mode]")?.getAttribute("data-mode");
  const frame = () => document.querySelector<HTMLElement>("[data-calculator-window]")!;
  const shown = () => !document.querySelector("[data-calculator-root]")!.hasAttribute("hidden");
  render(<Host />);
  fireEvent.click(trigger());
  expect(trigger()).toHaveAttribute("aria-pressed", "true");
  calculatorWindowStore.set({
    mode: "floating",
    floatingRect: { x: 200, y: 90, width: 500, height: 380 },
  });
  fireEvent.click(trigger());
  expect([shown(), trigger().getAttribute("aria-pressed")]).toEqual([false, "false"]);
  fireEvent.click(trigger());
  expect([shown(), mode()]).toEqual([true, "floating"]);
  expect([
    frame().style.left,
    frame().style.top,
    frame().style.width,
    frame().style.height,
  ]).toEqual(["200px", "90px", "500px", "380px"]);
  calculatorWindowStore.set({ mode: "maximized" });
  fireEvent.click(trigger());
  fireEvent.click(trigger());
  expect(mode()).toBe("maximized");
  fireEvent.click(screen.getByRole("button", { name: "Restore calculator size" }));
  expect(mode()).toBe("floating");
});

it("a stored rect larger than a shrunken browser window is drawn clamped on-screen, and the store keeps it", () => {
  const rect = { x: 900, y: 500, width: 700, height: 500 };
  calculatorWindowStore.set({ mode: "floating", restoreMode: "floating", floatingRect: rect });
  Object.assign(window, { innerWidth: 1100, innerHeight: 700 });
  render(<Host />);
  fireEvent.click(trigger());
  const style = document.querySelector<HTMLElement>("[data-calculator-window]")!.style;
  expect([style.left, style.top, style.width, style.height]).toEqual([
    "400px",
    "200px",
    "700px",
    "500px",
  ]);
  expect(calculatorWindowStore.get().floatingRect).toEqual(rect);
});
