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
    "Kayra spent $49 at a book sale and bought a total of 21 books. She bought h hardcover books for $3 each and p paperback books for $2 each.",
    "A company opens an account with an initial balance of $35,600.00. The account earns interest. The account balance after 15 years is $129,672.38.",
    "In 2000, the value of the collectible item was $30, and in 2002 the value of the collectible item was $36.30.",
    "Tom saved $40 each month for x months, and Karla saved $36 each month for y months.",
    "A 9-inch board costs $12 and a 3-inch board costs $4.",
    "Maya bought stickers and granola bars for $ 145. Each package of stickers cost $ 3, and each granola bar cost $ 1.",
    "The cost of renting a piece of equipment is $56n for the first day and $28n for each additional day.",
    "A bakery buys bags for $ 0.06 each and boxes for $ 0.38 each. The total cost is $ 524.72.",
    "The combined original price for a mirror and a vase is $60. After a 25% discount to the mirror and a 45% discount to the vase are applied, the combined sale price for the two items is $39.",
    "For a selling price of $120.00, zero products would be sold. For each $2.50 decrease in the selling price, revenue is exactly $1,437.50.",
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
