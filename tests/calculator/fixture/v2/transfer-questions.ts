// Synthetic transfer questions for the v2 browser specs (14). Original text only; `?questions=transfer`
// swaps the diagnostic questions and the daily question (decision: practice and catalog keep
// their existing synthetic content).
import type { DiagnosticQuestion } from "../../../../src/components/diagnostic/_hooks/useDiagnosticState";
import type { StudentQuizQuestion } from "../../../../src/types/quiz";

export const BLOCK_SYSTEM = "\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}";

/** Twelve original sentences (lower-case "lines" only), so phones scroll past the passage. */
export const TRANSFER_PASSAGE = [
  "A surveyor walked the north edge of a small orchard at dawn.",
  "She marked each fence post with a strip of yellow cloth.",
  "The posts stood in two straight lines that ran toward the river.",
  "A second team counted the trees between the posts.",
  "They wrote their counts on cards and pinned the cards to a board.",
  "By noon the board held forty cards in four neat rows.",
  "One card was smudged, so the team counted that row again.",
  "The new count matched the old one exactly.",
  "In the afternoon the surveyor checked the slope of the ground.",
  "Rain the week before had left the lower field soft.",
  "The team agreed to finish the map once the field dried.",
  "Before leaving, they photographed the board for their records.",
].join(" ");

export const TRANSFER_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "t1",
    domain: "algebra",
    difficulty: 1,
    conceptId: "transfer",
    passage: TRANSFER_PASSAGE,
    text: `Lines $y=2x+3$ and $y=2x+3$ bound the region $y>2x+1$, where $x$ is $5$ and $\\angle B$ is marked. $$${BLOCK_SYSTEM}$$`,
    options: ["A) $3p+4=19$", "B) $2x$", "C) $x$", "D) $\\angle B$"],
    correct: "A",
    explanation: "Synthetic transfer fixture: $y=9$.",
  },
  {
    id: "t2",
    domain: "algebra",
    difficulty: 1,
    conceptId: "transfer",
    text: "The function $f$ is defined by $f(x)=x^{2}-3$. Let $g(x)=f(x)+3$.",
    options: ["A) $x^{2}$", "B) $x^{2}+3$", "C) $2x$", "D) $0$"],
    correct: "A",
    explanation: "Synthetic transfer fixture.",
  },
  {
    id: "t3",
    domain: "info_ideas",
    difficulty: 1,
    conceptId: "transfer",
    text: "In the passage, $y=2x+3$ is quoted.",
    options: ["A) $1$", "B) $2$", "C) $3$", "D) $4$"],
    correct: "A",
    explanation: "Synthetic transfer fixture.",
  },
];

/** The t1 stem items that get a control, as latex in DOM order. */
export const T1_STEM_CONTROLS: readonly string[] = ["y=2x+3", "y=2x+3", "y>2x+1", BLOCK_SYSTEM];
/** The t1 stem math that gets none. */
export const T1_STEM_DENIED: readonly string[] = ["x", "5", "\\angle B"];

const DAILY_ID = "00000000-0000-4000-8000-0000000000d1";
export const TRANSFER_DAILY_QUESTION = {
  id: DAILY_ID,
  subject: "math",
  topic_cluster: "Algebra",
  difficulty_level: 5,
  answer_format: "multiple_choice",
  question_text: "Which line is parallel to $y=2x+3$?",
  passage_intro: null,
  passage: null,
  passage_a: null,
  passage_b: null,
  figure_kind: null,
  figure_table_data: null,
  figure_chart_data: null,
  figure_geometry_data: null,
  image_url: null,
  image_alt: null,
  answer_choices: [
    ["A", "$y=2x-1$"],
    ["B", "$y=-2x+3$"],
    ["C", "$x=2$"],
    ["D", "$2$"],
  ].map(([letter, choice_text]) => ({
    id: `daily-choice-${letter}`,
    question_id: DAILY_ID,
    letter,
    choice_text,
    choice_table_data: null,
  })),
} as StudentQuizQuestion;

/** 07 Tasks 17 and 18 (`?questions=transfer-tables`, daily flow): D-40's table as a question
 * table, a coordinate pair and a function coordinate. Original text and data only. */
export const TABLE_PAIR = "(2,5)";
export const TABLE_COORDINATE = "f(3)=7";
const TABLES_DAILY_ID = "00000000-0000-4000-8000-0000000000d2";
export const TRANSFER_TABLES_DAILY_QUESTION = {
  ...TRANSFER_DAILY_QUESTION,
  id: TABLES_DAILY_ID,
  question_text: `The table shows a town's population. The line passes through $${TABLE_PAIR}$, and for the function $f$, $${TABLE_COORDINATE}$. Which value is largest?`,
  figure_kind: "table",
  figure_table_data: {
    header_row: ["Year", "Population"],
    rows: [
      ["1990", "30,000"],
      ["2000", "36,000"],
      ["2010", "42,000"],
      ["2020", "48,000"],
    ],
  },
  answer_choices: TRANSFER_DAILY_QUESTION.answer_choices.map((c) => ({
    ...c,
    id: `tables-${c.id}`,
    question_id: TABLES_DAILY_ID,
  })),
} as StudentQuizQuestion;
