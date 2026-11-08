import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadExam, originalFile, parseRenderableText } from "./exam-data";
import { isCorrectAnswer } from "./grading";

const EXAM = "2099-01_SYN_V1";
const VERSION = "B-NEWEXAM-2099-01_SYN_V1-abc123";
let dir: string;

function put(
  category: string,
  id: string,
  text: string,
  teacher: Record<string, unknown>,
  source: Record<string, unknown>
) {
  const folder = path.join(dir, "new-exams", "packages", EXAM, VERSION, category, id);
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "student.json"), JSON.stringify({ renderable_text: text }));
  writeFileSync(path.join(folder, "teacher.json"), JSON.stringify(teacher));
  writeFileSync(path.join(folder, "source.json"), JSON.stringify(source));
  writeFileSync(path.join(folder, "original.png"), "png-bytes");
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "exam-preview-"));
  mkdirSync(path.join(dir, "new-exams", "packages", EXAM, VERSION), { recursive: true });
  writeFileSync(path.join(dir, "new-exams", "packages", EXAM, VERSION, "READY.json"), "{}");
  put(
    "Problems that passed",
    `${EXAM}_MATH_M1_Q02`,
    "3x = 12\nWhat is x?",
    { key_answer: "4", question_type: "numeric_response", figure: false, complete: true },
    { section: "MATH", module: 1, question: 2, issues: [] }
  );
  put(
    "Problems that passed",
    `${EXAM}_MATH_M1_Q01`,
    "In the scatterplot, which point is above the line?\n[Graph: scatterplot with six points.]\nA) (1, 2)\nB) (2, 3)\nC) (3, 4)\nD) (4, 5)",
    { key_answer: "B", question_type: "multiple_choice", figure: true, complete: true },
    { section: "MATH", module: 1, question: 1, issues: [] }
  );
  put(
    "Problems that passed",
    `${EXAM}_RW_M1_Q01`,
    "A passage about ______ things.\n\nWhich choice completes the text?\nA) one\nB) two\nC) three\nD) four",
    { key_answer: "C", question_type: "multiple_choice", figure: false, complete: true },
    { section: "RW", module: 1, question: 1, issues: [] }
  );
  put(
    "Broken problems",
    `${EXAM}_RW_M2_Q01`,
    "Some text.\n\n[Graph: clipped bar chart.]\n\nWhich choice uses the graph?\nA) a\nB) b\nC) c\nD) d",
    { key_answer: "A", question_type: "multiple_choice", figure: true, complete: false },
    { section: "RW", module: 2, question: 1, issues: ["legend not printed"] }
  );
});

describe("loadExam", () => {
  it("orders RW 1, RW 2, Math 1, Math 2 by question number", async () => {
    const exam = await loadExam(EXAM, dir);
    expect(exam?.version).toBe(VERSION);
    expect(exam?.modules.map((m) => `${m.section}${m.module}:${m.minutes}`)).toEqual([
      "RW1:32",
      "RW2:32",
      "MATH1:35",
    ]);
    expect(exam?.modules[2].questions.map((q) => q.number)).toEqual([1, 2]);
  });

  it("builds student questions: passage, choices, grid-in, figure from original.png", async () => {
    const exam = (await loadExam(EXAM, dir))!;
    const rw = exam.modules[0].questions[0];
    expect(rw.question.passage).toBe("A passage about ______ things.");
    expect(rw.question.question_text).toBe("Which choice completes the text?");
    expect(rw.question.answer_choices.map((c) => c.choice_text)).toEqual([
      "one",
      "two",
      "three",
      "four",
    ]);
    expect(rw.printedKey).toBe("C");
    const [figure, gridIn] = exam.modules[2].questions;
    expect(figure.question.image_url).toBe(
      `/dev/exam-preview/files/${EXAM}/${EXAM}_MATH_M1_Q01/original.png`
    );
    expect(figure.question.question_text).not.toContain("[Graph");
    expect(gridIn.question.answer_format).toBe("numeric_entry");
    expect(gridIn.question.answer_choices).toEqual([]);
  });

  it("uses a rebuilt figure.json only once it holds a figure", async () => {
    const folder = path.join(dir, "figures", `${EXAM}_MATH_M1_Q01`);
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, "figure.json"), JSON.stringify({ figure_kind: null }));
    let exam = (await loadExam(EXAM, dir))!;
    expect(exam.modules[2].questions[0].question.image_url).toContain("original.png");
    const table = { header_row: ["x", "y"], rows: [["1", "2"]] };
    writeFileSync(
      path.join(folder, "figure.json"),
      JSON.stringify({ figure_kind: "table", figure_table_data: table })
    );
    exam = (await loadExam(EXAM, dir))!;
    expect(exam.modules[2].questions[0].question.image_url).toBeNull();
    expect(exam.modules[2].questions[0].question.figure_table_data).toEqual(table);
  });

  it("keeps broken problems, flagged as capture incomplete", async () => {
    const exam = (await loadExam(EXAM, dir))!;
    const broken = exam.modules[1].questions[0];
    expect(broken.incomplete).toBe(true);
    expect(broken.issues).toEqual(["legend not printed"]);
    expect(exam.modules[0].questions[0].incomplete).toBe(false);
  });

  it("refuses bad ids and serves original.png only for a real question", async () => {
    expect(await loadExam("../etc", dir)).toBeNull();
    expect(await loadExam("2000-01_NONE_V1", dir)).toBeNull();
    expect(await originalFile(EXAM, "../../secret", dir)).toBeNull();
    const bytes = await originalFile(EXAM, `${EXAM}_RW_M2_Q01`, dir);
    expect(new TextDecoder().decode(bytes!)).toBe("png-bytes");
  });
});

describe("parseRenderableText", () => {
  it("splits Text 1 / Text 2 and reads tables, including table answer choices", () => {
    const paired = parseRenderableText(
      "Text 1\nFirst.\n\nText 2\nSecond.\n\nHow do they differ?\nA) a\nB) b\nC) c\nD) d",
      {
        section: "RW",
        multipleChoice: true,
      }
    );
    expect([paired.passage_a, paired.passage_b, paired.question_text]).toEqual([
      "First.",
      "Second.",
      "How do they differ?",
    ]);
    const tables = parseRenderableText(
      "The table shows y.\n[Table: Columns: x | y.]\n1 | 17\n2 | 29\nA) [Table: Columns: x | y. Rows: 2 | 28; 4 | 86.]\nB) 2\nC) 3\nD) 4",
      { section: "MATH", multipleChoice: true }
    );
    expect(tables.table).toEqual({
      caption: null,
      header_row: ["x", "y"],
      rows: [
        ["1", "17"],
        ["2", "29"],
      ],
    });
    expect(tables.choices[0].table?.rows).toEqual([
      ["2", "28"],
      ["4", "86"],
    ]);
    expect(tables.question_text).toBe("The table shows y.");
  });
});

describe("isCorrectAnswer", () => {
  it("grades letters and grid-ins against the printed key", () => {
    expect(isCorrectAnswer("b", "B", false)).toBe(true);
    expect(isCorrectAnswer("C", "B", false)).toBe(false);
    expect(isCorrectAnswer(undefined, "B", false)).toBe(false);
    expect(isCorrectAnswer("27/2", "13.5", true)).toBe(true);
    expect(isCorrectAnswer("5,900", "5900", true)).toBe(true);
    expect(isCorrectAnswer(".6666", "2/3", true)).toBe(true);
    expect(isCorrectAnswer("0.6", "2/3", true)).toBe(false);
  });
});
