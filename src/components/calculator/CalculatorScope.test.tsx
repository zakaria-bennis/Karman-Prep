// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import { FULL_SCREEN_QUERY, PHONE_QUERY } from "./breakpoints";
import { MOUNT_FAILED_COPY } from "./CalculatorLoader";
import { CalculatorScope, CalculatorTrigger, useCalculator } from "./CalculatorScope";
import { CalculatorSourceAction } from "./CalculatorSourceAction";
import { CalculatorVersionProvider } from "./CalculatorVersion";
import type { CalculatorWindowProps } from "./CalculatorWindow";
import { calculatorWindowStore } from "./calculator-window-store";

const h = vi.hoisted(() => ({
  throwWindow: false,
  bridge: null as unknown,
  handles: [] as { focusOnOpen: ReturnType<typeof vi.fn> }[],
}));
vi.mock("./CalculatorShell", () => ({ CalculatorShell: () => <div data-testid="v1-shell" /> }));
vi.mock("@/components/calculator-v2/host/quiz-host", () => ({
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

function Host({ version, enabled = true }: { version?: "v1" | "v2"; enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const scope = (
    <CalculatorScope enabled={enabled} open={open} onOpenChange={setOpen} questionKey="attempt:q1">
      <p>Question body</p>
      <CalculatorTrigger />
      <CalculatorSourceAction latex="\sin(30)" />
      <Probe />
    </CalculatorScope>
  );
  // no version: no provider (AR-7)
  return version ? (
    <CalculatorVersionProvider version={version}>{scope}</CalculatorVersionProvider>
  ) : (
    scope
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

it("AR-9 v1 renders CalculatorShell and v2 renders CalculatorWindow with CalculatorLoader", () => {
  const v1 = render(<Host version="v1" />);
  fireEvent.click(trigger());
  expect(screen.getByTestId("v1-shell")).toBeInTheDocument();
  expect(document.querySelector("[data-calculator-window]")).toBeNull();
  v1.unmount();
  render(<Host version="v2" />);
  fireEvent.click(trigger());
  expect(screen.queryByTestId("v1-shell")).toBeNull();
  expect(document.querySelector("[data-calculator-window] [data-calculator-host]")).not.toBeNull();
  const source = readFileSync("src/components/calculator/CalculatorScope.tsx", "utf8");
  expect(source.split("innerWidth >= 1100")).toHaveLength(2);
  expect(source.split('"(max-width: 767px), (max-height: 500px)"')).toHaveLength(2);
});

it("AR-9 useCalculator is null when ineligible and a version-tagged bridge otherwise", () => {
  render(<Host version="v2" enabled={false} />).unmount();
  expect(h.bridge).toBeNull();
  render(<Host version="v1" />).unmount();
  expect(h.bridge).toMatchObject({ version: "v1", open: false });
  render(<Host version="v2" />);
  expect(h.bridge).toMatchObject({
    version: "v2",
    open: false,
    status: "idle",
    failure: null,
    questionKey: "attempt:q1",
  });
});

it("AR-7 CalculatorScope renders v1 without a provider and v2 inside a v2 provider", () => {
  const bare = render(<Host />);
  fireEvent.click(trigger());
  expect(screen.getByTestId("v1-shell")).toBeInTheDocument();
  expect(document.querySelector("[data-calculator-window]")).toBeNull();
  expect(h.bridge).toMatchObject({ version: "v1" });
  bare.unmount();
  render(<Host version="v2" />);
  fireEvent.click(trigger());
  expect(document.querySelector("[data-calculator-window]")).not.toBeNull();
  expect(screen.queryByTestId("v1-shell")).toBeNull();
  expect(h.bridge).toMatchObject({ version: "v2" });
});

it("A11Y-7 the v2 trigger and side button use aria-expanded and aria-controls naming the shadow host", () => {
  phone();
  render(<Host version="v2" />);
  const side = screen.getByRole("button", { name: "Open Karman calculator" });
  const id = side.getAttribute("aria-controls")!;
  expect(id).toMatch(/^\S+$/);
  expect(trigger()).toHaveAttribute("aria-controls", id);
  expect(trigger()).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(side);
  expect(document.getElementById(id)).toHaveAttribute("data-calculator-host");
  expect(trigger(true)).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByRole("button", { name: "Open Karman calculator", hidden: true })).toBeNull();
});

it('KB-4 a touch tap on the side button opens with the "touch" trigger and Enter on the toolbar trigger with "keyboard" (OI-7)', async () => {
  phone();
  render(<Host version="v2" />);
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
  render(<Host version="v2" />);
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
  render(<Host version="v2" />);
  fireEvent.click(screen.getByRole("button", { name: "Open Karman calculator" }));
  const fallback = screen.getByRole("dialog", { name: "Karman calculator" });
  expect(fallback).toHaveAttribute("data-calculator-window-fallback");
  expect(fallback.style.width).not.toBe("");
  // full screen's modal inertness is dropped while the fallback shows (AR-28 resumes on retry)
  expect(screen.getByText("Question body").closest("[inert]")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close calculator" }));
  expect(trigger()).toHaveAttribute("aria-expanded", "false");
  h.throwWindow = false;
  fireEvent.click(screen.getByRole("button", { name: "Open Karman calculator" }));
  expect(screen.queryByText(MOUNT_FAILED_COPY, { exact: true })).toBeNull();
  expect(document.querySelector("[data-calculator-window]")).not.toBeNull();
});

it("AR-13 on v2 the v1 export controls render nothing", () => {
  const v1 = render(<Host version="v1" />);
  expect(
    screen.getByRole("button", { name: "Paste \\sin(30) into calculator" })
  ).toBeInTheDocument();
  v1.unmount();
  render(<Host version="v2" />);
  expect(screen.queryByRole("button", { name: /Export|Paste|Copy for Desmos/ })).toBeNull();
});

it("L-4 the toolbar opens v2 docked on a wide viewport and full screen on a narrow one", () => {
  const mode = () => document.querySelector("[data-mode]")?.getAttribute("data-mode");
  const { unmount } = render(<Host version="v2" />);
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
  render(<Host version="v2" />);
  fireEvent.click(trigger());
  expect(mode()).toBe("fullscreen");
  expect(calculatorWindowStore.get().mode).not.toBe("docked");
});
