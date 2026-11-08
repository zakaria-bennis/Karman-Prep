/**
 * Ten Karman originals, copied from src/data/diagnostic-questions.ts (the
 * "All questions are original" set) on 2026-10-31, chosen so no stem or
 * passage carries a dash. Never the imported bank rows in the end screen's
 * bank.js. Math stems use KaTeX $...$ as the app renders them.
 */
export interface DemoQuestion {
  id: string;
  section: "Reading and Writing" | "Math";
  skill: string;
  difficulty: 1 | 2 | 3;
  passage?: string;
  text: string;
  options: string[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

export const QUESTIONS: DemoQuestion[] = [
  {
    id: "conv-1",
    section: "Reading and Writing",
    skill: "Subject-verb agreement",
    difficulty: 2,
    passage:
      "Each of the proposals submitted by the regional development committees ______ subject to formal review by the chief engineer before any construction can begin.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: ["A) is", "B) are", "C) have been", "D) were"],
    correct: "A",
    explanation:
      'The subject is "Each," which is grammatically singular and takes a singular verb. The plural nouns "proposals" and "committees" sit inside prepositional phrases that modify "each" but do not control the verb.',
  },
  {
    id: "alg-1",
    section: "Math",
    skill: "Linear equations in one variable",
    difficulty: 1,
    text: "If $3x + 5 = 26$, what is the value of $x$?",
    options: ["A) $5$", "B) $6$", "C) $7$", "D) $8$"],
    correct: "C",
    explanation: "$3x = 21$, so $x = 7$.",
  },
  {
    id: "expr-4",
    section: "Reading and Writing",
    skill: "Rhetorical Synthesis",
    difficulty: 3,
    passage:
      "While researching for a humanities essay, a student has taken the following notes:\n\nThe play received glowing reviews from major critics.\nTicket sales were nonetheless disappointing throughout the run.\nThe producers chose not to extend the play.\n\nThe student wants to combine these ideas into a single sentence emphasizing the contrast between critical reception and commercial performance.",
    text: "Which choice most effectively uses the relevant information from the notes to accomplish this goal?",
    options: [
      "A) The play received glowing reviews from major critics, and ticket sales were disappointing.",
      "B) Despite glowing reviews from major critics, the play saw disappointing ticket sales and was not extended.",
      "C) The play, which received glowing reviews from major critics, had disappointing ticket sales.",
      "D) Ticket sales were disappointing for the play because it received glowing reviews from major critics.",
    ],
    correct: "B",
    explanation:
      '(B) opens with "Despite" to make the contrast explicit. (A) just conjoins the ideas without contrast; (C) buries it in a non-restrictive clause; (D) creates a false causation.',
  },
  {
    id: "alg-3",
    section: "Math",
    skill: "Systems of two linear equations in two variables",
    difficulty: 2,
    text: "If $2x + y = 11$ and $x - y = 1$, what is the value of $x$?",
    options: ["A) $3$", "B) $4$", "C) $5$", "D) $6$"],
    correct: "B",
    explanation: "Adding the two equations gives $3x = 12$, so $x = 4$.",
  },
  {
    id: "conv-2",
    section: "Reading and Writing",
    skill: "Pronoun-antecedent agreement",
    difficulty: 2,
    passage:
      "Although the orchestra had been together for less than a year, ______ performance of the new symphony on opening night drew sustained applause from every corner of the hall.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: ["A) their", "B) it's", "C) its", "D) there"],
    correct: "C",
    explanation:
      '"The orchestra" is a collective noun treated as singular in standard American English, so the possessive pronoun must be "its."',
  },
  {
    id: "data-1",
    section: "Math",
    skill: "Ratios rates proportional relationships and units",
    difficulty: 1,
    text: "A recipe uses $3$ cups of flour for every $2$ cups of sugar. How many cups of sugar are needed for $12$ cups of flour?",
    options: ["A) $6$", "B) $8$", "C) $9$", "D) $18$"],
    correct: "B",
    explanation:
      "Set up the proportion $\\dfrac{3}{2} = \\dfrac{12}{x}$. Cross-multiplying gives $3x = 24$, so $x = 8$.",
  },
  {
    id: "geo-1",
    section: "Math",
    skill: "Right triangles and trigonometry",
    difficulty: 1,
    text: "In a right triangle, the legs measure $6$ and $8$. What is the length of the hypotenuse?",
    options: ["A) $10$", "B) $12$", "C) $14$", "D) $\\sqrt{48}$"],
    correct: "A",
    explanation: "By the Pythagorean theorem, $\\sqrt{6^2 + 8^2} = \\sqrt{100} = 10$.",
  },
  {
    id: "expr-2",
    section: "Reading and Writing",
    skill: "Cross-Text Connections",
    difficulty: 3,
    passage:
      "Text 1\nUnstructured outdoor play is essential to children's emotional development. Without regular opportunities to invent rules, settle disputes, and take small physical risks on their own, children miss the formative experiences that shape resilience and self-regulation.\n\nText 2\nRecent surveys document that today's children spend less time in unstructured outdoor play than at any point in the past century. So far, however, no measurable population-level decline in emotional well-being among adolescents has been observed.",
    text: "Based on the texts, how would the author of Text 2 most likely respond to the claim made in Text 1?",
    options: [
      "A) By agreeing with the claim and supplying additional supporting evidence.",
      "B) By agreeing with the principle but questioning whether current data confirm the predicted effect.",
      "C) By rejecting the claim outright as unsupported by any evidence.",
      "D) By arguing that emotional development has nothing to do with outdoor play.",
    ],
    correct: "B",
    explanation:
      "Text 2 doesn't dispute that outdoor play is important; it observes that the predicted decline in well-being hasn't shown up in the data. That's principled agreement plus empirical caution, so (B).",
  },
  {
    id: "alg-4",
    section: "Math",
    skill: "Linear functions",
    difficulty: 2,
    text: "The function $f$ is defined by $f(x) = 2x + 7$. What is the value of $f(-3)$?",
    options: ["A) $1$", "B) $-1$", "C) $4$", "D) $13$"],
    correct: "A",
    explanation: "$f(-3) = 2(-3) + 7 = -6 + 7 = 1$.",
  },
  {
    id: "conv-4",
    section: "Reading and Writing",
    skill: "Colons and dashes introducing explanations or lists",
    difficulty: 3,
    passage:
      "The exhibition celebrates a single overlooked influence on nineteenth-century American landscape ______ the bold compositional asymmetries of Japanese woodblock prints.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: ["A) painting,", "B) painting;", "C) painting:", "D) painting"],
    correct: "C",
    explanation:
      'What follows the blank is a noun phrase that elaborates on "a single overlooked influence." A colon is the conventional way to introduce an elaboration after a complete independent clause.',
  },
];

/** Maya's Daily 10 today: 7 of 10, missed 2, 6 and 7, then three in a row. Tokens: 10 a right answer, 15 when hard. */
export const DAILY10_RESULT = {
  studentId: "maya",
  answers: [true, false, true, true, true, false, false, true, true, true],
  hard: [false, false, true, false, false, false, false, true, false, true],
};
export const DAILY10_TOKENS = DAILY10_RESULT.answers.reduce(
  (a, ok, i) => a + (ok ? (DAILY10_RESULT.hard[i] ? 15 : 10) : 0),
  0
);

console.assert(QUESTIONS.length === 10, "a Daily 10 is ten questions");
console.assert(
  QUESTIONS.every((q) => !/[\u2014\u2013]/.test(q.text + (q.passage ?? "") + q.options.join(""))),
  "no dashes in the demo questions"
);
console.assert(DAILY10_RESULT.answers.filter(Boolean).length === 7, "7 of 10");
console.assert(DAILY10_TOKENS === 85, `85 tokens today, got ${DAILY10_TOKENS}`);
