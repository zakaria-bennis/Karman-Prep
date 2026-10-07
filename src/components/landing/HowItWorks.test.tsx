// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div className={String(props.className ?? "")}>{children}</div>
    ),
  },
}));
vi.mock("react-useanimations", () => ({ default: () => null }));
vi.mock("react-useanimations/lib/checkmark", () => ({ default: {} }));
vi.mock("react-useanimations/lib/bookmark", () => ({ default: {} }));
vi.mock("react-useanimations/lib/arrowUpCircle", () => ({ default: {} }));
vi.mock("@/components/shared/Reveal", () => ({
  default: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

import HowItWorks from "./HowItWorks";

describe("public signup journey", () => {
  it("explains the three steps without claiming a predicted score or a guaranteed result", () => {
    render(<HowItWorks />);

    expect(screen.getByRole("heading", { name: "Tell us your starting point" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Review your options" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Find a place to begin" })).toBeTruthy();
    expect(screen.getByText(/35-question diagnostic/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /predicted score|proven three-step|exact weaknesses/i
    );
  });
});
