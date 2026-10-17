// @vitest-environment jsdom
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi, type Mock } from "vitest";
import { CalculatorWindow, type CalculatorWindowProps } from "./CalculatorWindow";
import { calculatorWindowStore, type WindowMode } from "./calculator-window-store";

function setup(mode: WindowMode, extra: Partial<CalculatorWindowProps> = {}) {
  const props: CalculatorWindowProps = {
    mode,
    dockTop: 12,
    dockWidth: 576,
    floatingRect: { x: 16, y: 64, width: 880, height: 600 },
    onModeChange: vi.fn(),
    onFloatingRectChange: vi.fn(),
    onDockWidthChange: vi.fn(),
    onClose: vi.fn(),
    onMinimize: vi.fn(),
    onFocusBoundary: vi.fn(),
    frameRef: createRef(),
    chromeSlotRef: createRef(),
    children: <input aria-label="inside" />,
    ...extra,
  };
  const view = render(<CalculatorWindow {...props} />);
  return {
    props,
    rerender: (m: WindowMode) => view.rerender(<CalculatorWindow {...props} mode={m} />),
  };
}

beforeEach(() => {
  Object.assign(window, { innerWidth: 1280, innerHeight: 800 });
  calculatorWindowStore.resetForTests();
});

it("A11Y-6 one frame is a non-modal dialog, a modal dialog or a complementary landmark named Karman calculator", () => {
  const { props, rerender } = setup("floating");
  const frame = props.frameRef.current!;
  const dialog = () => screen.getByRole("dialog", { name: "Karman calculator" });
  expect(dialog()).not.toHaveAttribute("aria-modal");
  rerender("maximized");
  expect(dialog()).not.toHaveAttribute("aria-modal");
  rerender("fullscreen");
  expect(dialog()).toHaveAttribute("aria-modal", "true");
  rerender("docked");
  expect(screen.getByRole("complementary", { name: "Karman calculator" })).toBe(frame);
  expect(frame).toHaveAttribute("tabindex", "-1");
  expect(screen.queryByRole("button", { name: "Karman calculator" })).toBeNull();
});

it.each([
  ["floating", ["Maximize calculator", "Minimize calculator", "Close calculator"]],
  [
    "docked",
    ["Undock calculator", "Maximize calculator", "Minimize calculator", "Close calculator"],
  ],
  ["maximized", ["Restore calculator size", "Minimize calculator", "Close calculator"]],
  ["fullscreen", ["Close calculator"]],
] as const)(
  "L-12 the %s title bar holds the label, the chrome slot, then its window controls and Close",
  (mode, names) => {
    const { props } = setup(mode);
    const bar = props.frameRef.current!.querySelector("[data-calculator-titlebar]")!;
    const slot = props.chromeSlotRef.current!;
    expect(
      [...bar.querySelectorAll("[data-window-controls] button")].map((b) =>
        b.getAttribute("aria-label")
      )
    ).toEqual(names);
    expect(slot).toHaveAttribute("data-calculator-title-slot");
    const follows = (a: Node, b: Node) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(follows(screen.getByText("Karman calculator"), slot)).toBe(true);
    expect(follows(slot, screen.getByRole("button", { name: names[0] }))).toBe(true);
  }
);

it("L-12 the window controls report Undock, Maximize, Restore, Minimize and Close", () => {
  const { props, rerender } = setup("docked");
  const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
  click("Undock calculator");
  expect(props.onModeChange).toHaveBeenLastCalledWith("floating");
  click("Maximize calculator");
  expect(props.onModeChange).toHaveBeenLastCalledWith("maximized");
  click("Minimize calculator");
  expect(props.onMinimize).toHaveBeenCalledTimes(1);
  calculatorWindowStore.set({ mode: "docked" });
  rerender("maximized");
  click("Restore calculator size");
  expect(props.onModeChange).toHaveBeenLastCalledWith("docked");
  click("Close calculator");
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

it("KB-6, AR-18 key events stop at the frame and Escape closes only when nothing prevented it", () => {
  const { props } = setup("floating");
  const heard = vi.fn();
  for (const t of ["keydown", "keyup", "keypress"]) {
    window.addEventListener(t, heard);
    document.addEventListener(t, heard);
  }
  const inside = screen.getByLabelText("inside");
  fireEvent.keyDown(inside, { key: "Enter" });
  fireEvent.keyUp(inside, { key: "Enter" });
  fireEvent.keyPress(inside, { key: "h", charCode: 104, altKey: true });
  inside.addEventListener("keydown", (e) => e.preventDefault(), { once: true });
  fireEvent.keyDown(inside, { key: "Escape" });
  expect(props.onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(inside, { key: "Escape" });
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(heard).not.toHaveBeenCalled();
});

it("KB-10 arrow keys move the focused handle and resize the focused grip by 16 px, clamped", () => {
  const { props } = setup("floating", { floatingRect: { x: 16, y: 64, width: 368, height: 280 } }); // the props never change, so each key steps from this rect
  const last = () => (props.onFloatingRectChange as Mock).mock.lastCall![0];
  const handle = screen.getByRole("button", { name: "Karman calculator" });
  const grip = screen.getByRole("button", { name: "Resize calculator" });
  expect(handle).toHaveAttribute("aria-roledescription", "move handle");
  expect(grip).toHaveAttribute("aria-roledescription", "resize handle");
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(last()).toEqual({ x: 32, y: 64, width: 368, height: 280 });
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(last()).toEqual({ x: 16, y: 48, width: 368, height: 280 });
  fireEvent.keyDown(grip, { key: "ArrowDown" });
  expect(last()).toEqual({ x: 16, y: 64, width: 368, height: 296 });
  fireEvent.keyDown(grip, { key: "ArrowLeft" });
  expect(last()).toEqual({ x: 16, y: 64, width: 360, height: 280 });
}); // 352 clamps to the 360 minimum

it("AR-23 the dock splitter is a separator stepping 16 px, with Home and End at 400 and min(900, 100vw - 480)", () => {
  const { props } = setup("docked");
  const sep = screen.getByRole("separator", { name: "Resize calculator dock" });
  expect(
    ["aria-valuenow", "aria-valuemin", "aria-valuemax"].map((a) => sep.getAttribute(a))
  ).toEqual(["576", "400", "800"]);
  for (const [key, width] of [
    ["ArrowRight", 592],
    ["ArrowLeft", 560],
    ["Home", 400],
    ["End", 800],
  ] as const) {
    fireEvent.keyDown(sep, { key });
    expect(props.onDockWidthChange).toHaveBeenLastCalledWith(width);
  }
});

it("AR-28 full screen adds focus sentinels: start asks for the last boundary, end wraps to the title bar", () => {
  const { props, rerender } = setup("floating");
  expect(document.querySelectorAll("[data-focus-sentinel]")).toHaveLength(0);
  rerender("fullscreen");
  document.querySelector<HTMLElement>('[data-focus-sentinel="start"]')!.focus();
  expect(props.onFocusBoundary).toHaveBeenCalledWith("last");
  document.querySelector<HTMLElement>('[data-focus-sentinel="end"]')!.focus();
  expect(screen.getByRole("button", { name: "Close calculator" })).toHaveFocus();
});
