// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MathText from "./MathText";
import QuestionTable from "./QuestionTable";
import { blankSegments, displayDashes } from "./dash-blank-display";

afterEach(cleanup);

describe("dash and blank display", () => {
  it("draws spaced and unspaced 3- and 4-hyphen runs in passages as one em dash", () => {
    const passage =
      "Researchers have explored how convergent evolution --- a phenomenon in which unrelated " +
      "species develop similar traits ---- shapes animal venom.";
    const { container } = render(<MathText text={passage} treatBlankWord />);
    expect(container.textContent).toBe(
      "Researchers have explored how convergent evolution—a phenomenon in which unrelated " +
        "species develop similar traits—shapes animal venom."
    );
  });

  it("keeps the blank next to an em dash in a stem", () => {
    const stem =
      "Artist Sally Black often uses sumac---a textured and flexible ______ craft baskets.";
    const { container } = render(<MathText text={stem} />);
    expect(container.querySelector('[aria-label="blank"]')).toBeTruthy();
    expect(container.textContent).toBe(
      "Artist Sally Black often uses sumac—a textured and flexible  craft baskets."
    );
  });

  it("draws an answer choice's trailing dash and a line-ending dash", () => {
    expect(render(<MathText text="dendrochronologist ---" />).container.textContent).toBe(
      "dendrochronologist—"
    );
    expect(displayDashes("Of prancing Poetry ---\nThis Traverse")).toBe(
      "Of prancing Poetry—\nThis Traverse"
    );
  });

  it("never touches math, minus signs, table syntax or horizontal rules", () => {
    const { container } = render(<MathText text="If $x---y = 3$ and $-2 - -1$, find x--1." />);
    expect(container.querySelector("annotation")?.textContent).toBe("x---y = 3");
    expect(container.textContent).toContain("find x--1.");
    expect(render(<MathText text={String.raw`\(a---b\)`} />).container.textContent).not.toContain(
      "—"
    );
    expect(displayDashes("well-known 5 - 3 and 5 - -3 or x--2")).toBe(
      "well-known 5 - 3 and 5 - -3 or x--2"
    );
    expect(displayDashes("| $x$ | $f(x)$ |\n|---|---|\n| :---: | --- |")).toBe(
      "| $x$ | $f(x)$ |\n|---|---|\n| :---: | --- |"
    );
    expect(displayDashes("Part one\n---\nPart two\n----------")).toBe(
      "Part one\n---\nPart two\n----------"
    );
  });

  it("draws 2-hyphen and 5+-hyphen runs touching words as one em dash", () => {
    expect(displayDashes("history and culture--such as Grove Farm")).toBe(
      "history and culture—such as Grove Farm"
    );
    expect(displayDashes("an emulsion -- a mixture")).toBe("an emulsion—a mixture");
    expect(displayDashes("the stream-----like others------has more")).toBe(
      "the stream—like others—has more"
    );
  });

  it("draws spaced hyphens, line-split runs and hyphen-em dash mixes as one em dash", () => {
    expect(displayDashes("study- - -")).toBe("study—");
    expect(displayDashes("efforts that - - - through")).toBe("efforts that—through");
    expect(displayDashes("a wide distinction --\n- why it must")).toBe(
      "a wide distinction—why it must"
    );
    expect(displayDashes("network (CMN)-—a lattice")).toBe("network (CMN)—a lattice");
    expect(displayDashes("network —-- a lattice")).toBe("network—a lattice");
    expect(displayDashes("the mid- - twentieth century")).toBe("the mid- - twentieth century");
  });

  it("draws a spaced 5+-hyphen run at a gap as the answer blank", () => {
    const { container } = render(
      <MathText
        text={"The shift, however, suggests that ------\n\nWhich choice completes the text?"}
      />
    );
    expect(container.querySelectorAll('[aria-label="blank"]')).toHaveLength(1);
    expect(container.textContent).not.toContain("-");
    const mid = render(<MathText text="the -------- of the river" />).container;
    expect(mid.querySelectorAll('[aria-label="blank"]')).toHaveLength(1);
    expect(mid.textContent).toBe("the  of the river");
  });

  it("keeps URLs and code literal", () => {
    expect(displayDashes("see https://a--b.example/x---y and `--flag`")).toBe(
      "see https://a--b.example/x---y and `--flag`"
    );
    const { container } = render(<MathText text="run `my__var` at www.a__b.org" />);
    expect(container.querySelectorAll('[aria-label="blank"]')).toHaveLength(0);
  });

  it("draws every underscore run, glued or spaced, as the same blank", () => {
    const texts = [
      "The answer is __ today.",
      "The answer is ______ today.",
      "The answer is ______________ today.",
      "They are hardly__many chondrites.",
      "the results showed that______",
      "The answer is _ _ _ today.",
      "scholars recently ______blank to discuss",
    ];
    for (const text of texts) {
      const { container } = render(<MathText text={text} />);
      const blanks = container.querySelectorAll<HTMLElement>('[aria-label="blank"]');
      expect(blanks, text).toHaveLength(1);
      expect(blanks[0].style.width).toBe("4em");
      expect(container.textContent).not.toContain("_");
      cleanup();
    }
    expect(render(<MathText text="snake_case and $x_{2}$" />).container.textContent).toContain(
      "snake_case"
    );
  });

  it("shows an underscore blank followed by the word blank as one blank", () => {
    const texts = [
      "SN 2006gy was a ______ blank explosion of a massive star.",
      "writing that ______ blank\n\nWhich quotation best illustrates the claim?",
      "the ______ BLANK, of sleek elements",
      "the ______ [blank] of sleek elements",
      "the ______blank of sleek elements",
    ];
    for (const text of texts) {
      for (const treatBlankWord of [false, true]) {
        const { container } = render(<MathText text={text} treatBlankWord={treatBlankWord} />);
        expect(container.querySelectorAll('[aria-label="blank"]'), text).toHaveLength(1);
        expect(container.textContent?.toLowerCase()).not.toContain("blank");
        cleanup();
      }
    }
    expect(render(<MathText text="was a ______ blank, then" />).container.textContent).toBe(
      "was a , then"
    );
  });

  it("keeps the ordinary word blank in stems and choices", () => {
    const { container } = render(
      <MathText text="p gives the number of blank sheets of paper. [Blank response field]" />
    );
    expect(container.querySelectorAll('[aria-label="blank"]')).toHaveLength(0);
    expect(container.textContent).toContain("blank sheets");
  });

  it("renders at most one blank for a question built from every blank form", () => {
    const question = [
      "Passage: the mineral record suggests that ------",
      "Stem: Researchers ______ blank to discuss the --- work.",
      "Choice: hardly--many",
    ];
    const blanks = (text: string) => blankSegments(text).filter((s) => s.isBlank).length;
    expect(blanks(question[0])).toBe(1);
    expect(blanks(question[1])).toBe(1);
    expect(blanks(question[2])).toBe(0);
    expect(blanks("a ______ blank and a ______blank")).toBe(2);
  });

  it("draws em dashes in plain table cells", () => {
    const { container } = render(
      <QuestionTable
        data={{
          header_row: ["Year", "Note"],
          rows: [
            ["1990", "none --- yet"],
            ["1991", "rain--then sun"],
            ["1992", "--"],
          ],
        }}
      />
    );
    expect(container.textContent).toContain("none—yet");
    expect(container.textContent).toContain("rain—then sun");
    expect(container.textContent).toContain("1992—");
  });
});
