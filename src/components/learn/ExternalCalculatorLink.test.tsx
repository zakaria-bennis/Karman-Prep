// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExternalCalculatorLink from "./ExternalCalculatorLink";
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
