// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import MathText from "./MathText";

afterEach(cleanup);

const q17 =
  "A computer repair specialist charges $260 for the first two hours of repair plus an hourly fee for each additional hour. The total cost for 4 hours of repair is $400. Which function f gives the total cost, in dollars, for x hours of repair, where x ≥ 2?";

describe("currency prose stays outside math", () => {
  it("preserves the exact held Q17 stem as wrapping prose", () => {
    const { container } = render(<MathText text={q17} serializedFunctionLines />);
    expect(container.textContent).toBe(q17);
    expect(container.querySelector(".katex")).toBeNull();
  });
  it("preserves both currency amounts without swallowing later explicit math", () => {
    const { container } = render(<MathText text={`${q17} Solve $x + 1$.`} />);
    expect(container.querySelectorAll(".katex")).toHaveLength(1);
    expect(container.querySelector("annotation")?.textContent).toBe("x + 1");
    container.querySelectorAll(".katex").forEach((element) => element.remove());
    expect(container.textContent).toBe(`${q17} Solve .`);
  });
  it.each([
    "$1,260.50 for the service is charged; the total is $1,400.75.",
    "$20 for a ticket and $30 for a meal and $40 for a room.",
    "A carpenter charges a flat rate of $306 for the first 3 hours of work and $85 for each additional hour of work. Which equation gives the total amount y, in dollars, that the carpenter charges for x hours of work, where x >3?",
  ])("keeps currency amount pairs literal: %s", (text) => {
    const { container } = render(<MathText text={text} />);
    expect(container.textContent).toBe(text);
    expect(container.querySelector(".katex")).toBeNull();
  });
  it.each([
    ["$2 + 3$4", "2 + 3"],
    ["$3 sin x$4", "3 sin x"],
    ["$3 sin x $4", "3 sin x"],
    ["$2 ab + cd $3", "2 ab + cd"],
    ["$3 xy^2 $4", "3 xy^2"],
    ["$3 sin x\t$4", "3 sin x"],
    ["$3 for x $4", "3 for x"],
    ["$3 for the + x $4", "3 for the + x"],
    ["$3 for the - x $4", "3 for the - x"],
    ["$3 for the − x $4", "3 for the − x"],
    [String.raw`$260 \text{for the repair}$400`, String.raw`260 \text{for the repair}`],
    [String.raw`$\$80$ is on sale for $25\%$ off`, String.raw`\$80`],
    [String.raw`\(\$260\) and \(\$400\)`, String.raw`\$260`],
    ["$$260$$ for repairs and $400", "260"],
  ])("retains explicit math boundaries: %s", (text, latex) => {
    const { container } = render(<MathText text={text} />);
    expect(container.querySelector("annotation")?.textContent).toBe(latex);
    expect(container.querySelector(".katex-error")).toBeNull();
  });
});
