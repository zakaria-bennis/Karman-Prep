// ============================================================
// Strata Diagnostic — 35-question Bluebook-shaped sample.
//
// Mirrors the Digital SAT's 8-domain coverage and authentic
// question register:
//   Math (20q):
//     · Algebra              · 5
//     · Advanced Math        · 5
//     · Problem-Solving/Data · 5
//     · Geometry & Trig      · 5
//   Reading & Writing (15q):
//     · Information & Ideas         · 3
//     · Craft & Structure           · 3
//     · Expression of Ideas         · 3
//     · Standard English Conventions· 6
//
// Conventions:
//   · Math expressions use KaTeX `$…$` (inline) and `$$…$$`
//     (block). Rendered through src/components/learn/MathText.
//   · Reading questions can carry a `passage` and an italic
//     `passageIntro` (the "The following text is adapted from…"
//     attribution line, in Bluebook style).
//   · Question stems use the SAT's canonical phrasing — see
//     SAT_PHRASES below for the exact stems we mirror.
//
// All questions are original. Passages are written in the
// register and topic style of the Digital SAT but not lifted
// from any released form.
//
// SAT_PHRASES (for stem reference):
//   · "Which choice best states the main idea of the text?"
//   · "Which choice most logically completes the text?"
//   · "As used in the text, what does the word X most nearly mean?"
//   · "Which choice best describes the main purpose of the text?"
//   · "Which choice best describes the overall structure of the text?"
//   · "Which finding, if true, would most directly support / weaken …?"
//   · "Based on the texts, how would [author 2] most likely respond …?"
//   · "Which choice completes the text with the most logical and
//      precise word or phrase?"
//   · "Which choice completes the text so that it conforms to the
//      conventions of Standard English?"
//   · "The student wants to … Which choice most effectively uses the
//      relevant information from the notes to accomplish this goal?"
// ============================================================

import { DOMAIN_SECTION, type SATDomain } from "@/types";

export interface DiagnosticQuestion {
  id: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3;
  /** Slug for the topic this question targets. Used for surfacing
   *  weak topics on the progress page. Free-form string. */
  conceptId: string;
  /** Italic source-attribution line shown above the passage —
   *  "The following text is adapted from …" Bluebook style.
   *  Only relevant when `passage` is present. */
  passageIntro?: string;
  /** Long-form passage rendered in the left column when present.
   *  Use \n\n for paragraph breaks (Markdown-style). When omitted,
   *  the question renders single-column. */
  passage?: string;
  /** Question prompt. Math may include `$…$` or `$$…$$` LaTeX. */
  text: string;
  /** Each choice pre-prefixed "A) ", "B) " etc. May contain LaTeX. */
  options: string[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

// Authored question pool — Math first internally for ease of
// editing. The exported DIAGNOSTIC_QUESTIONS below sorts so that
// Reading & Writing comes FIRST in the test order, then Math —
// mirroring the Digital SAT's section order.
const QUESTION_POOL: DiagnosticQuestion[] = [
  // ─── ALGEBRA (5) ────────────────────────────────────────────
  {
    id: "alg-1", domain: "algebra", difficulty: 1, conceptId: "linear-equations",
    text: "If $3x + 5 = 26$, what is the value of $x$?",
    options: ["A) $5$", "B) $6$", "C) $7$", "D) $8$"],
    correct: "C",
    explanation: "$3x = 21$, so $x = 7$.",
  },
  {
    id: "alg-2", domain: "algebra", difficulty: 1, conceptId: "linear-equations",
    text: "Which of the following expressions is equivalent to $4(x - 3) + 2x$?",
    options: ["A) $6x - 12$", "B) $6x - 3$", "C) $4x - 12$", "D) $2x - 12$"],
    correct: "A",
    explanation: "$4(x - 3) = 4x - 12$. Adding $2x$ gives $6x - 12$.",
  },
  {
    id: "alg-3", domain: "algebra", difficulty: 2, conceptId: "systems-of-equations",
    text: "If $2x + y = 11$ and $x - y = 1$, what is the value of $x$?",
    options: ["A) $3$", "B) $4$", "C) $5$", "D) $6$"],
    correct: "B",
    explanation: "Adding the two equations gives $3x = 12$, so $x = 4$.",
  },
  {
    id: "alg-4", domain: "algebra", difficulty: 2, conceptId: "linear-functions",
    text: "The function $f$ is defined by $f(x) = 2x + 7$. What is the value of $f(-3)$?",
    options: ["A) $1$", "B) $-1$", "C) $4$", "D) $13$"],
    correct: "A",
    explanation: "$f(-3) = 2(-3) + 7 = -6 + 7 = 1$.",
  },
  {
    id: "alg-5", domain: "algebra", difficulty: 3, conceptId: "linear-inequalities",
    text: "What is the smallest integer value of $x$ for which $5x - 8 > 27$?",
    options: ["A) $6$", "B) $7$", "C) $8$", "D) $9$"],
    correct: "C",
    explanation: "$5x > 35$, so $x > 7$. The smallest integer greater than $7$ is $8$.",
  },

  // ─── ADVANCED MATH (5) ──────────────────────────────────────
  {
    id: "adv-1", domain: "advanced_math", difficulty: 1, conceptId: "quadratics",
    text: "What are the solutions to the equation $x^2 - 7x + 12 = 0$?",
    options: ["A) $2$ and $6$", "B) $3$ and $4$", "C) $-3$ and $-4$", "D) $1$ and $12$"],
    correct: "B",
    explanation: "Factor: $(x - 3)(x - 4) = 0$, so $x = 3$ or $x = 4$.",
  },
  {
    id: "adv-2", domain: "advanced_math", difficulty: 2, conceptId: "polynomials",
    text: "If $p(x) = x^3 - 2x^2 + x - 4$, what is the value of $p(2)$?",
    options: ["A) $-2$", "B) $0$", "C) $2$", "D) $4$"],
    correct: "A",
    explanation: "$p(2) = 8 - 8 + 2 - 4 = -2$.",
  },
  {
    id: "adv-3", domain: "advanced_math", difficulty: 2, conceptId: "exponential-functions",
    text: "A bacterial culture doubles in size every $4$ hours. If the culture starts at $200$ cells, how many cells will be present after $12$ hours?",
    options: ["A) $800$", "B) $1{,}200$", "C) $1{,}600$", "D) $2{,}400$"],
    correct: "C",
    explanation: "$12$ hours is $3$ doublings, so $200 \\cdot 2^3 = 200 \\cdot 8 = 1{,}600$.",
  },
  {
    id: "adv-4", domain: "advanced_math", difficulty: 3, conceptId: "rational-expressions",
    text: "Which of the following expressions is equivalent to $\\dfrac{x^2 - 16}{x - 4}$ for $x \\neq 4$?",
    options: ["A) $x - 4$", "B) $x + 4$", "C) $x^2 - 4$", "D) $x + 16$"],
    correct: "B",
    explanation: "$x^2 - 16 = (x - 4)(x + 4)$. Dividing by $(x - 4)$ leaves $x + 4$.",
  },
  {
    id: "adv-5", domain: "advanced_math", difficulty: 3, conceptId: "quadratic-vertex",
    text: "The function $f$ is defined by $f(x) = (x - 5)^2 + 3$. The minimum value of $f$ occurs at $x =\\,$?",
    options: ["A) $-5$", "B) $-3$", "C) $3$", "D) $5$"],
    correct: "D",
    explanation: "A function in vertex form $(x - h)^2 + k$ has its vertex at $x = h$. Here $h = 5$.",
  },

  // ─── PROBLEM-SOLVING & DATA ANALYSIS (5) ────────────────────
  {
    id: "data-1", domain: "data_analysis", difficulty: 1, conceptId: "ratios-rates",
    text: "A recipe uses $3$ cups of flour for every $2$ cups of sugar. How many cups of sugar are needed for $12$ cups of flour?",
    options: ["A) $6$", "B) $8$", "C) $9$", "D) $18$"],
    correct: "B",
    explanation: "Set up the proportion $\\dfrac{3}{2} = \\dfrac{12}{x}$. Cross-multiplying gives $3x = 24$, so $x = 8$.",
  },
  {
    id: "data-2", domain: "data_analysis", difficulty: 1, conceptId: "percentages",
    text: "A jacket originally priced at $\\$80$ is on sale for $25\\%$ off. What is the sale price?",
    options: ["A) $\\$20$", "B) $\\$55$", "C) $\\$60$", "D) $\\$75$"],
    correct: "C",
    explanation: "$25\\%$ of $\\$80$ is $\\$20$. Sale price $= 80 - 20 = 60$.",
  },
  {
    id: "data-3", domain: "data_analysis", difficulty: 2, conceptId: "statistics-mean-median",
    text: "Five quiz scores are $12$, $14$, $14$, $18$, and $22$. What is the difference between the mean and the median of these scores?",
    options: ["A) $0$", "B) $2$", "C) $3$", "D) $4$"],
    correct: "B",
    explanation: "Mean $= \\dfrac{12+14+14+18+22}{5} = \\dfrac{80}{5} = 16$. Median $= 14$. Difference $= 2$.",
  },
  {
    id: "data-4", domain: "data_analysis", difficulty: 2, conceptId: "probability",
    text: "A spinner is divided into $8$ equal sections numbered $1$ through $8$. What is the probability of landing on a number greater than $5$?",
    options: ["A) $\\dfrac{1}{4}$", "B) $\\dfrac{3}{8}$", "C) $\\dfrac{1}{2}$", "D) $\\dfrac{5}{8}$"],
    correct: "B",
    explanation: "Numbers greater than $5$ are $\\{6, 7, 8\\}$ — $3$ out of $8$ equally likely sections.",
  },
  {
    id: "data-5", domain: "data_analysis", difficulty: 3, conceptId: "data-interpretation",
    text: "A study reports a correlation coefficient of $r = 0.84$ between hours studied per week and final exam score. Which of the following statements is best supported by this finding?",
    options: [
      "A) Studying causes higher exam scores.",
      "B) There is a strong negative association between studying and exam score.",
      "C) There is a strong positive association between studying and exam score.",
      "D) Studying has no relationship with exam score.",
    ],
    correct: "C",
    explanation: "An $r$ value near $+1$ indicates a strong positive linear association. Correlation does not establish causation, so (A) overstates the result.",
  },

  // ─── GEOMETRY & TRIG (5) ────────────────────────────────────
  {
    id: "geo-1", domain: "geometry", difficulty: 1, conceptId: "triangles",
    text: "In a right triangle, the legs measure $6$ and $8$. What is the length of the hypotenuse?",
    options: ["A) $10$", "B) $12$", "C) $14$", "D) $\\sqrt{48}$"],
    correct: "A",
    explanation: "By the Pythagorean theorem, $\\sqrt{6^2 + 8^2} = \\sqrt{100} = 10$.",
  },
  {
    id: "geo-2", domain: "geometry", difficulty: 1, conceptId: "circles",
    text: "A circle has radius $5$. What is the area of the circle, in terms of $\\pi$?",
    options: ["A) $10\\pi$", "B) $15\\pi$", "C) $20\\pi$", "D) $25\\pi$"],
    correct: "D",
    explanation: "Area $= \\pi r^2 = \\pi (5)^2 = 25\\pi$.",
  },
  {
    id: "geo-3", domain: "geometry", difficulty: 2, conceptId: "coordinate-geometry",
    text: "What is the distance between the points $(2, -1)$ and $(5, 3)$ in the $xy$-plane?",
    options: ["A) $3$", "B) $4$", "C) $5$", "D) $7$"],
    correct: "C",
    explanation: "Distance $= \\sqrt{(5 - 2)^2 + (3 - (-1))^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$.",
  },
  {
    id: "geo-4", domain: "geometry", difficulty: 2, conceptId: "volume",
    text: "A right circular cylinder has radius $3$ and height $10$. What is the volume of the cylinder, in terms of $\\pi$?",
    options: ["A) $30\\pi$", "B) $60\\pi$", "C) $90\\pi$", "D) $100\\pi$"],
    correct: "C",
    explanation: "Volume $= \\pi r^2 h = \\pi (3)^2 (10) = 9\\pi \\cdot 10 = 90\\pi$.",
  },
  {
    id: "geo-5", domain: "geometry", difficulty: 3, conceptId: "trigonometry",
    text: "In a right triangle, $\\sin(\\theta) = \\dfrac{5}{13}$. What is the value of $\\cos(\\theta)$?",
    options: ["A) $\\dfrac{5}{12}$", "B) $\\dfrac{12}{13}$", "C) $\\dfrac{13}{12}$", "D) $\\dfrac{12}{5}$"],
    correct: "B",
    explanation: "If $\\sin(\\theta) = \\dfrac{5}{13}$, then the opposite side is $5$ and the hypotenuse is $13$. By the Pythagorean theorem, the adjacent side is $\\sqrt{13^2 - 5^2} = \\sqrt{144} = 12$, so $\\cos(\\theta) = \\dfrac{12}{13}$.",
  },

  // ═══════════════════════════════════════════════════════════
  // READING & WRITING (15)
  // ═══════════════════════════════════════════════════════════

  // ─── INFORMATION & IDEAS (3) ────────────────────────────────
  {
    id: "info-2",
    domain: "info_ideas",
    difficulty: 2,
    conceptId: "inference",
    passageIntro:
      "The following text is adapted from Edith Wharton's 1905 novel The House of Mirth. Lily Bart, a young society woman in financial trouble, has just returned to her aunt's house after a weekend away.",
    passage:
      "She paused at the foot of the stairs, listening for the soft, familiar tread overhead. The house was very still — too still, she thought, for an hour at which her aunt was usually astir. The shutters of the upper landing had not been opened, and a curious greyness clung about the polished banister. Lily set down her travelling-bag with a deliberation that surprised her, as though by moving slowly she might delay the news she had begun, without admitting it, to expect.",
    text: "Which choice best describes what the passage suggests about Lily?",
    options: [
      "A) She believes her aunt is still away on a trip.",
      "B) She suspects something is wrong but is reluctant to confirm it.",
      "C) She has returned home expecting to be greeted with warmth.",
      "D) She is unconcerned by the unusual stillness of the house.",
    ],
    correct: "B",
    explanation:
      "Lily notes the stillness is unusual, slows down deliberately, and recognizes she has 'begun, without admitting it, to expect' bad news. That's apprehension paired with avoidance — choice (B). (D) directly contradicts the text; (A) and (C) misread her mood.",
  },
  {
    id: "info-3",
    domain: "info_ideas",
    difficulty: 2,
    conceptId: "command-of-evidence",
    passage:
      "A historian argues that public-health conditions in 19th-century industrial cities improved rapidly only after municipalities built modern water and sewage systems — that earlier reforms, such as bathhouses and street-cleaning, had little measurable effect.",
    text: "Which finding, if true, would most directly support the historian's argument?",
    options: [
      "A) Cholera outbreaks in cities continued at similar rates throughout the century, regardless of any infrastructure changes.",
      "B) Cities that constructed sewer networks saw mortality from waterborne diseases drop sharply within five years of the systems' completion.",
      "C) Rural districts had lower infant mortality than urban districts during the same period.",
      "D) Public bathhouses became increasingly popular in many industrial cities by the 1880s.",
    ],
    correct: "B",
    explanation:
      "The argument links modern infrastructure to rapid improvement. (B) ties construction directly to a sharp drop in the relevant disease, supporting the claim. (A) contradicts the argument; (C) and (D) are tangential.",
  },
  {
    id: "info-4",
    domain: "info_ideas",
    difficulty: 3,
    conceptId: "quantitative-evidence",
    passage:
      "A study of 2,400 high school students reported that those sleeping at least eight hours per night averaged 1,230 on a practice SAT, while those sleeping six hours or fewer averaged 1,080 — a 150-point gap.",
    text: "Which conclusion does the data most directly support?",
    options: [
      "A) Sleeping at least eight hours causes a 150-point increase in SAT performance.",
      "B) On average, students who slept at least eight hours outperformed those who slept six hours or fewer in the study.",
      "C) Most high-scoring students sleep more than eight hours every night.",
      "D) Students cannot achieve high SAT scores without eight hours of sleep.",
    ],
    correct: "B",
    explanation:
      "The reported data is a difference in averages between two groups. Only (B) restates that without overstating it. (A) confuses correlation with causation; (C) and (D) extend beyond what was measured.",
  },

  // ─── CRAFT & STRUCTURE (3) ──────────────────────────────────
  {
    id: "craft-2",
    domain: "craft_structure",
    difficulty: 2,
    conceptId: "purpose",
    passageIntro:
      "The following text is adapted from a 2018 essay by literary critic Vivian Gornick.",
    passage:
      "Critics often dismiss low-cost paperback editions as ephemeral things — but for many readers in the 1950s, those very paperbacks were the door into literature. They circulated in train stations and lunch counters and the back seats of borrowed cars; they were marked up, lent out, and lost. Whatever the critics imagined, the paperbacks were doing the most serious work.",
    text: "Which choice best describes the main purpose of the text?",
    options: [
      "A) To argue that literary critics in the 1950s undervalued an important means of access to reading.",
      "B) To explain why low-cost paperback editions outsold hardcovers throughout the 1950s.",
      "C) To trace the design history of mass-market paperback publishing.",
      "D) To recommend that contemporary readers seek out vintage paperback editions.",
    ],
    correct: "A",
    explanation:
      "The author sets up critics' dismissal, then flips to defend the paperbacks as having done \"the most serious work.\" That's an argument about underappreciation — (A). The other choices describe topics the text doesn't address.",
  },
  {
    id: "craft-3",
    domain: "craft_structure",
    difficulty: 2,
    conceptId: "text-structure",
    passage:
      "The essay opens with a personal anecdote about the author's grandfather's weekly checkers game at the corner pharmacy. From this scene the author develops a broader claim — that small communal rituals are the foundation of civic trust — and supports it with statistics on declining membership in local clubs and associations over the past four decades.",
    text: "Which choice best describes the overall structure of the text?",
    options: [
      "A) An anecdote, followed by a counterargument the author then concedes.",
      "B) An anecdote, followed by a generalization the author supports with evidence.",
      "C) A definition, followed by an example and then a refutation.",
      "D) A description of a problem, followed by its cause and a recommendation.",
    ],
    correct: "B",
    explanation:
      "The text moves from anecdote → general claim → supporting statistics — exactly the pattern in (B). (A), (C), and (D) describe structures the text doesn't follow.",
  },
  {
    id: "craft-4",
    domain: "craft_structure",
    difficulty: 3,
    conceptId: "cross-text-connections",
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
      "Text 2 doesn't dispute that outdoor play is important; it observes that the predicted decline in well-being hasn't shown up in the data. That's principled agreement plus empirical caution — (B).",
  },

  // ─── EXPRESSION OF IDEAS (3) ────────────────────────────────
  {
    id: "expr-2",
    domain: "expression_ideas",
    difficulty: 2,
    conceptId: "rhetorical-synthesis",
    passage:
      "While researching for an article in the school newspaper, a student has taken the following notes:\n\n· The school's robotics team built a self-balancing robot.\n· The robot uses a single gyroscope sensor to maintain balance.\n· The team is composed of seven freshmen and sophomores.\n· The robot won first place at the regional engineering fair.",
    text: "The student wants to emphasize the team's achievement. Which choice most effectively uses the relevant information from the notes to accomplish this goal?",
    options: [
      "A) The robotics team has seven members, and their robot uses a gyroscope.",
      "B) Built by seven freshmen and sophomores using a single gyroscope sensor, the team's self-balancing robot won first place at the regional engineering fair.",
      "C) The robot, balanced by a gyroscope, was built by freshmen and sophomores.",
      "D) The regional engineering fair was won this year by a robotics team.",
    ],
    correct: "B",
    explanation:
      "(B) integrates all four notes and lands on the achievement. (A) and (C) drop the win; (D) drops everything else.",
  },
  {
    id: "expr-3",
    domain: "expression_ideas",
    difficulty: 2,
    conceptId: "precision",
    passage:
      "Meteorologists distinguish between several kinds of brief temperature anomalies. The most familiar — and the one residents of the Midwest most often experience in late spring — is a sudden, short return of cold weather after a warm spell, sometimes called a ______.",
    text: "Which choice completes the text with the most logical and precise word or phrase?",
    options: [
      "A) chill",
      "B) cold snap",
      "C) winter",
      "D) freeze",
    ],
    correct: "B",
    explanation:
      "\"Cold snap\" specifically denotes a sudden, brief drop in temperature, typically out of season. The other choices are too vague (\"chill\") or refer to longer/different conditions.",
  },
  {
    id: "expr-4",
    domain: "expression_ideas",
    difficulty: 3,
    conceptId: "rhetorical-synthesis",
    passage:
      "While researching for a humanities essay, a student has taken the following notes:\n\n· The play received glowing reviews from major critics.\n· Ticket sales were nonetheless disappointing throughout the run.\n· The producers chose not to extend the play.\n\nThe student wants to combine these ideas into a single sentence emphasizing the contrast between critical reception and commercial performance.",
    text: "Which choice most effectively uses the relevant information from the notes to accomplish this goal?",
    options: [
      "A) The play received glowing reviews from major critics, and ticket sales were disappointing.",
      "B) Despite glowing reviews from major critics, the play saw disappointing ticket sales and was not extended.",
      "C) The play, which received glowing reviews from major critics, had disappointing ticket sales.",
      "D) Ticket sales were disappointing for the play because it received glowing reviews from major critics.",
    ],
    correct: "B",
    explanation:
      "(B) opens with \"Despite\" to make the contrast explicit. (A) just conjoins the ideas without contrast; (C) buries it in a non-restrictive clause; (D) creates a false causation.",
  },

  // ─── STANDARD ENGLISH CONVENTIONS (6) ───────────────────────
  {
    id: "conv-1",
    domain: "conventions",
    difficulty: 2,
    conceptId: "subject-verb-agreement",
    passage:
      "Each of the proposals submitted by the regional development committees ______ subject to formal review by the chief engineer before any construction can begin.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "A) is",
      "B) are",
      "C) have been",
      "D) were",
    ],
    correct: "A",
    explanation:
      "The subject is \"Each,\" which is grammatically singular and takes a singular verb. The plural nouns \"proposals\" and \"committees\" sit inside prepositional phrases that modify \"each\" but do not control the verb.",
  },
  {
    id: "conv-2",
    domain: "conventions",
    difficulty: 2,
    conceptId: "pronoun-antecedent-agreement",
    passage:
      "Although the orchestra had been together for less than a year, ______ performance of the new symphony on opening night drew sustained applause from every corner of the hall.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "A) their",
      "B) it's",
      "C) its",
      "D) there",
    ],
    correct: "C",
    explanation:
      "\"The orchestra\" is a collective noun treated as singular in standard American English, so the possessive pronoun must be \"its.\" \"Their\" treats the orchestra as plural; \"it's\" is the contraction of \"it is\"; \"there\" is not a possessive form.",
  },
  {
    id: "conv-3",
    domain: "conventions",
    difficulty: 3,
    conceptId: "verb-tense-consistency",
    passage:
      "By the time the lighthouse keeper finally spotted the small fishing vessel through the heavy fog, the boat ______ for nearly an hour, its hull battered repeatedly against the rocks at the base of the cliff.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "A) drifts",
      "B) drifted",
      "C) had been drifting",
      "D) has been drifting",
    ],
    correct: "C",
    explanation:
      "The drifting began before — and was still going on at — the moment the keeper spotted the boat, so the verb requires the past perfect progressive (\"had been drifting\"). Simple past (B) collapses the time relationship; the present forms in (A) and (D) clash with the past-tense narrative frame.",
  },
  {
    id: "conv-4",
    domain: "conventions",
    difficulty: 3,
    conceptId: "punctuation",
    passage:
      "The exhibition celebrates a single overlooked influence on nineteenth-century American landscape ______ the bold compositional asymmetries of Japanese woodblock prints.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "A) painting,",
      "B) painting;",
      "C) painting:",
      "D) painting",
    ],
    correct: "C",
    explanation:
      "What follows the blank is a noun phrase that elaborates on \"a single overlooked influence.\" A colon (C) is the conventional way to introduce an elaboration after a complete independent clause. A semicolon (B) requires an independent clause on each side; a comma (A) under-punctuates the boundary; removing punctuation (D) creates a run-on.",
  },
  {
    id: "conv-5",
    domain: "conventions",
    difficulty: 2,
    conceptId: "sentence-boundaries",
    passage:
      "The earthquake struck the coastal village just before ______ residents were jolted awake by what one later described as \"the sound of the entire hillside groaning loose.\"",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "A) dawn,",
      "B) dawn",
      "C) dawn;",
      "D) dawn, and,",
    ],
    correct: "C",
    explanation:
      "The two halves of the sentence are independent clauses, each with its own subject and verb. A semicolon (C) is the conventional way to join two independent clauses without a coordinating conjunction. (A) creates a comma splice; (B) is a fused / run-on sentence; (D) misplaces commas around the coordinating conjunction.",
  },
  {
    id: "conv-6",
    domain: "conventions",
    difficulty: 3,
    conceptId: "modifier-placement",
    passage:
      "Eager to test the prototype before the upcoming trade show, ______",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "A) the production version included redesigned bearings and a quieter motor.",
      "B) redesigned bearings and a quieter motor were installed in the production version.",
      "C) the engineers worked through the night to install redesigned bearings and a quieter motor.",
      "D) there were redesigned bearings and a quieter motor in the production version of the device.",
    ],
    correct: "C",
    explanation:
      "The opening modifier \"Eager to test the prototype before the upcoming trade show\" must attach to a subject that can plausibly be eager — i.e., a person. Only (C) places \"the engineers\" as the subject of the main clause. (A), (B), and (D) leave the modifier dangling, since their subjects (the production version, the bearings and motor, the expletive \"there\") cannot be eager.",
  },
];

// Section-ordered export — Reading & Writing FIRST, Math SECOND.
// Within each section the original authored order is preserved
// (stable sort), so the difficulty arc the author set up still
// holds.
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  ...QUESTION_POOL.filter((q) => DOMAIN_SECTION[q.domain] === "rw"),
  ...QUESTION_POOL.filter((q) => DOMAIN_SECTION[q.domain] === "math"),
];
