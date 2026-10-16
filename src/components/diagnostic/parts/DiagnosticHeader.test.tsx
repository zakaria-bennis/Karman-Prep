// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CalculatorScope } from "@/components/calculator/CalculatorScope";
import { DiagnosticHeader } from "./DiagnosticHeader";

it("uses one external link only for Math while retaining diagnostic controls and time", () => {
  const props = {
    sectionPosition: 2,
    sectionLength: 20,
    isMathQuestion: true,
    scratchpadOpen: false,
    isBookmarked: false,
    currentSection: "math" as const,
    sectionTimeLeft: 600,
    timerColor: "#2FA8FF",
    timerPct: 50,
    minutesLeft: 10,
    onOpenExit: vi.fn(),
    onOpenNavigator: vi.fn(),
    onToggleScratchpad: vi.fn(),
    onToggleBookmark: vi.fn(),
  };
  const { rerender, container } = render(
    <CalculatorScope enabled open={false} onOpenChange={() => {}}>
      <DiagnosticHeader {...props} />
    </CalculatorScope>
  );
  expect(screen.getByRole("button", { name: "Toggle Karman calculator" })).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("10:00")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/Question\s*\d+|2\s*\/\s*20/);
  expect(screen.getByRole("button", { name: "Exit diagnostic" })).toBeInTheDocument();
  expect(container.querySelector("script, iframe")).toBeNull();
  rerender(<DiagnosticHeader {...props} isMathQuestion={false} currentSection="rw" />);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("10:00")).toBeInTheDocument();
});
