// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MathText from "./MathText";

afterEach(cleanup);
describe("source-formatting rendering", () => {
  it("underlines only the supplied source span and removes formatting markers", () => {
    const { container } = render(<MathText text="Before [[u]]the selected clause[[/u]] after." />);
    expect(container.querySelector("u")?.textContent).toBe("the selected clause");
    expect(container.textContent).not.toContain("[[u]]");
    expect(screen.getByText("Start of underlined text.")).toBeTruthy();
    expect(screen.getByText("End of underlined text.")).toBeTruthy();
  });
  it("preserves stacked fractions and blanks within the marked span", () => {
    const { container } = render(<MathText text={"[[u]]$\\dfrac{1}{4}$ and ______[[/u]]"} />);
    expect(container.querySelector("u .katex .mfrac")).toBeTruthy();
    expect(container.querySelector('u [aria-label="blank"]')).toBeTruthy();
  });
  it("renders source HTML as text rather than executing markup", () => {
    const { container } = render(<MathText text={'[[u]]<img src="x" onerror="alert(1)">[[/u]]'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("u")?.textContent).toContain("<img");
  });
  it("keeps ordinary math and malformed formatting readable", () => {
    const { container } = render(<MathText text={"$x^2$ [[u]]unclosed"} />);
    expect(container.querySelector(".katex")).toBeTruthy();
    expect(container.querySelector("u")).toBeNull();
    expect(container.textContent).toContain("[[u]]unclosed");
  });
});
