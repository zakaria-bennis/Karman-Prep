// ============================================================
// Reading & Writing — raw curriculum nodes (49 nodes).
//
// This file is data-only. Positions, content overrides, and the
// derived CurriculumNode array are computed in index.ts.
// ============================================================

import type { RawNode } from "./types";

export const rwRaw: Omit<RawNode, "subject">[] = [
  // ── Tier 1 · Foundations (nodes 00–14) ──
  {
    id: "rw-00",
    tier: 1,
    difficulty: 1,
    topic: "Main idea & central claims",
    concept_slug: "main-idea-and-central-claims",
    domain: "info_ideas",
    description:
      "Identify the central claim or main idea of a passage and distinguish it from supporting details.",
    prereqIds: [],
  },
  {
    id: "rw-01",
    tier: 1,
    difficulty: 1,
    topic: "Supporting details & evidence",
    concept_slug: "supporting-details-and-evidence",
    domain: "info_ideas",
    description: "Locate and evaluate evidence that supports an author's central claim.",
    prereqIds: ["rw-00"],
  },
  {
    id: "rw-02",
    tier: 1,
    difficulty: 1,
    topic: "Author's purpose & intent",
    concept_slug: "authors-purpose-and-intent",
    domain: "craft_structure",
    description: "Determine why an author wrote a passage and how that purpose shapes the text.",
    prereqIds: ["rw-01"],
  },
  {
    id: "rw-03",
    tier: 1,
    difficulty: 1,
    topic: "Text organization patterns",
    concept_slug: "text-organization-patterns",
    domain: "craft_structure",
    description:
      "Recognize structural patterns (chronological, cause-effect, compare-contrast) and how they serve the author's purpose.",
    prereqIds: ["rw-01"],
  },
  {
    id: "rw-04",
    tier: 1,
    difficulty: 1,
    topic: "Vocabulary in context",
    concept_slug: "vocabulary-in-context",
    domain: "craft_structure",
    description: "Use surrounding context to determine the precise meaning of words and phrases.",
    prereqIds: ["rw-02"],
  },
  {
    id: "rw-05",
    tier: 1,
    difficulty: 1,
    topic: "Inference & implicit meaning",
    concept_slug: "inference-and-implicit-meaning",
    domain: "info_ideas",
    description: "Draw conclusions from evidence that is implied rather than directly stated.",
    prereqIds: ["rw-03"],
  },
  {
    id: "rw-06",
    tier: 1,
    difficulty: 1,
    topic: "Word choice & connotation",
    concept_slug: "word-choice-and-connotation",
    domain: "craft_structure",
    description:
      "Analyze how specific word choices shape meaning, tone, and the reader's reaction.",
    prereqIds: ["rw-04"],
  },
  // Conventions nodes — modeled on The Critical Reader's complete
  // SAT grammar rule list (16 rules; we skip Faulty Comparisons,
  // Transitions [→ rw-20], Dangling Modifiers [→ rw-28], and
  // Shorter-Is-Better [→ rw-25] which already exist as nodes).
  {
    id: "rw-50",
    tier: 1,
    difficulty: 2,
    topic: "Subject-verb agreement",
    concept_slug: "subject-verb-agreement",
    domain: "conventions",
    description:
      "Match verbs to their subjects in number across compound subjects, prepositional phrases, and non-essential clauses; remember that each and every are singular.",
    prereqIds: ["rw-05"],
  },
  {
    id: "rw-51",
    tier: 1,
    difficulty: 2,
    topic: "Verb tense",
    concept_slug: "verb-tense",
    domain: "conventions",
    description:
      "Maintain tense consistency; use present perfect, simple past, and past perfect correctly; choose between active and passive voice and between TO- and -ING verb forms.",
    prereqIds: ["rw-50"],
  },
  {
    id: "rw-52",
    tier: 1,
    difficulty: 2,
    topic: "Pronouns & nouns",
    concept_slug: "pronouns-and-nouns",
    domain: "conventions",
    description:
      "Match pronouns to their antecedents in number; distinguish people (who) from things (which); choose between who and whom by case.",
    prereqIds: ["rw-06"],
  },
  {
    id: "rw-53",
    tier: 1,
    difficulty: 2,
    topic: "Apostrophes (plural vs. possessive)",
    concept_slug: "apostrophes-plural-vs-possessive",
    domain: "conventions",
    description:
      "Distinguish possessive forms (the dog's bowl) from plurals (the dogs); use possessive pronouns (its, their) without apostrophes.",
    prereqIds: ["rw-52"],
  },
  {
    id: "rw-54",
    tier: 1,
    difficulty: 2,
    topic: "Periods & semicolons",
    concept_slug: "periods-and-semicolons",
    domain: "conventions",
    description:
      "Separate two complete sentences with a period or semicolon; use a semicolon (not a comma) before conjunctive adverbs like however, therefore, and moreover.",
    prereqIds: ["rw-50"],
  },
  {
    id: "rw-55",
    tier: 1,
    difficulty: 2,
    topic: "Comma + FANBOYS",
    concept_slug: "comma-fanboys",
    domain: "conventions",
    description:
      "Join two complete sentences with a comma plus a FANBOYS coordinating conjunction; avoid comma splices and the unneeded comma+FANBOYS+verb pattern.",
    prereqIds: ["rw-54"],
  },
  {
    id: "rw-56",
    tier: 1,
    difficulty: 2,
    topic: "Commas & dependent clauses",
    concept_slug: "commas-and-dependent-clauses",
    domain: "conventions",
    description:
      "Place a comma after an introductory dependent clause; omit the comma when the dependent clause comes after the main clause.",
    prereqIds: ["rw-55"],
  },
  {
    id: "rw-57",
    tier: 1,
    difficulty: 2,
    topic: "Non-essential information",
    concept_slug: "non-essential-information",
    domain: "conventions",
    description:
      "Set off non-essential phrases and clauses with a matched pair of commas, dashes, or parentheses (never mix the two ends).",
    prereqIds: ["rw-56"],
  },
  {
    id: "rw-58",
    tier: 1,
    difficulty: 2,
    topic: "Commas with names & titles",
    concept_slug: "commas-with-names-and-titles",
    domain: "conventions",
    description:
      "Add commas around a name or title only when it is non-essential; omit them when the name is required to identify which person or thing is meant.",
    prereqIds: ["rw-57"],
  },
  {
    id: "rw-59",
    tier: 1,
    difficulty: 2,
    topic: "Additional comma uses & misuses",
    concept_slug: "additional-comma-uses-and-misuses",
    domain: "conventions",
    description:
      "Use commas in lists and between coordinate adjectives; avoid them between subjects and verbs, before prepositions, between compound items, and around essential that-clauses.",
    prereqIds: ["rw-58"],
  },
  {
    id: "rw-60",
    tier: 1,
    difficulty: 2,
    topic: "Colons & dashes",
    concept_slug: "colons-and-dashes",
    domain: "conventions",
    description:
      "Use a colon or dash after a complete sentence to introduce a list, an explanation, or an amplification of what came before.",
    prereqIds: ["rw-54"],
  },
  {
    id: "rw-61",
    tier: 1,
    difficulty: 2,
    topic: "Parallel structure & word pairs",
    concept_slug: "parallel-structure-and-word-pairs",
    domain: "conventions",
    description:
      "Keep items in lists, paired comparisons, and word pairs (either…or, neither…nor, not only…but also) in matching grammatical form.",
    prereqIds: ["rw-50"],
  },
  {
    id: "rw-62",
    tier: 1,
    difficulty: 2,
    topic: "Question marks",
    concept_slug: "question-marks",
    domain: "conventions",
    description:
      'Use a question mark for a direct question; use a period for an indirect question (e.g., "She asked whether he would come.").',
    prereqIds: ["rw-54"],
  },

  // ── Tier 2 · Core — Right side (nodes 15–24) ──
  {
    id: "rw-15",
    tier: 2,
    difficulty: 2,
    topic: "Central idea vs. theme",
    concept_slug: "central-idea-vs-theme",
    domain: "info_ideas",
    description:
      "Distinguish between the explicit central idea of a non-fiction text and the implicit theme of a literary one.",
    prereqIds: ["rw-05"],
  },
  {
    id: "rw-16",
    tier: 2,
    difficulty: 2,
    topic: "Rhetorical appeals",
    concept_slug: "rhetorical-appeals",
    domain: "craft_structure",
    description:
      "Identify how authors use ethos (credibility), pathos (emotion), and logos (logic) to persuade readers.",
    prereqIds: ["rw-15"],
  },
  {
    id: "rw-17",
    tier: 2,
    difficulty: 2,
    topic: "Tone & point of view",
    concept_slug: "tone-and-point-of-view",
    domain: "craft_structure",
    description:
      "Determine the author's tone and recognize how perspective shapes the presentation of information.",
    prereqIds: ["rw-16"],
  },
  {
    id: "rw-18",
    tier: 2,
    difficulty: 2,
    topic: "Citing textual evidence",
    concept_slug: "citing-textual-evidence",
    domain: "info_ideas",
    description:
      "Select specific evidence from the passage that most directly supports a given claim.",
    prereqIds: ["rw-15"],
  },
  {
    id: "rw-19",
    tier: 2,
    difficulty: 2,
    topic: "Evaluating argument strength",
    concept_slug: "evaluating-argument-strength",
    domain: "craft_structure",
    description:
      "Assess whether evidence adequately supports a claim and identify gaps in reasoning.",
    prereqIds: ["rw-18"],
  },
  {
    id: "rw-20",
    tier: 2,
    difficulty: 2,
    topic: "Transitional words & phrases",
    concept_slug: "transitional-words-and-phrases",
    domain: "expression_ideas",
    description:
      "Choose transitions that accurately convey the logical relationship between sentences and paragraphs.",
    prereqIds: ["rw-06"],
  },
  {
    id: "rw-21",
    tier: 2,
    difficulty: 2,
    topic: "Cross-text synthesis",
    concept_slug: "cross-text-synthesis",
    domain: "info_ideas",
    description:
      "Combine information from two passages to answer questions neither could answer alone.",
    prereqIds: ["rw-20"],
  },
  {
    id: "rw-22",
    tier: 2,
    difficulty: 2,
    topic: "Charts & data in passages",
    concept_slug: "charts-and-data-in-passages",
    domain: "info_ideas",
    description:
      "Read tables, graphs, and infographics embedded in passages and connect them to the written argument.",
    prereqIds: ["rw-21"],
  },
  {
    id: "rw-23",
    tier: 2,
    difficulty: 2,
    topic: "Interpreting graphs alongside text",
    concept_slug: "interpreting-graphs-alongside-text",
    domain: "info_ideas",
    description:
      "Determine what a graph shows, how it aligns with or contradicts the passage, and what it implies.",
    prereqIds: ["rw-22"],
  },
  {
    id: "rw-24",
    tier: 2,
    difficulty: 2,
    topic: "Authorial perspective & bias",
    concept_slug: "authorial-perspective-and-bias",
    domain: "craft_structure",
    description:
      "Identify an author's underlying assumptions, values, or biases and how they shape the argument.",
    prereqIds: ["rw-23"],
  },

  // ── Tier 2 · Core — Left side (nodes 25–34) ──
  {
    id: "rw-25",
    tier: 2,
    difficulty: 2,
    topic: "Redundancy & conciseness",
    concept_slug: "redundancy-and-conciseness",
    domain: "expression_ideas",
    description:
      "Eliminate wordiness, repetition, and unnecessary information that weakens writing.",
    prereqIds: ["rw-06"],
  },
  {
    id: "rw-26",
    tier: 2,
    difficulty: 2,
    topic: "Sentence variety & combining",
    concept_slug: "sentence-variety-and-combining",
    domain: "expression_ideas",
    description:
      "Improve flow by combining short sentences and varying structure without losing clarity.",
    prereqIds: ["rw-25"],
  },
  {
    id: "rw-28",
    tier: 2,
    difficulty: 2,
    topic: "Modifier placement",
    concept_slug: "modifier-placement",
    domain: "conventions",
    description:
      "Place modifying phrases and clauses immediately adjacent to the words they describe.",
    prereqIds: ["rw-26"],
  },
  {
    id: "rw-30",
    tier: 2,
    difficulty: 2,
    topic: "Command of evidence — textual",
    concept_slug: "command-of-evidence-textual",
    domain: "info_ideas",
    description:
      "Identify the most specific quote or detail from the text that proves a point or answers a question.",
    prereqIds: ["rw-28", "rw-18"],
  },
  {
    id: "rw-31",
    tier: 2,
    difficulty: 2,
    topic: "Command of evidence — quantitative",
    concept_slug: "command-of-evidence-quantitative",
    domain: "info_ideas",
    description:
      "Use data from graphs and tables as evidence to complete, support, or challenge an argument in the text.",
    prereqIds: ["rw-30"],
  },
  {
    id: "rw-33",
    tier: 2,
    difficulty: 3,
    topic: "Counterclaims & rebuttals",
    concept_slug: "counterclaims-and-rebuttals",
    domain: "info_ideas",
    description:
      "Identify how authors anticipate opposition and evaluate whether their rebuttals are effective.",
    prereqIds: ["rw-31"],
  },
  {
    id: "rw-34",
    tier: 2,
    difficulty: 3,
    topic: "Multi-paragraph structure",
    concept_slug: "multi-paragraph-structure",
    domain: "expression_ideas",
    description:
      "Understand how paragraphs relate to one another and how structure supports the overall argument.",
    prereqIds: ["rw-33"],
  },

  // ── Tier 3 · Advanced — Right peak (nodes 35–40) ──
  {
    id: "rw-35",
    tier: 3,
    difficulty: 3,
    topic: "Rhetorical synthesis",
    concept_slug: "rhetorical-synthesis",
    domain: "expression_ideas",
    description:
      "Select and integrate evidence from multiple perspectives to best achieve a specific rhetorical goal.",
    prereqIds: ["rw-24"],
  },
  {
    id: "rw-36",
    tier: 3,
    difficulty: 3,
    topic: "Advanced argumentation analysis",
    concept_slug: "advanced-argumentation-analysis",
    domain: "craft_structure",
    description:
      "Evaluate the structure, strength, and limitations of complex multi-part arguments.",
    prereqIds: ["rw-35"],
  },
  {
    id: "rw-37",
    tier: 3,
    difficulty: 3,
    topic: "Dual-passage analysis",
    concept_slug: "dual-passage-analysis",
    domain: "info_ideas",
    description:
      "Analyze how two authors address the same topic differently and synthesize their viewpoints.",
    prereqIds: ["rw-36"],
  },
  {
    id: "rw-38",
    tier: 3,
    difficulty: 3,
    topic: "Literary authorial purpose",
    concept_slug: "literary-authorial-purpose",
    domain: "craft_structure",
    description:
      "Interpret how an author's choices in literary texts serve complex thematic and aesthetic purposes.",
    prereqIds: ["rw-37"],
  },
  {
    id: "rw-40",
    tier: 3,
    difficulty: 3,
    topic: "Nuanced vocabulary in context",
    concept_slug: "nuanced-vocabulary-in-context",
    domain: "craft_structure",
    description:
      "Distinguish between subtle differences in meaning for advanced vocabulary in science and social studies passages.",
    prereqIds: ["rw-38"],
  },

  // ── Tier 3 · Advanced — Left peak (nodes 41–46) ──
  {
    id: "rw-41",
    tier: 3,
    difficulty: 3,
    topic: "Advanced transitions & cohesion",
    concept_slug: "advanced-transitions-and-cohesion",
    domain: "expression_ideas",
    description:
      "Select transitions that precisely convey logical relationships in complex, multi-part arguments.",
    prereqIds: ["rw-34"],
  },
  {
    id: "rw-42",
    tier: 3,
    difficulty: 3,
    topic: "Statistical claim evaluation",
    concept_slug: "statistical-claim-evaluation",
    domain: "info_ideas",
    description:
      "Assess whether statistical evidence supports a claim, identify misleading statistics, and understand margins of error.",
    prereqIds: ["rw-41"],
  },
  {
    id: "rw-43",
    tier: 3,
    difficulty: 3,
    topic: "Information & ideas integration",
    concept_slug: "information-and-ideas-integration",
    domain: "info_ideas",
    description:
      "Combine ideas from multiple sources and data types to draw nuanced, well-supported conclusions.",
    prereqIds: ["rw-42"],
  },
  {
    id: "rw-45",
    tier: 3,
    difficulty: 3,
    topic: "Precise word choice in context",
    concept_slug: "precise-word-choice-in-context",
    domain: "craft_structure",
    description:
      "Select the single word or phrase that most accurately conveys the intended meaning in high-stakes revision questions.",
    prereqIds: ["rw-43"],
  },
  {
    id: "rw-46",
    tier: 3,
    difficulty: 3,
    topic: "Structural analysis of texts",
    concept_slug: "structural-analysis-of-texts",
    domain: "craft_structure",
    description:
      "Analyze how an author's structural choices (paragraph order, section headings, emphasis) affect meaning and persuasiveness.",
    prereqIds: ["rw-45"],
  },

  // ── Tier 3 · Advanced — Center apex (nodes 47–49) ──
  {
    id: "rw-47",
    tier: 3,
    difficulty: 3,
    topic: "Cross-disciplinary evidence use",
    concept_slug: "cross-disciplinary-evidence-use",
    domain: "info_ideas",
    description:
      "Integrate data, quotations, and reasoning from science, history, and literature passages into a single coherent response.",
    prereqIds: ["rw-40", "rw-46"],
  },
  {
    id: "rw-48",
    tier: 3,
    difficulty: 3,
    topic: "Logical structure of arguments",
    concept_slug: "logical-structure-of-arguments",
    domain: "craft_structure",
    description:
      "Map an argument's full logical structure — premises, inference steps, and conclusion — to spot weaknesses.",
    prereqIds: ["rw-47"],
  },
];
