// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MathText from "./MathText";
import QuestionTable from "./QuestionTable";
import {
  displayLineHyphens,
  displayListBullets,
  joinSplitCompounds,
} from "./hyphen-spacing-display";

afterEach(cleanup);

describe("spaced single hyphen display", () => {
  it("shows note lists as bullets", () => {
    const notes =
      "A student has taken the following notes:\n- Most species are non-native.\n" +
      "- 1905: Lowell begins the search.\n- <i>Save Me</i> is a sculpture.\n- “Imagine” (1971)";
    const { container } = render(<MathText text={notes} treatBlankWord />);
    expect(container.textContent).toBe(
      "A student has taken the following notes:\n• Most species are non-native.\n" +
        "• 1905: Lowell begins the search.\n• Save Me is a sculpture.\n• “Imagine” (1971)"
    );
    expect(container.querySelector("i")?.textContent).toBe("Save Me");
  });

  it("keeps lone minus lines, equation lines and inline hyphens", () => {
    expect(displayListBullets("- 5")).toBe("- 5");
    expect(displayListBullets("Solve:\n- 6x + 48px = 96\n- 4x = 63")).toBe(
      "Solve:\n- 6x + 48px = 96\n- 4x = 63"
    );
    expect(displayListBullets("one - two\nthree - four")).toBe("one - two\nthree - four");
    expect(displayListBullets("-21.0\n-3")).toBe("-21.0\n-3");
  });

  it("draws spaced minus signs against their numbers", () => {
    expect(displayLineHyphens("- 5")).toBe("-5");
    expect(displayLineHyphens("- 1/6")).toBe("-1/6");
    expect(displayLineHyphens("- (5/12)π (180°/π)")).toBe("-(5/12)π (180°/π)");
    expect(displayLineHyphens("- 6x + 48px = 96\n\nIn the given equation")).toBe(
      "-6x + 48px = 96\n\nIn the given equation"
    );
    expect(displayLineHyphens("- 5 apples")).toBe("- 5 apples");
    expect(displayLineHyphens("Notes:\n- 1905: a start\n- 1916: an end")).toBe(
      "Notes:\n• 1905: a start\n• 1916: an end"
    );
    expect(render(<MathText text="- 72" />).container.textContent).toBe("-72");
  });

  it("joins compounds split by a stray space or a line break", () => {
    expect(joinSplitCompounds("rail is more cost- effective than")).toBe(
      "rail is more cost-effective than"
    );
    expect(joinSplitCompounds("by three- striped night monkeys")).toBe(
      "by three-striped night monkeys"
    );
    expect(joinSplitCompounds("the post- Reconstruction Delta")).toBe(
      "the post-Reconstruction Delta"
    );
    expect(joinSplitCompounds("the x- intercept")).toBe("the x-intercept");
    expect(joinSplitCompounds("(height-to- length ratio)")).toBe("(height-to-length ratio)");
    expect(joinSplitCompounds("in the xy-\nplane? without time-\nconsuming steps")).toBe(
      "in the xy-plane? without time-consuming steps"
    );
  });

  it("keeps suspended hyphens, dash-like breaks and math", () => {
    for (const text of [
      "plant- and animal-inspired forms",
      "gray- and tan-hued minerals",
      "nineteenth- and early twentieth-century",
      "the over- or underrepresentation",
      "precious metals- among their primary aims",
      "to the eternity- of mortal time",
      "g(x) = (x + 17)(t- x)",
      "the natural iconography-\nplacid inland rivers",
      "the suffix -ly and 5 - 3",
      "the mid- - twentieth century",
    ])
      expect(joinSplitCompounds(text)).toBe(text);
  });

  it("joins a hyphenated suffix to the math before it", () => {
    const { container } = render(<MathText text={String.raw`in the \(xy\) -plane, a line`} />);
    expect(container.textContent).toMatch(/-plane, a line$/);
    expect(container.textContent).not.toMatch(/\s-plane/);
  });

  it("joins split compounds in plain table cells", () => {
    const { container } = render(
      <QuestionTable
        data={{ header_row: ["Scenario", "Change"], rows: [["tariff- removal", "4%"]] }}
      />
    );
    expect(container.textContent).toContain("tariff-removal");
  });
});
