// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FAQClient from "./FAQClient";

describe("public FAQ", () => {
  it("uses the current diagnostic scope without outcome statistics", () => {
    const { container } = render(<FAQClient />);
    expect(container.textContent).toMatch(/35 Math and Reading & Writing questions/);
    expect(container.textContent).toMatch(/not a predicted official SAT score/);
    expect(container.textContent).not.toMatch(/\+285|2,400|200–300|20-question diagnostic/i);
  });
});
