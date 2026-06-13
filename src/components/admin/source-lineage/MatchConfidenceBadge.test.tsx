// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MatchConfidenceBadge } from "./MatchConfidenceBadge";

// Tests the 4-tone selection rule in MatchConfidenceBadge:
//   bad      orphan OR confidence < 0.60          → error XCircle
//   warn     confidence in [0.60, 0.85)           → warning AlertTriangle
//   good     confidence ≥ 0.85                    → success CheckCircle
//   neutral  null confidence + non-orphan method  → bronze Minus
//
// Tones use the observatory semantic palette (docs/brand.md "Status
// colors"): success / warning / error, with bronze for the neutral case.
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
    // Tailwind class includes "success" for the good tone
    expect(container.querySelector("span")?.className).toMatch(/success/);
  });

  it("renders amber 'warn' tone at confidence 0.65", () => {
    const { container } = render(
      <MatchConfidenceBadge method="page_choice_snippets" confidence={0.65} />
    );
    expect(container.querySelector("span")?.className).toMatch(/warning/);
  });

  it("renders red 'bad' tone for orphan method", () => {
    const { container } = render(<MatchConfidenceBadge method="orphan" confidence={0} />);
    expect(container.querySelector("span")?.className).toMatch(/error/);
    expect(screen.getByText(/orphan/)).toBeInTheDocument();
  });

  it("renders red 'bad' tone for confidence < 0.60", () => {
    const { container } = render(
      <MatchConfidenceBadge method="ordered_fallback" confidence={0.5} />
    );
    expect(container.querySelector("span")?.className).toMatch(/error/);
  });

  it("AUDIT FIX: renders neutral 'bronze' tone for null confidence on non-orphan method", () => {
    // Page-level page_image rows have no per-question match score —
    // they should NOT render as success/good.
    const { container } = render(<MatchConfidenceBadge method="page_image" confidence={null} />);
    expect(container.querySelector("span")?.className).toMatch(/bronze/);
    expect(container.querySelector("span")?.className).not.toMatch(/success/);
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
