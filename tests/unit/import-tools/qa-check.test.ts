import { describe, expect, it } from "vitest";
import {
  checkDelivery,
  checkFigure,
  checkRow,
  checkText,
  displaySegments,
  renderedFigure,
  type Findings,
} from "../../../scripts/import-tools/ts/qa-check";

// Synthetic rows only; no source questions.
const text = (value: string, serialized = false) => {
  const f: Findings = {};
  checkText(f, "question_text", value, serialized);
  return f;
};

describe("qa-check text", () => {
  it("passes clean prose, paired tokens, currency and valid math", () => {
    expect(text("The <i>Harbor</i> cost $24 for the first day and $12 for each day.")).toEqual({});
    expect(text("What is $\\frac{1}{2}$ of [[u]]the whole[[/u]]?")).toEqual({});
  });

  it("reports KaTeX that does not parse", () => {
    expect(text("What is $\\frac{1}{$?").katex_error?.[0]).toMatch(/\\frac/);
  });

  it("reports unmatched and unsupported markup", () => {
    expect(text("A <u>quiet harbor.").markup_unmatched).toBeDefined();
    expect(text("A quiet <b>harbor</b>.").markup_as_text).toEqual([
      "question_text: <b>",
      "question_text: </b>",
    ]);
  });

  it("reports LaTeX and math delimiters shown as plain text", () => {
    expect(text("Which is \\frac{3}{4} of x?").latex_as_text).toBeDefined();
    expect(text("Solve $x + 1 for x.").math_delimiter_unbalanced).toBeDefined();
    expect(text("Solve \\(x + 1 for x.").math_delimiter_unbalanced).toBeDefined();
  });

  it("reports prose caught between two dollar amounts", () => {
    expect(text("He saved $45 in a bank. At the end he had $90 more.").prose_in_math).toBeDefined();
    expect(text("Solve $\\text{for all} x$ now.").prose_in_math).toBeUndefined();
  });

  it("splits text the way MathText does", () => {
    const { segments } = displaySegments("Find $x^2$ now.", false);
    expect(segments.map((s) => s.kind)).toEqual(["text", "inline", "text"]);
  });
});

describe("qa-check figures and delivery", () => {
  it("knows what the catalog screen draws", () => {
    expect(renderedFigure({ figure_kind: "image", image_url: null, figure_svg: null })).toBeNull();
    expect(renderedFigure({ figure_kind: "image", image_url: "https://x.test/a.png" })).toBe(
      "image_url"
    );
    expect(renderedFigure({ figure_kind: "table", figure_table_data: { rows: [["1"]] } })).toBe(
      "table"
    );
  });

  it("reports an image figure with nothing to draw and graph data no screen shows", () => {
    const f: Findings = {};
    checkFigure(f, { figure_kind: "image", figure_graph_data: { x: 1 } });
    expect(f.figure_invalid).toBeDefined();
    expect(f.figure_not_drawn).toHaveLength(2);
  });

  it("reports a broken choice table", () => {
    const f: Findings = {};
    checkFigure(f, { figure_kind: null, answer_choices: [{ letter: "A", choice_table_data: 7 }] });
    expect(f.choice_table_invalid).toBeDefined();
  });

  it("reports an unparseable numeric key and untagged rows", () => {
    const f: Findings = {};
    expect(
      checkDelivery(f, {
        answer_format: "numeric_entry",
        correct_answer: "x+1",
        answer_key_entries: [],
      })
    ).toBe("no_catalog_tag");
    expect(f.numeric_key_unparseable).toBeDefined();
  });

  it("reports scope evidence the catalog lane would refuse", () => {
    const f: Findings = {};
    const tagged = { approved_tags: { catalog_skill_id: "not-a-skill" } };
    expect(
      checkDelivery(f, {
        answer_format: "multiple_choice",
        correct_answer: "A",
        answer_key_entries: [{ id: "k", raw_model_response: tagged }],
      })
    ).toBe("breaks");
    expect(f.delivery_breaks_skill?.[0]).toMatch(/scope evidence refused/);
  });

  it("checks a whole row", () => {
    const r = checkRow({
      subject: "math",
      question_text: "What is $x$?",
      answer_format: "multiple_choice",
      correct_answer: "A",
      answer_choices: [{ letter: "A", choice_text: "$\\sqrt{}$" }],
      answer_key_entries: [],
    });
    expect(r.checks).toEqual({});
    expect(r.delivery).toBe("no_catalog_tag");
  });
});
