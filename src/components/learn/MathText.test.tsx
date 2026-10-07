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
  it("supports math and blanks inside exact source tokens", () => {
    const { container } = render(<MathText text={"<u>$\\dfrac{1}{4}$ and ______</u>"} />);
    expect(container.querySelector("u .katex .mfrac")).toBeTruthy();
    expect(container.querySelector('u [aria-label="blank"]')).toBeTruthy();
    expect(container.textContent).not.toContain("<u>");
  });
  it("escapes arbitrary markup inside a supported source span", () => {
    const { container } = render(<MathText text={'<u><img src="x" onerror="alert(1)"></u>'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("u")?.textContent).toBe('<img src="x" onerror="alert(1)">');
  });
  it("does not interpret attributes as underline markup", () => {
    const text = '<u onclick="alert(1)">unsafe</u>';
    const { container } = render(<MathText text={text} />);
    expect(container.querySelector("u")).toBeNull();
    expect(container.textContent).toBe(text);
  });
  // Approved B source versions: Q01 1e2f2370ad59; Q09 e93c2d610cba.
  it.each([
    {
      question: "2025-05_US_V2_RW_M2_Q01",
      passage:
        "Community science, which involves professional scientists collaborating with members of the public to study a topic, is often an effective and engaging way to conduct research. <u>It can increase the amount of data researchers can collect, offer insight into the daily life of a scientist, and spark youth interest in science.</u> This approach was essential to the success of biologist Grace Herzel and colleagues' study of how weather relates to a butterfly's flower choice, which included findings from hundreds of students and community members in northwestern Arkansas.",
      expected:
        "It can increase the amount of data researchers can collect, offer insight into the daily life of a scientist, and spark youth interest in science.",
    },
    {
      question: "2025-05_US_V2_RW_M2_Q09",
      passage:
        "The following text is from William Shakespeare's circa 1611 play The Winter's Tale. Camillo has been away from his home in Sicily and serves in the court of Polixenes, the king of Bohemia. He has asked Polixenes for permission to return to Sicily.\n\nPOLIXENES: I pray thee, good Camillo, be no more\nimportunate. 'Tis a sickness denying thee anything,\na death to grant this.\n\nCAMILLO: It is fifteen years since I saw my country.\nThough I have for the most part been aired abroad,\nI desire to lay my bones there. Besides, the penitent\nking, my master, hath sent for me, <u>to whose feeling\nsorrows I might be some allay-or I o'erween [presume] to\nthink so-</u>which is another spur to my departure.",
      expected:
        "to whose feeling\nsorrows I might be some allay-or I o'erween [presume] to\nthink so-",
    },
  ])("renders the exact approved source boundary for $question", ({ passage, expected }) => {
    const { container } = render(<MathText text={passage} />);
    expect(container.querySelectorAll("u")).toHaveLength(1);
    expect(container.querySelector("u")?.textContent).toBe(expected);
    expect(container.textContent).not.toContain("<u>");
    expect(container.textContent).not.toContain("</u>");
    container.querySelectorAll(".sr-only").forEach((el) => el.remove());
    expect(container.textContent).toBe(passage.replace("<u>", "").replace("</u>", ""));
  });
});
