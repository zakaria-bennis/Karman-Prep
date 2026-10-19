// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { installDomStubs } from "@/components/calculator/__fixtures__/dom-stubs";
import ExternalCalculatorLink from "./ExternalCalculatorLink";

const probe = vi.hoisted(() => ({ keys: [] as (string | undefined)[] }));

vi.mock("@/components/calculator/host/quiz-host", () => ({
  mountQuizCalculator: () => ({
    calculator: {},
    focusOnOpen: vi.fn(),
    focusBoundary: vi.fn(),
    setReducedMotion: vi.fn(),
    reflow: vi.fn(),
    destroy: vi.fn(),
  }),
}));

vi.mock("@/components/calculator/CalculatorScope", async (original) => {
  const m = await original<typeof import("@/components/calculator/CalculatorScope")>();
  return {
    ...m,
    CalculatorTrigger: () => {
      const bridge = m.useCalculator();
      if (bridge) probe.keys.push(bridge.questionKey);
      return m.CalculatorTrigger();
    },
  };
});

describe("local calculator entry", () => {
  it("opens locally without an external link or embed", () => {
    const { container } = render(<ExternalCalculatorLink subject="math" />);
    expect(screen.getByRole("button", { name: "Toggle Karman calculator" })).toBeVisible();
    expect(container.querySelector("script, iframe, a")).toBeNull();
  });
  it.each(["reading", "rw", null, undefined])("fails closed outside Math: %s", (subject) => {
    render(<ExternalCalculatorLink subject={subject} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

it("AR-9 ExternalCalculatorLink forwards questionKey to the scope, else one stable fallback id, and opens the window", () => {
  const restore = installDomStubs();
  const tree = (key?: string) => <ExternalCalculatorLink subject="math" questionKey={key} />;
  const { rerender } = render(tree("a:q1"));
  expect(probe.keys.at(-1)).toBe("a:q1");
  const button = screen.getByRole("button", { name: "Toggle Karman calculator" });
  const id = button.getAttribute("aria-controls")!;
  fireEvent.click(button);
  expect(document.getElementById(id)).toHaveAttribute("data-calculator-host");
  rerender(tree());
  const fallback = probe.keys.at(-1)!;
  expect(fallback).toMatch(/\S/);
  expect(fallback).not.toBe("a:q1");
  rerender(tree());
  expect(probe.keys.at(-1)).toBe(fallback);
  expect(screen.getByRole("button", { name: "Toggle Karman calculator" })).toHaveAttribute(
    "aria-controls",
    id
  );
  restore();
});
