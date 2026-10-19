// @vitest-environment jsdom
import { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { installDomStubs } from "@/components/calculator/__fixtures__/dom-stubs";
import { CalculatorScope, CalculatorTrigger } from "./CalculatorScope";

const imported = vi.hoisted(() => vi.fn());
const warm = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./font-warmup", () => ({
  warmCalculatorFonts: warm,
  onCalculatorFontsLoaded: () => () => {},
}));
vi.mock("@/components/calculator/host/quiz-host", () => {
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

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <CalculatorScope enabled open={open} onOpenChange={setOpen} questionKey="attempt:q1">
      <CalculatorTrigger />
    </CalculatorScope>
  );
}

it("AR-30, AR-41 nothing is imported or warmed before open or prefetch, trigger focus prefetches the module and warms the fonts", async () => {
  const restore = installDomStubs();
  const trigger = () => screen.getByRole("button", { name: "Toggle Karman calculator" });
  render(<Host />);
  await act(async () => {});
  expect(imported).not.toHaveBeenCalled();
  expect(warm).not.toHaveBeenCalled();
  act(() => trigger().focus());
  await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
  expect(warm).toHaveBeenCalledTimes(1);
  expect(document.querySelector("[data-calculator-window]")).toBeNull();
  restore();
});
