import { describe, expect, it } from "vitest";
import {
  layoutStem,
  readingPart,
  splitMathStem,
  unwrapMathProse,
  unwrapProse,
} from "./stem-layout";

describe("unwrapProse", () => {
  it("joins a sentence the PDF broke across lines", () => {
    expect(unwrapProse("“The Sad Fortunes of the Rev. Amos\nBarton.” The Countess")).toBe(
      "“The Sad Fortunes of the Rev. Amos Barton.” The Countess"
    );
  });
});

describe("layoutStem", () => {
  it("keeps paragraphs, flows each one, and sets the question last", () => {
    const blocks = layoutStem(
      "The following text is from a story.\n\nIt is true, the countess was a little vain, a\nlittle given to white lies.\n\nWhich choice best states the main idea of the text?"
    );
    expect(blocks).toEqual([
      { kind: "prose", text: "The following text is from a story." },
      {
        kind: "prose",
        text: "It is true, the countess was a little vain, a little given to white lies.",
      },
      { kind: "prompt", text: "Which choice best states the main idea of the text?" },
    ]);
  });

  it("moves a question asked before the passage to after it", () => {
    const blocks = layoutStem(
      "Which choice best describes the overall structure of the text?\n\nThe HMS <i>Algerine</i> is one of three million wrecks."
    );
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "prompt"]);
    expect(blocks[0]).toEqual({
      kind: "prose",
      text: "The HMS <i>Algerine</i> is one of three million wrecks.",
    });
  });

  it("turns notes into a list, with the lead line and the question apart", () => {
    const blocks = layoutStem(
      "While researching a topic, a student has taken the following notes:\n• Snow hydrologist Julie Koeberle maintains stations.\n• They are called SNOTEL sites.\n• There are around 90 sites\nthroughout Wyoming.\n\nThe student wants to emphasize the number of sites. Which choice most effectively uses relevant information from the notes to accomplish this goal?"
    );
    expect(blocks).toEqual([
      {
        kind: "prose",
        text: "While researching a topic, a student has taken the following notes:",
      },
      {
        kind: "notes",
        items: [
          "Snow hydrologist Julie Koeberle maintains stations.",
          "They are called SNOTEL sites.",
          "There are around 90 sites throughout Wyoming.",
        ],
      },
      {
        kind: "prompt",
        text: "The student wants to emphasize the number of sites. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
      },
    ]);
  });

  it("reads '- ' lines as notes too", () => {
    const blocks = layoutStem("- One fact.\n- Another fact.");
    expect(blocks).toEqual([{ kind: "notes", items: ["One fact.", "Another fact."] }]);
  });

  it("keeps a poem's lines", () => {
    const blocks = layoutStem(
      "The following text is from a 1920 poem.\n\nI wandered lonely as a cloud\nThat floats on high o'er vales and hills,\nWhen all at once I saw a crowd\n\nWhich choice best describes the text?"
    );
    expect(blocks[1]).toEqual({
      kind: "verse",
      text: "I wandered lonely as a cloud\nThat floats on high o'er vales and hills,\nWhen all at once I saw a crowd",
    });
  });

  it("parts a poem's intro line from its lines when no blank line sits between", () => {
    const blocks = layoutStem(
      "The following text is Emily Dickinson’s circa 1859 poem “Setting Sail.”\nExultation is the going\nOf an inland soul to sea,—\nPast the houses, past the headlands,\nInto deep eternity!\n\nWhich choice best states the main idea of the text?"
    );
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "verse", "prompt"]);
  });

  it("reads 'Text1' with no space as a label", () => {
    expect(layoutStem("Text1\nA view.")[0]).toEqual({ kind: "label", text: "Text 1" });
  });

  it("labels Text 1 and Text 2", () => {
    const blocks = layoutStem(
      "Text 1\nScientists long held one view.\n\nText 2\nNew work suggests\nanother.\n\nWhich choice best describes how Text 2 relates to Text 1?"
    );
    expect(blocks.map((b) => b.kind)).toEqual(["label", "prose", "label", "prose", "prompt"]);
    expect(blocks[3]).toEqual({ kind: "prose", text: "New work suggests another." });
  });

  it("leaves a fill-in-the-blank passage and its question in order", () => {
    const blocks = layoutStem(
      "The shark's temperature is ______ that classification.\n\nWhich choice completes the text with the most logical and precise word or phrase?"
    );
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "prompt"]);
  });
});

describe("unwrapMathProse", () => {
  it("joins words broken across lines and keeps equation lines", () => {
    const src =
      "y = 2,600(a)ˣ\nThe given equation gives the number. According\nto the equation, what is y?";
    const out = unwrapMathProse(src);
    expect(out).toBe(
      "y = 2,600(a)ˣ\nThe given equation gives the number. According to the equation, what is y?"
    );
    expect(out.length).toBe(src.length);
  });
});

describe("unwrapProse dashes", () => {
  it("closes up a dash split across the break", () => {
    expect(unwrapProse("a wide distinction --\n- why it must")).toBe(
      "a wide distinction --- why it must"
    );
  });
});

describe("readingPart", () => {
  const text = "A passage.\n\nWhich choice best states the main idea of the text?";
  it("splits the passage from the question", () => {
    expect(readingPart(text, "lead")).toEqual([{ kind: "prose", text: "A passage." }]);
    expect(readingPart(text, "ask")).toEqual([
      { kind: "prompt", text: "Which choice best states the main idea of the text?" },
    ]);
  });
  it("keeps everything in the question pane when there is no question to split off", () => {
    expect(readingPart("Just words.", "lead")).toEqual([]);
    expect(readingPart("Just words.", "ask")).toEqual([{ kind: "prose", text: "Just words." }]);
  });
});

describe("splitMathStem", () => {
  it("leaves a short question whole", () => {
    expect(splitMathStem("If 3x + 5 = 20, what is the value of x?")).toBeNull();
  });
  it("puts the setup left and the last sentence right", () => {
    const s =
      "y = x² − 37x\ny = −\\(\\frac{1}{12}\\)(108x + k)\n\nIn the given system of equations, k is a positive constant. The graphs of the equations in the given system intersect at exactly one point (x, y) in the xy-plane. What is the value of x?";
    expect(splitMathStem(s)).toEqual({
      lead: "y = x² − 37x\ny = −\\(\\frac{1}{12}\\)(108x + k)\n\nIn the given system of equations, k is a positive constant. The graphs of the equations in the given system intersect at exactly one point (x, y) in the xy-plane.",
      ask: "What is the value of x?",
    });
  });
  it("does not cut inside a decimal", () => {
    const s =
      "A store sells pens for $1.25 each and notebooks for $3.50 each. A customer buys 4 more pens than notebooks and spends $22.75 in all on pens and notebooks together today. How many notebooks did the customer buy?";
    expect(splitMathStem(s)?.ask).toBe("How many notebooks did the customer buy?");
  });
});

describe("unwrapMathProse equations", () => {
  it("keeps two equations on their own lines", () => {
    expect(unwrapMathProse("y = x² − 37x\ny = 2x + 1")).toBe("y = x² − 37x\ny = 2x + 1");
  });
  it("keeps a line that starts with a variable", () => {
    expect(unwrapMathProse("where a is a constant\nb = 4")).toBe("where a is a constant\nb = 4");
  });
});

describe("splitMathStem setup rules", () => {
  const short =
    "y > 5x − 4\nFor which of the following tables are all the values of x and their corresponding values of y solutions to the given inequality?";
  it("keeps an equation-only setup with its question when there is no figure", () => {
    expect(splitMathStem(short)).toBeNull();
  });
  it("moves the setup left with a figure, however short the question", () => {
    expect(
      splitMathStem("The table gives the counts. What is the total?", { figure: true })
    ).toEqual({
      lead: "The table gives the counts.",
      ask: "What is the total?",
    });
  });
  it("closes up a run of blank lines", () => {
    const s =
      "A study. The table gives the number of gamers.\n\n\nWhich aspect will prevent the results from being generalized?";
    expect(splitMathStem(s, { figure: true })?.lead).toBe(
      "A study. The table gives the number of gamers."
    );
  });
});
