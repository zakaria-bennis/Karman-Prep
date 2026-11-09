// Karman-original fixture questions (rule 45: never imported from College Board material).
import type { StudentQuizQuestion, StudentQuizReview } from "../../../src/types/quiz";

type Seed = Partial<StudentQuizQuestion> & {
  id: string;
  question_text: string;
  choices?: string[];
  correct: string;
  explanation: string;
};

function make(seed: Seed): { q: StudentQuizQuestion; key: StudentQuizReview } {
  const { choices, correct, explanation, ...rest } = seed;
  const q: StudentQuizQuestion = {
    node_id: "fixture",
    question_type: "multiple_choice",
    difficulty: "intermediate",
    difficulty_level: 3,
    answer_format: choices ? "multiple_choice" : "numeric_entry",
    hint: null,
    image_url: null,
    image_alt: null,
    subject: "math",
    topic_cluster: "Linear equations",
    display_order: 0,
    passage_intro: null,
    passage: null,
    passage_a: null,
    passage_b: null,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    figure_svg: null,
    answer_choices: (choices ?? []).map((text, i) => ({
      id: `${seed.id}-${i}`,
      question_id: seed.id,
      letter: "ABCD"[i] as "A",
      choice_text: text,
      choice_table_data: null,
    })),
    ...rest,
  } as StudentQuizQuestion;
  return {
    q,
    key: {
      correct_answer: correct,
      numeric_tolerance: null,
      explanation_text: explanation,
      explanation_per_choice: null,
      desmos_strategy: null,
      isCorrect: false,
      studentAnswer: "",
    } as StudentQuizReview,
  };
}

const PASSAGE =
  "When the city of Tacoma replaced its sodium streetlights with LED fixtures, residents expected the night sky to brighten. Instead, an amateur astronomy club counting stars from a hilltop park recorded more visible stars in the two years after the change than in the two years before it. The club's members noted that the new fixtures aim their light downward, while the old ones scattered a large share of it sideways and up into the air above the city. Some members cautioned, however, that the clearer counts might also reflect drier weather during the later period, since haze and humidity can hide faint stars even when ground lighting stays the same.";

export const FIXTURE = [
  make({
    id: "rw",
    subject: "reading",
    topic_cluster: "Command of evidence",
    passage: PASSAGE,
    question_text:
      "Which choice best states the main caution that some club members raise about the star counts?",
    choices: [
      "The LED fixtures may be brighter than the sodium lights they replaced.",
      "A change in weather, not only the new lighting, may explain the higher counts.",
      "The hilltop park is too far from the city to measure its lighting.",
      "Counting stars by eye is less reliable than using a telescope.",
    ],
    correct: "B",
    explanation:
      "The last sentence says the clearer counts might also reflect drier weather, so lighting may not be the only cause.",
  }),
  make({
    id: "math",
    question_text: "If $3x + 7 = 22$, what is the value of $x$?",
    choices: ["$3$", "$5$", "$7$", "$15$"],
    correct: "B",
    explanation: "Subtract 7 from both sides to get $3x = 15$, then divide by 3.",
  }),
  make({
    id: "geo",
    topic_cluster: "Right triangles",
    difficulty_level: 5,
    question_text:
      "In right triangle $RST$, the right angle is at $T$, $RT = 12$, and $ST = 5$. What is the length of $RS$?",
    choices: ["$7$", "$13$", "$17$", "$60$"],
    correct: "B",
    explanation: "By the Pythagorean theorem, $RS^2 = 12^2 + 5^2 = 169$, so $RS = 13$.",
    figure_kind: "geometric",
    figure_geometry_data: {
      kind: "geometric",
      shapes: [
        {
          kind: "triangle",
          label: "RST",
          vertices_or_points: [
            { label: "R", x: 255, y: 170 },
            { label: "S", x: 425, y: 80 },
            { label: "T", x: 425, y: 170 },
          ],
        },
      ],
      angle_markings: [{ at_vertex: "T", right_angle: true }],
      length_markings: [
        { on_segment: ["R", "T"], value: "12" },
        { on_segment: ["S", "T"], value: "5" },
      ],
      notes: "Right triangle RST with the right angle at T.",
    } as StudentQuizQuestion["figure_geometry_data"],
  }),
  make({
    id: "table",
    topic_cluster: "Linear functions",
    question_text: "Which table shows a linear function with a slope of $2$?",
    choices: ["", "", "", ""],
    correct: "C",
    explanation: "In table C, each time $x$ grows by 1, $y$ grows by 2.",
  }),
  make({
    id: "numeric",
    topic_cluster: "Ratios",
    question_text:
      "A recipe uses 3 cups of flour for every 2 cups of milk. How many cups of flour are needed for 8 cups of milk?",
    correct: "12",
    explanation:
      "The ratio is 3 to 2, so 8 cups of milk need $8 \\times \\frac{3}{2} = 12$ cups of flour.",
  }),
];

// Table answer choices for the "table" question.
const tables = [
  [
    ["0", "1"],
    ["1", "2"],
    ["2", "4"],
  ],
  [
    ["0", "2"],
    ["1", "2"],
    ["2", "2"],
  ],
  [
    ["0", "1"],
    ["1", "3"],
    ["2", "5"],
  ],
  [
    ["0", "0"],
    ["1", "1"],
    ["2", "4"],
  ],
];
FIXTURE[3].q.answer_choices = FIXTURE[3].q.answer_choices.map((c, i) => ({
  ...c,
  choice_text: "",
  choice_table_data: { header_row: ["$x$", "$y$"], rows: tables[i] },
}));

/** A longer set of simple items for navigator and progress tests. */
export function longSet(length: number) {
  return Array.from({ length }, (_, i) =>
    make({
      id: `n${i + 1}`,
      question_text: `What is $${i + 2} \\times 3$?`,
      choices: [`$${(i + 2) * 3}$`, `$${(i + 2) * 3 + 1}$`, `$${(i + 2) * 3 - 1}$`, `$${i + 2}$`],
      correct: "A",
      explanation: `Multiply ${i + 2} by 3.`,
    })
  );
}
