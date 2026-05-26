// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MatchConfidenceBadge } from "./MatchConfidenceBadge";

// Tests the 4-tone selection rule in MatchConfidenceBadge:
//   bad      orphan OR confidence < 0.60          → red XCircle
//   warn     confidence in [0.60, 0.85)           → amber AlertTriangle
//   good     confidence ≥ 0.85                    → green CheckCircle
//   neutral  null confidence + non-orphan method  → slate Minus
//
// The neutral case is the fix from the audit — previously a null
// confidence rendered as "good" green, which falsely implied page-
// level rows had passed a match check.

describe("MatchConfidenceBadge", () => {
  it("renders green 'good' tone at confidence 0.90", () => {
    const { container } = render(
      <MatchConfidenceBadge method="page_passage_snippet" confidence={0.9} />
    );
    expect(screen.getByText(/passage/)).toBeInTheDocument();
    expect(screen.getByText(/0\.90/)).toBeInTheDocument();
    // Tailwind class includes "emerald" for green tone
    expect(container.querySelector("span")?.className).toMatch(/emerald/);
  });

  it("renders amber 'warn' tone at confidence 0.65", () => {
    const { container } = render(
      <MatchConfidenceBadge method="page_choice_snippets" confidence={0.65} />
    );
    expect(container.querySelector("span")?.className).toMatch(/amber/);
  });

  it("renders red 'bad' tone for orphan method", () => {
    const { container } = render(<MatchConfidenceBadge method="orphan" confidence={0} />);
    expect(container.querySelector("span")?.className).toMatch(/rose/);
    expect(screen.getByText(/orphan/)).toBeInTheDocument();
  });

  it("renders red 'bad' tone for confidence < 0.60", () => {
    const { container } = render(
      <MatchConfidenceBadge method="ordered_fallback" confidence={0.5} />
    );
    expect(container.querySelector("span")?.className).toMatch(/rose/);
  });

  it("AUDIT FIX: renders neutral 'slate' tone for null confidence on non-orphan method", () => {
    // Page-level page_image rows have no per-question match score —
    // they should NOT render as green/good.
    const { container } = render(<MatchConfidenceBadge method="page_image" confidence={null} />);
    expect(container.querySelector("span")?.className).toMatch(/slate/);
    expect(container.querySelector("span")?.className).not.toMatch(/emerald/);
  });

  it("omits the numeric score when confidence is null", () => {
    render(<MatchConfidenceBadge method="page_image" confidence={null} />);
    expect(screen.queryByText(/0\.\d+/)).not.toBeInTheDocument();
  });

  it("includes the numeric score when confidence is a number", () => {
    render(<MatchConfidenceBadge method="page_stem_snippet" confidence={0.75} />);
    expect(screen.getByText(/0\.75/)).toBeInTheDocument();
  });
});
