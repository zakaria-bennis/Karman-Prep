// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DOMAIN_LABELS, type SATDomain } from "@/types";
import { SITE_THEMES, themeTokens } from "@/lib/themes/palettes";
import DiagnosticClient from "./DiagnosticClient";
import type { DiagnosticQuestion } from "./_hooks/useDiagnosticState";

vi.mock("next/navigation", () => ({
  usePathname: () => "/free-diagnostic",
  useRouter: () => ({ replace: vi.fn() }),
}));
afterEach(() => vi.useRealTimers());
function question(domain: SATDomain): DiagnosticQuestion {
  return {
    id: "local",
    domain,
    difficulty: 1,
    conceptId: "local",
    text: "Preserve 2/11.",
    options: ["A. One", "B. Two"],
    correct: "A",
    explanation: "Local.",
  };
}
it("retains the section countdown and urgency boundaries while using theme-aware timer colors", () => {
  vi.useFakeTimers();
  render(<DiagnosticClient questions={[question("info_ideas")]} isSubscribed />);
  expect(screen.getByText("18:00").style.color).toBe("rgb(var(--k-info))");
  act(() => vi.advanceTimersByTime(779000));
  expect(screen.getByText("5:01").style.color).toBe("rgb(var(--k-info))");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("5:00").style.color).toBe("rgb(var(--k-warning))");
  act(() => vi.advanceTimersByTime(239000));
  expect(screen.getByText("1:01").style.color).toBe("rgb(var(--k-warning))");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("1:00").style.color).toBe("rgb(var(--k-error))");
  expect(screen.getByText("Preserve 2/11.")).toBeInTheDocument();
});
it.each(Object.keys(DOMAIN_LABELS) as SATDomain[])(
  "preserves %s's domain label with a themed subject badge",
  (domain) => {
    render(<DiagnosticClient questions={[question(domain)]} isSubscribed />);
    const label = screen.getByText(DOMAIN_LABELS[domain]);
    expect(label).toHaveClass("bg-surface");
    expect(label).toHaveClass(
      ["algebra", "advanced_math", "geometry", "data_analysis"].includes(domain)
        ? "text-math"
        : "text-rw"
    );
    expect(label.style.color).toBe("");
  }
);
function luminance(hex: string) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
it.each(SITE_THEMES)("keeps diagnostic timer and subject text readable in $id", (theme) => {
  const tokens = themeTokens(theme);
  for (const name of ["info", "warning", "error", "math", "rw"]) {
    const a = luminance(tokens[name]),
      b = luminance(theme.surface);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
