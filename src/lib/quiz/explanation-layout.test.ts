import { describe, expect, it } from "vitest";
import { boxedAnswer, layoutExplanation } from "./explanation-layout";

describe("layoutExplanation: the bank's house shape", () => {
  const bank = [
    "What it asks: the word for what someone might do.",
    "",
    "1. Find the difference. They look very different.",
    '2. Find the turn. The "but" says their shared idea makes it possible.',
    "",
    "The answer is “Reconciling”.",
    "",
    "Why the others are wrong:",
    "• “Contrasting”: setting the two side by side would be easy.",
    "• “Supplanting”: this means replacing one with the other.",
    "",
    "Tip: Ask what would be surprising.",
  ].join("\n");

  it("reads what it asks, the steps, the answer, the other choices and the tip", () => {
    expect(layoutExplanation(bank)).toEqual([
      { kind: "asks", text: "the word for what someone might do." },
      {
        kind: "steps",
        items: [
          "Find the difference. They look very different.",
          'Find the turn. The "but" says their shared idea makes it possible.',
        ],
      },
      { kind: "answer", text: "“Reconciling”", letter: undefined },
      { kind: "heading", text: "Other choices" },
      {
        kind: "choices",
        items: [
          { choice: "“Contrasting”", text: "setting the two side by side would be easy." },
          { choice: "“Supplanting”", text: "this means replacing one with the other." },
        ],
      },
      { kind: "note", label: "Tip", text: "Ask what would be surprising." },
    ]);
  });

  it("keeps a check and a common slip as notes", () => {
    const blocks = layoutExplanation("Check: it works.\n\nA common slip: dividing first.");
    expect(blocks).toEqual([
      { kind: "note", label: "Check", text: "it works." },
      { kind: "note", label: "Common slip", text: "dividing first." },
    ]);
  });
});

describe("layoutExplanation: the four-part shape", () => {
  const solver = [
    "Question Type: Linear Equations (Math)",
    "1) Concept, Simply Restated",
    "",
    "For no solution, the x-terms must match.",
    "",
    "$$$$",
    "$$5x+2=5x+10$$",
    "$$$$",
    "",
    "2) How to Approach -- the WHY",
    "",
    "Set the coefficients equal.",
    "",
    "Why the others fail:",
    "",
    "B. Supplanting means replacing.",
    "Choice D, melodic, means having a tune.",
    "",
    "4) Recap: Main Lesson",
    "",
    "Match the coefficients.",
    "",
    "Final Answer",
    "$$\\boxed{\\text{A}}$$",
  ].join("\n");

  it("names the parts in short titles, drops the writer's label and the empty math lines", () => {
    expect(layoutExplanation(solver)).toEqual([
      { kind: "heading", text: "The idea" },
      { kind: "para", text: "For no solution, the x-terms must match." },
      { kind: "math", tex: "5x+2=5x+10" },
      { kind: "heading", text: "Approach" },
      { kind: "para", text: "Set the coefficients equal." },
      { kind: "heading", text: "Other choices" },
      {
        kind: "choices",
        items: [
          { choice: "B", text: "Supplanting means replacing." },
          { choice: "D", text: "melodic, means having a tune." },
        ],
      },
      { kind: "heading", text: "Remember" },
      { kind: "para", text: "Match the coefficients." },
      { kind: "answer", text: "\\text{A}", letter: "A" },
    ]);
  });

  it("keeps labelled givens on their own lines", () => {
    expect(
      layoutExplanation("The problem gives:\nSpeed: 17.7 mph\nConversion: 1 mile = 1,760 yards")
    ).toEqual([
      { kind: "para", text: "The problem gives:" },
      { kind: "para", text: "Speed: 17.7 mph" },
      { kind: "para", text: "Conversion: 1 mile = 1,760 yards" },
    ]);
  });

  it("keeps a numbered sentence as a step, not a title", () => {
    expect(layoutExplanation("1) Subtract 3 from both sides.")[0]).toEqual({
      kind: "para",
      text: "1) Subtract 3 from both sides.",
    });
  });
});

describe("boxedAnswer", () => {
  it("reads nested braces", () => {
    expect(boxedAnswer("$$\\boxed{\\frac{5}{9}}$$")).toBe("\\frac{5}{9}");
  });
  it("is null with no box", () => {
    expect(boxedAnswer("5/9")).toBeNull();
  });
});
