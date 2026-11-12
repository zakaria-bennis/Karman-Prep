// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Num } from "./primitives";
import { LevelRing, Ring } from "./Ring";
import { SkillSquares } from "./SkillSquares";

describe("portal motion markup", () => {
  afterEach(cleanup);

  it("a whole number counts up, and the real number stays readable", () => {
    const { container } = render(<Num big>{1340}</Num>);
    const el = container.querySelector(".kp-count") as HTMLElement;
    expect(el.className).toBe("kp-big kp-count");
    expect(el.style.getPropertyValue("--to")).toBe("1340");
    expect(screen.getByText("1340")).toBeTruthy();
  });

  it("count marks a small number to count, and carries its sign and percent", () => {
    const { container } = render(
      <>
        <Num count>+{15}</Num>
        <Num>{62}%</Num>
      </>
    );
    const [plus, pct] = [...container.querySelectorAll(".kp-count")] as HTMLElement[];
    expect(plus.dataset.go).toBe("");
    expect(plus.dataset.pre).toBe("+");
    expect(pct.dataset.go).toBeUndefined();
    expect(pct.dataset.post).toBe("%");
  });

  it("anything else is shown as written, with no counter", () => {
    const { container } = render(<Num>32:30</Num>);
    expect(container.querySelector(".kp-count")).toBeNull();
    expect(container.textContent).toBe("32:30");
  });

  it("rings carry their value for the fill, and a level ring sweeps instead", () => {
    const { container } = render(
      <>
        <Ring value={0.62} label="Math: 62%" />
        <LevelRing counts={{ 2: 3, 4: 1 }} />
      </>
    );
    const [ring, split] = [...container.querySelectorAll(".kp-ring")] as HTMLElement[];
    expect(ring.style.getPropertyValue("--kp-p")).toBe("0.62");
    expect(ring.hasAttribute("data-split")).toBe(false);
    expect(split.hasAttribute("data-split")).toBe(true);
  });

  it("skill squares are numbered for their pop-in", () => {
    const { container } = render(<SkillSquares skills={[1, 2, 3]} label="Algebra" />);
    const squares = [...container.querySelectorAll(".kp-sq")] as HTMLElement[];
    expect(squares.map((s) => s.style.getPropertyValue("--i"))).toEqual(["0", "1", "2"]);
  });
});
