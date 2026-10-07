// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExternalCalculatorLink, { OFFICIAL_SAT_CALCULATOR } from "./ExternalCalculatorLink";

describe("official external calculator", () => {
  it("uses a normal new-tab link without an embed or source-question transfer", () => {
    const { container } = render(<ExternalCalculatorLink subject="math" />);
    const link = screen.getByRole("link", { name: "Open official SAT calculator in a new tab" });
    expect(link).toHaveAttribute("href", OFFICIAL_SAT_CALCULATOR);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("New tab")).toBeVisible();
    expect(container.querySelector("script, iframe")).toBeNull();
  });
  it.each(["reading", "rw", null, undefined])("fails closed for non-Math context %s", (subject) => {
    render(<ExternalCalculatorLink subject={subject} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
