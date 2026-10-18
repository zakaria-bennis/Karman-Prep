// @vitest-environment jsdom
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { installDomStubs } from "@/components/calculator-v2/__fixtures__/dom-stubs";
import { CalculatorScope, CalculatorTrigger } from "./CalculatorScope";
import { CalculatorVersionProvider } from "./CalculatorVersion";

const imported = vi.hoisted(() => vi.fn());
const warm = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./font-warmup", () => ({
  warmCalculatorFonts: warm,
  onCalculatorFontsLoaded: () => () => {},
}));
vi.mock("@/components/calculator-v2/host/quiz-host", () => {
  imported();
  return {
    mountQuizCalculator: () => ({
      calculator: {},
      focusOnOpen: vi.fn(),
      focusBoundary: vi.fn(),
      setReducedMotion: vi.fn(),
      reflow: vi.fn(),
      destroy: vi.fn(),
    }),
  };
});
vi.mock("./CalculatorShell", () => ({ CalculatorShell: () => <div data-testid="v1-shell" /> }));

function Host({ version }: { version: "v1" | "v2" }) {
  const [open, setOpen] = useState(false);
  return (
    <CalculatorVersionProvider version={version}>
      <CalculatorScope enabled open={open} onOpenChange={setOpen} questionKey="attempt:q1">
        <CalculatorTrigger />
      </CalculatorScope>
    </CalculatorVersionProvider>
  );
}

it("AR-30, AR-41 nothing is imported or warmed before open or prefetch, trigger focus prefetches the module and warms the fonts, and v1 does neither", async () => {
  const restore = installDomStubs();
  const trigger = () => screen.getByRole("button", { name: "Toggle Karman calculator" });
  const v1 = render(<Host version="v1" />);
  fireEvent.pointerEnter(trigger());
  fireEvent.click(trigger());
  v1.unmount();
  render(<Host version="v2" />);
  await act(async () => {});
  expect(imported).not.toHaveBeenCalled();
  expect(warm).not.toHaveBeenCalled();
  act(() => trigger().focus());
  await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
  expect(warm).toHaveBeenCalledTimes(1);
  expect(document.querySelector("[data-calculator-window]")).toBeNull();
  restore();
});
