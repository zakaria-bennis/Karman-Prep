// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MathText from "./MathText";
import QuestionTable from "./QuestionTable";
import { displayEmDashes } from "./em-dash-display";

afterEach(cleanup);

describe("em dash display", () => {
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
    expect(displayEmDashes("Of prancing Poetry ---\nThis Traverse")).toBe(
      "Of prancing Poetry—\nThis Traverse"
    );
  });

  it("never touches math, minus signs, double hyphens, long rules or table syntax", () => {
    const { container } = render(<MathText text="If $x---y = 3$ and $-2 - -1$, find x--y." />);
    expect(container.querySelector("annotation")?.textContent).toBe("x---y = 3");
    expect(container.textContent).toContain("find x--y.");
    expect(render(<MathText text={String.raw`\(a---b\)`} />).container.textContent).not.toContain(
      "—"
    );
    expect(displayEmDashes("well-known -- 5 - 3 -----")).toBe("well-known -- 5 - 3 -----");
    expect(displayEmDashes("| $x$ | $f(x)$ |\n|---|---|\n| :---: | --- |")).toBe(
      "| $x$ | $f(x)$ |\n|---|---|\n| :---: | --- |"
    );
  });

  it("leaves underscore blanks as blanks", () => {
    const { container } = render(<MathText text="The answer is ______ today." />);
    expect(container.querySelectorAll('[aria-label="blank"]')).toHaveLength(1);
    expect(container.textContent).toBe("The answer is  today.");
  });

  it("draws em dashes in plain table cells", () => {
    const { container } = render(
      <QuestionTable data={{ header_row: ["Year", "Note"], rows: [["1990", "none --- yet"]] }} />
    );
    expect(container.textContent).toContain("none—yet");
  });
});
