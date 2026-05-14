// ============================================================
// Karman Learn — Curriculum Data (Source of Truth)
// ============================================================
//
// 📖 NON-DEVELOPER EDITING GUIDE
// ────────────────────────────────────────────────────────────
//
// QUICK EDITS (safe — no developer needed):
//
//   • Change a topic name or description:
//     Search for the topic you want (e.g. "Comma usage"). Edit the
//     `topic:` or `description:` string. Save.
//
//   • Update lesson notes (the textbook section inside the lesson overlay):
//     Find the node and edit its `textbook_content:` field. You can
//     write plain English with markdown — use `**bold**`, `*italic*`,
//     numbered lists `1.`, and bullet lists `-`.
//     For math formulas wrap them in dollar signs:
//       • Inline math:  $x^2 + 3x = 10$
//       • Block math:   $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
//     Two backslashes required before any LaTeX command (\\frac, \\sqrt).
//
//   • Update a node's Desmos strategy (Math only):
//     Edit `desmos_strategy:` — a plain-English description of how to
//     solve this type of question using Desmos. Example:
//       "Graph both sides as y1 = and y2 =, then read off the
//        intersection point."
//
//   • Reorder or delete a node: DO NOT do this without a developer.
//     Node IDs are referenced by the database and by other nodes'
//     prereqIds. Renaming an ID will break student progress records.
//
// QUIZ QUESTIONS are NOT stored in this file. They live in the
// database and are managed in the admin UI at /admin/curriculum.
// See the admin tool to add, edit, or remove questions.
//
// DIFFICULTY:  1 = beginner, 2 = intermediate, 3 = hard.
//              (Separate from quiz-question difficulty, which has 4
//              levels: foundational, intermediate, advanced, mastery.)
//
// PREREQS:     Each node lists which nodes must be mastered before it
//              unlocks. Removing an ID from `prereqIds` makes the node
//              easier to reach. Adding one makes it harder to unlock.
//
// ADDING NODES: Do NOT add nodes here without a developer. Each new
//              node requires a matching entry in the rwPos / mathPos
//              position arrays.
//
// POSITIONS:   Computed automatically from parametric heart (R&W)
//              and brain-lobe (Math) curves. Do not edit manually.
// ============================================================

import type { SATDomain } from "@/lib/question-bank/taxonomy";

export type Subject = "reading" | "math";
export type Tier = 1 | 2 | 3;

/** Status values stored in `learn_node_status.status`. */
export type NodeStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "partially_complete"   // First quiz pass (≥80 %). Star brightens.
  | "mastered";            // Second consecutive pass. Full brightness.

export interface CurriculumNode {
  id: string;              // e.g. "rw-00", "ma-15"
  subject: Subject;
  tier: Tier;
  topic: string;
  /** Kebab-case slug derived from `topic`. 1:1 with the question-bank
   *  taxonomy; the routine emits this value in `concept_slug` and the
   *  importer matches questions back to the node by it. */
  concept_slug: string;
  /** SAT domain. 1:1 with `SAT_DOMAINS` in lib/question-bank/taxonomy.ts. */
  domain: SATDomain;
  description: string;
  difficulty: 1 | 2 | 3;
  x: number;               // normalized 0–1 for constellation map
  y: number;               // normalized 0–1 for constellation map
  prereqIds: string[];     // IDs of nodes that must be mastered first
  topic_cluster: string;   // admin grouping inside a tier (used to sort quiz questions + tutor filters)
  textbook_content?: string;       // Markdown + KaTeX for lesson overlay
  desmos_strategy?: string;        // Math nodes only
  video_url?: string | null;       // placeholder — null until Mux/video pipeline exists
  estimated_video_length_seconds?: number;  // shown in lesson header, default 6 min
}

// ── Position generators ─────────────────────────────────────
// A single brain split into two lobes. Reading = left lobe, Math = right lobe.
// Each lobe is an elliptical hemisphere; nodes are distributed across three
// horizontal bands that correspond to the three curriculum tiers:
//   • Tier 1 (Foundations) → bottom of the lobe (Troposphere)
//   • Tier 2 (Core)        → middle
//   • Tier 3 (Advanced)    → top of the lobe (Stratosphere)

export const LOBE_LAYOUT = {
  // Each lobe is a vertical ellipse.
  cy:          0.50,   // both lobes share the same vertical center
  rx:          0.17,   // horizontal half-width
  ry:          0.38,   // vertical half-height

  reading: { cx: 0.29 }, // left lobe (Reading & Writing)
  math:    { cx: 0.71 }, // right lobe (Math)

  // Atmospheric strip at the very top of the map (Stratosphere).
  // Nodes never go above this y.
  topLimit: 0.08,
  bottomLimit: 0.94,
};

/**
 * Distribute `count` nodes inside an elliptical lobe, restricted to a
 * horizontal band (yFrac is fraction of ry, −1 = top, +1 = bottom).
 * Deterministic for the same (cx, cy, count, seed).
 */
function distributeInLobe(
  cx: number, cy: number, rx: number, ry: number,
  yFracMin: number, yFracMax: number,
  count: number, seed: number
): [number, number][] {
  const pts: [number, number][] = [];

  // Use a mild low-discrepancy sequence (Halton-like) so the nodes scatter
  // nicely across the band instead of clustering.
  const phi1 = 0.7548776662466927;
  const phi2 = 0.5698402909980532;
  let s1 = (seed * 0.6180339887) % 1;
  let s2 = (seed * 0.3141592653) % 1;

  for (let i = 0; i < count; i++) {
    s1 = (s1 + phi1) % 1;
    s2 = (s2 + phi2) % 1;

    const yFrac = yFracMin + s1 * (yFracMax - yFracMin);
    const y = cy + yFrac * ry;

    // Max x-offset inside the ellipse at this y
    const maxOff = rx * Math.sqrt(Math.max(0, 1 - yFrac * yFrac)) * 0.90;
    const x = cx + (2 * s2 - 1) * maxOff;

    pts.push([+x.toFixed(3), +y.toFixed(3)]);
  }
  return pts;
}

// ── Pre-computed positions ────────────────────────────────────
// Both subjects share the same brain. Reading nodes live in the left lobe,
// Math nodes live in the right lobe. Tier 1 sits near the bottom of the
// lobe (Troposphere), Tier 3 near the top (Stratosphere).

const { cy: LOBE_CY, rx: LOBE_RX, ry: LOBE_RY, reading: L_READ, math: L_MATH } = LOBE_LAYOUT;

// Tier y-bands (as fractions of ry, negative = up)
const T1_YMIN =  0.20, T1_YMAX =  0.82;   // bottom of lobe
const T2_YMIN = -0.28, T2_YMAX =  0.38;   // middle
const T3_YMIN = -0.84, T3_YMAX = -0.22;   // top of lobe

// Reading & Writing — left lobe
const rwPos: [number, number][] = [
  ...distributeInLobe(L_READ.cx, LOBE_CY, LOBE_RX, LOBE_RY, T1_YMIN, T1_YMAX, 20, 11),
  ...distributeInLobe(L_READ.cx, LOBE_CY, LOBE_RX, LOBE_RY, T2_YMIN, T2_YMAX, 17, 47),
  ...distributeInLobe(L_READ.cx, LOBE_CY, LOBE_RX, LOBE_RY, T3_YMIN, T3_YMAX, 12, 83),
];

// Math — right lobe
const mathPos: [number, number][] = [
  ...distributeInLobe(L_MATH.cx, LOBE_CY, LOBE_RX, LOBE_RY, T1_YMIN, T1_YMAX, 13, 113),
  ...distributeInLobe(L_MATH.cx, LOBE_CY, LOBE_RX, LOBE_RY, T2_YMIN, T2_YMAX, 19, 151),
  ...distributeInLobe(L_MATH.cx, LOBE_CY, LOBE_RX, LOBE_RY, T3_YMIN, T3_YMAX, 8, 193),
];

// ── Topic definitions ────────────────────────────────────────

interface RawNode {
  id: string;
  subject: Subject;
  tier: Tier;
  difficulty: 1 | 2 | 3;
  topic: string;
  concept_slug: string;
  domain: SATDomain;
  description: string;
  prereqIds: string[];
  topic_cluster?: string;
  textbook_content?: string;
  desmos_strategy?: string;
  video_url?: string | null;
  estimated_video_length_seconds?: number;
}

/** Best-guess cluster label when a node hasn't set its own. */
function defaultCluster(tier: Tier, subject: Subject): string {
  if (subject === "reading") {
    if (tier === 1) return "Foundational Reading Skills";
    if (tier === 2) return "Core Argumentation & Evidence";
    return "Advanced Synthesis";
  }
  if (tier === 1) return "Foundational Algebra & Arithmetic";
  if (tier === 2) return "Core Functions & Geometry";
  return "Advanced Math & Strategy";
}

// ─── Reading & Writing (49 nodes) ───────────────────────────

const rwRaw: Omit<RawNode, "subject">[] = [
  // ── Tier 1 · Foundations (nodes 00–14) ──
  {
    id: "rw-00", tier: 1, difficulty: 1,
    topic: "Main idea & central claims",
    concept_slug: "main-idea-and-central-claims",
    domain: "info_ideas",
    description: "Identify the central claim or main idea of a passage and distinguish it from supporting details.",
    prereqIds: [],
  },
  {
    id: "rw-01", tier: 1, difficulty: 1,
    topic: "Supporting details & evidence",
    concept_slug: "supporting-details-and-evidence",
    domain: "info_ideas",
    description: "Locate and evaluate evidence that supports an author's central claim.",
    prereqIds: ["rw-00"],
  },
  {
    id: "rw-02", tier: 1, difficulty: 1,
    topic: "Author's purpose & intent",
    concept_slug: "authors-purpose-and-intent",
    domain: "craft_structure",
    description: "Determine why an author wrote a passage and how that purpose shapes the text.",
    prereqIds: ["rw-01"],
  },
  {
    id: "rw-03", tier: 1, difficulty: 1,
    topic: "Text organization patterns",
    concept_slug: "text-organization-patterns",
    domain: "craft_structure",
    description: "Recognize structural patterns (chronological, cause-effect, compare-contrast) and how they serve the author's purpose.",
    prereqIds: ["rw-01"],
  },
  {
    id: "rw-04", tier: 1, difficulty: 1,
    topic: "Vocabulary in context",
    concept_slug: "vocabulary-in-context",
    domain: "craft_structure",
    description: "Use surrounding context to determine the precise meaning of words and phrases.",
    prereqIds: ["rw-02"],
  },
  {
    id: "rw-05", tier: 1, difficulty: 1,
    topic: "Inference & implicit meaning",
    concept_slug: "inference-and-implicit-meaning",
    domain: "info_ideas",
    description: "Draw conclusions from evidence that is implied rather than directly stated.",
    prereqIds: ["rw-03"],
  },
  {
    id: "rw-06", tier: 1, difficulty: 1,
    topic: "Word choice & connotation",
    concept_slug: "word-choice-and-connotation",
    domain: "craft_structure",
    description: "Analyze how specific word choices shape meaning, tone, and the reader's reaction.",
    prereqIds: ["rw-04"],
  },
  // Conventions nodes — modeled on The Critical Reader's complete
  // SAT grammar rule list (16 rules; we skip Faulty Comparisons,
  // Transitions [→ rw-20], Dangling Modifiers [→ rw-28], and
  // Shorter-Is-Better [→ rw-25] which already exist as nodes).
  {
    id: "rw-50", tier: 1, difficulty: 2,
    topic: "Subject-verb agreement",
    concept_slug: "subject-verb-agreement",
    domain: "conventions",
    description: "Match verbs to their subjects in number across compound subjects, prepositional phrases, and non-essential clauses; remember that each and every are singular.",
    prereqIds: ["rw-05"],
  },
  {
    id: "rw-51", tier: 1, difficulty: 2,
    topic: "Verb tense",
    concept_slug: "verb-tense",
    domain: "conventions",
    description: "Maintain tense consistency; use present perfect, simple past, and past perfect correctly; choose between active and passive voice and between TO- and -ING verb forms.",
    prereqIds: ["rw-50"],
  },
  {
    id: "rw-52", tier: 1, difficulty: 2,
    topic: "Pronouns & nouns",
    concept_slug: "pronouns-and-nouns",
    domain: "conventions",
    description: "Match pronouns to their antecedents in number; distinguish people (who) from things (which); choose between who and whom by case.",
    prereqIds: ["rw-06"],
  },
  {
    id: "rw-53", tier: 1, difficulty: 2,
    topic: "Apostrophes (plural vs. possessive)",
    concept_slug: "apostrophes-plural-vs-possessive",
    domain: "conventions",
    description: "Distinguish possessive forms (the dog's bowl) from plurals (the dogs); use possessive pronouns (its, their) without apostrophes.",
    prereqIds: ["rw-52"],
  },
  {
    id: "rw-54", tier: 1, difficulty: 2,
    topic: "Periods & semicolons",
    concept_slug: "periods-and-semicolons",
    domain: "conventions",
    description: "Separate two complete sentences with a period or semicolon; use a semicolon (not a comma) before conjunctive adverbs like however, therefore, and moreover.",
    prereqIds: ["rw-50"],
  },
  {
    id: "rw-55", tier: 1, difficulty: 2,
    topic: "Comma + FANBOYS",
    concept_slug: "comma-fanboys",
    domain: "conventions",
    description: "Join two complete sentences with a comma plus a FANBOYS coordinating conjunction; avoid comma splices and the unneeded comma+FANBOYS+verb pattern.",
    prereqIds: ["rw-54"],
  },
  {
    id: "rw-56", tier: 1, difficulty: 2,
    topic: "Commas & dependent clauses",
    concept_slug: "commas-and-dependent-clauses",
    domain: "conventions",
    description: "Place a comma after an introductory dependent clause; omit the comma when the dependent clause comes after the main clause.",
    prereqIds: ["rw-55"],
  },
  {
    id: "rw-57", tier: 1, difficulty: 2,
    topic: "Non-essential information",
    concept_slug: "non-essential-information",
    domain: "conventions",
    description: "Set off non-essential phrases and clauses with a matched pair of commas, dashes, or parentheses (never mix the two ends).",
    prereqIds: ["rw-56"],
  },
  {
    id: "rw-58", tier: 1, difficulty: 2,
    topic: "Commas with names & titles",
    concept_slug: "commas-with-names-and-titles",
    domain: "conventions",
    description: "Add commas around a name or title only when it is non-essential; omit them when the name is required to identify which person or thing is meant.",
    prereqIds: ["rw-57"],
  },
  {
    id: "rw-59", tier: 1, difficulty: 2,
    topic: "Additional comma uses & misuses",
    concept_slug: "additional-comma-uses-and-misuses",
    domain: "conventions",
    description: "Use commas in lists and between coordinate adjectives; avoid them between subjects and verbs, before prepositions, between compound items, and around essential that-clauses.",
    prereqIds: ["rw-58"],
  },
  {
    id: "rw-60", tier: 1, difficulty: 2,
    topic: "Colons & dashes",
    concept_slug: "colons-and-dashes",
    domain: "conventions",
    description: "Use a colon or dash after a complete sentence to introduce a list, an explanation, or an amplification of what came before.",
    prereqIds: ["rw-54"],
  },
  {
    id: "rw-61", tier: 1, difficulty: 2,
    topic: "Parallel structure & word pairs",
    concept_slug: "parallel-structure-and-word-pairs",
    domain: "conventions",
    description: "Keep items in lists, paired comparisons, and word pairs (either…or, neither…nor, not only…but also) in matching grammatical form.",
    prereqIds: ["rw-50"],
  },
  {
    id: "rw-62", tier: 1, difficulty: 2,
    topic: "Question marks",
    concept_slug: "question-marks",
    domain: "conventions",
    description: "Use a question mark for a direct question; use a period for an indirect question (e.g., \"She asked whether he would come.\").",
    prereqIds: ["rw-54"],
  },

  // ── Tier 2 · Core — Right side (nodes 15–24) ──
  {
    id: "rw-15", tier: 2, difficulty: 2,
    topic: "Central idea vs. theme",
    concept_slug: "central-idea-vs-theme",
    domain: "info_ideas",
    description: "Distinguish between the explicit central idea of a non-fiction text and the implicit theme of a literary one.",
    prereqIds: ["rw-05"],
  },
  {
    id: "rw-16", tier: 2, difficulty: 2,
    topic: "Rhetorical appeals",
    concept_slug: "rhetorical-appeals",
    domain: "craft_structure",
    description: "Identify how authors use ethos (credibility), pathos (emotion), and logos (logic) to persuade readers.",
    prereqIds: ["rw-15"],
  },
  {
    id: "rw-17", tier: 2, difficulty: 2,
    topic: "Tone & point of view",
    concept_slug: "tone-and-point-of-view",
    domain: "craft_structure",
    description: "Determine the author's tone and recognize how perspective shapes the presentation of information.",
    prereqIds: ["rw-16"],
  },
  {
    id: "rw-18", tier: 2, difficulty: 2,
    topic: "Citing textual evidence",
    concept_slug: "citing-textual-evidence",
    domain: "info_ideas",
    description: "Select specific evidence from the passage that most directly supports a given claim.",
    prereqIds: ["rw-15"],
  },
  {
    id: "rw-19", tier: 2, difficulty: 2,
    topic: "Evaluating argument strength",
    concept_slug: "evaluating-argument-strength",
    domain: "craft_structure",
    description: "Assess whether evidence adequately supports a claim and identify gaps in reasoning.",
    prereqIds: ["rw-18"],
  },
  {
    id: "rw-20", tier: 2, difficulty: 2,
    topic: "Transitional words & phrases",
    concept_slug: "transitional-words-and-phrases",
    domain: "expression_ideas",
    description: "Choose transitions that accurately convey the logical relationship between sentences and paragraphs.",
    prereqIds: ["rw-06"],
  },
  {
    id: "rw-21", tier: 2, difficulty: 2,
    topic: "Cross-text synthesis",
    concept_slug: "cross-text-synthesis",
    domain: "info_ideas",
    description: "Combine information from two passages to answer questions neither could answer alone.",
    prereqIds: ["rw-20"],
  },
  {
    id: "rw-22", tier: 2, difficulty: 2,
    topic: "Charts & data in passages",
    concept_slug: "charts-and-data-in-passages",
    domain: "info_ideas",
    description: "Read tables, graphs, and infographics embedded in passages and connect them to the written argument.",
    prereqIds: ["rw-21"],
  },
  {
    id: "rw-23", tier: 2, difficulty: 2,
    topic: "Interpreting graphs alongside text",
    concept_slug: "interpreting-graphs-alongside-text",
    domain: "info_ideas",
    description: "Determine what a graph shows, how it aligns with or contradicts the passage, and what it implies.",
    prereqIds: ["rw-22"],
  },
  {
    id: "rw-24", tier: 2, difficulty: 2,
    topic: "Authorial perspective & bias",
    concept_slug: "authorial-perspective-and-bias",
    domain: "craft_structure",
    description: "Identify an author's underlying assumptions, values, or biases and how they shape the argument.",
    prereqIds: ["rw-23"],
  },

  // ── Tier 2 · Core — Left side (nodes 25–34) ──
  {
    id: "rw-25", tier: 2, difficulty: 2,
    topic: "Redundancy & conciseness",
    concept_slug: "redundancy-and-conciseness",
    domain: "expression_ideas",
    description: "Eliminate wordiness, repetition, and unnecessary information that weakens writing.",
    prereqIds: ["rw-06"],
  },
  {
    id: "rw-26", tier: 2, difficulty: 2,
    topic: "Sentence variety & combining",
    concept_slug: "sentence-variety-and-combining",
    domain: "expression_ideas",
    description: "Improve flow by combining short sentences and varying structure without losing clarity.",
    prereqIds: ["rw-25"],
  },
  {
    id: "rw-28", tier: 2, difficulty: 2,
    topic: "Modifier placement",
    concept_slug: "modifier-placement",
    domain: "conventions",
    description: "Place modifying phrases and clauses immediately adjacent to the words they describe.",
    prereqIds: ["rw-26"],
  },
  {
    id: "rw-30", tier: 2, difficulty: 2,
    topic: "Command of evidence — textual",
    concept_slug: "command-of-evidence-textual",
    domain: "info_ideas",
    description: "Identify the most specific quote or detail from the text that proves a point or answers a question.",
    prereqIds: ["rw-28", "rw-18"],
  },
  {
    id: "rw-31", tier: 2, difficulty: 2,
    topic: "Command of evidence — quantitative",
    concept_slug: "command-of-evidence-quantitative",
    domain: "info_ideas",
    description: "Use data from graphs and tables as evidence to complete, support, or challenge an argument in the text.",
    prereqIds: ["rw-30"],
  },
  {
    id: "rw-33", tier: 2, difficulty: 3,
    topic: "Counterclaims & rebuttals",
    concept_slug: "counterclaims-and-rebuttals",
    domain: "info_ideas",
    description: "Identify how authors anticipate opposition and evaluate whether their rebuttals are effective.",
    prereqIds: ["rw-31"],
  },
  {
    id: "rw-34", tier: 2, difficulty: 3,
    topic: "Multi-paragraph structure",
    concept_slug: "multi-paragraph-structure",
    domain: "expression_ideas",
    description: "Understand how paragraphs relate to one another and how structure supports the overall argument.",
    prereqIds: ["rw-33"],
  },

  // ── Tier 3 · Advanced — Right peak (nodes 35–40) ──
  {
    id: "rw-35", tier: 3, difficulty: 3,
    topic: "Rhetorical synthesis",
    concept_slug: "rhetorical-synthesis",
    domain: "expression_ideas",
    description: "Select and integrate evidence from multiple perspectives to best achieve a specific rhetorical goal.",
    prereqIds: ["rw-24"],
  },
  {
    id: "rw-36", tier: 3, difficulty: 3,
    topic: "Advanced argumentation analysis",
    concept_slug: "advanced-argumentation-analysis",
    domain: "craft_structure",
    description: "Evaluate the structure, strength, and limitations of complex multi-part arguments.",
    prereqIds: ["rw-35"],
  },
  {
    id: "rw-37", tier: 3, difficulty: 3,
    topic: "Dual-passage analysis",
    concept_slug: "dual-passage-analysis",
    domain: "info_ideas",
    description: "Analyze how two authors address the same topic differently and synthesize their viewpoints.",
    prereqIds: ["rw-36"],
  },
  {
    id: "rw-38", tier: 3, difficulty: 3,
    topic: "Literary authorial purpose",
    concept_slug: "literary-authorial-purpose",
    domain: "craft_structure",
    description: "Interpret how an author's choices in literary texts serve complex thematic and aesthetic purposes.",
    prereqIds: ["rw-37"],
  },
  {
    id: "rw-40", tier: 3, difficulty: 3,
    topic: "Nuanced vocabulary in context",
    concept_slug: "nuanced-vocabulary-in-context",
    domain: "craft_structure",
    description: "Distinguish between subtle differences in meaning for advanced vocabulary in science and social studies passages.",
    prereqIds: ["rw-38"],
  },

  // ── Tier 3 · Advanced — Left peak (nodes 41–46) ──
  {
    id: "rw-41", tier: 3, difficulty: 3,
    topic: "Advanced transitions & cohesion",
    concept_slug: "advanced-transitions-and-cohesion",
    domain: "expression_ideas",
    description: "Select transitions that precisely convey logical relationships in complex, multi-part arguments.",
    prereqIds: ["rw-34"],
  },
  {
    id: "rw-42", tier: 3, difficulty: 3,
    topic: "Statistical claim evaluation",
    concept_slug: "statistical-claim-evaluation",
    domain: "info_ideas",
    description: "Assess whether statistical evidence supports a claim, identify misleading statistics, and understand margins of error.",
    prereqIds: ["rw-41"],
  },
  {
    id: "rw-43", tier: 3, difficulty: 3,
    topic: "Information & ideas integration",
    concept_slug: "information-and-ideas-integration",
    domain: "info_ideas",
    description: "Combine ideas from multiple sources and data types to draw nuanced, well-supported conclusions.",
    prereqIds: ["rw-42"],
  },
  {
    id: "rw-45", tier: 3, difficulty: 3,
    topic: "Precise word choice in context",
    concept_slug: "precise-word-choice-in-context",
    domain: "craft_structure",
    description: "Select the single word or phrase that most accurately conveys the intended meaning in high-stakes revision questions.",
    prereqIds: ["rw-43"],
  },
  {
    id: "rw-46", tier: 3, difficulty: 3,
    topic: "Structural analysis of texts",
    concept_slug: "structural-analysis-of-texts",
    domain: "craft_structure",
    description: "Analyze how an author's structural choices (paragraph order, section headings, emphasis) affect meaning and persuasiveness.",
    prereqIds: ["rw-45"],
  },

  // ── Tier 3 · Advanced — Center apex (nodes 47–49) ──
  {
    id: "rw-47", tier: 3, difficulty: 3,
    topic: "Cross-disciplinary evidence use",
    concept_slug: "cross-disciplinary-evidence-use",
    domain: "info_ideas",
    description: "Integrate data, quotations, and reasoning from science, history, and literature passages into a single coherent response.",
    prereqIds: ["rw-40", "rw-46"],
  },
  {
    id: "rw-48", tier: 3, difficulty: 3,
    topic: "Logical structure of arguments",
    concept_slug: "logical-structure-of-arguments",
    domain: "craft_structure",
    description: "Map an argument's full logical structure — premises, inference steps, and conclusion — to spot weaknesses.",
    prereqIds: ["rw-47"],
  },
];

// ─── Math (40 nodes) ─────────────────────────────────────────

const maRaw: Omit<RawNode, "subject">[] = [
  // ── Tier 1 · Foundations (nodes 00–14) ──
  {
    id: "ma-00", tier: 1, difficulty: 1,
    topic: "Linear equations (one variable)",
    concept_slug: "linear-equations-one-variable",
    domain: "algebra",
    description: "Solve equations of the form ax + b = c and interpret solutions in context.",
    prereqIds: [],
  },
  {
    id: "ma-01", tier: 1, difficulty: 1,
    topic: "Linear equations (two variables)",
    concept_slug: "linear-equations-two-variables",
    domain: "algebra",
    description: "Write, graph, and interpret equations relating two quantities with constant rate of change.",
    prereqIds: ["ma-00"],
  },
  {
    id: "ma-02", tier: 1, difficulty: 1,
    topic: "Linear inequalities",
    concept_slug: "linear-inequalities",
    domain: "algebra",
    description: "Solve and graph one- and two-variable linear inequalities and interpret solution sets.",
    prereqIds: ["ma-01"],
  },
  {
    id: "ma-03", tier: 1, difficulty: 1,
    topic: "Ratios & proportions",
    concept_slug: "ratios-and-proportions",
    domain: "data_analysis",
    description: "Set up and solve proportion equations; apply to scale, mixtures, and real-world comparisons.",
    prereqIds: ["ma-00"],
  },
  {
    id: "ma-04", tier: 1, difficulty: 1,
    topic: "Percentages",
    concept_slug: "percentages",
    domain: "data_analysis",
    description: "Calculate percent of a number, percent change, and reverse-percent problems.",
    prereqIds: ["ma-03"],
  },
  {
    id: "ma-05", tier: 1, difficulty: 1,
    topic: "Unit rates & conversions",
    concept_slug: "unit-rates-and-conversions",
    domain: "data_analysis",
    description: "Convert between units using dimensional analysis and interpret rates in real-world contexts.",
    prereqIds: ["ma-03"],
  },
  {
    id: "ma-06", tier: 1, difficulty: 1,
    topic: "Properties of exponents",
    concept_slug: "properties-of-exponents",
    domain: "advanced_math",
    description: "Apply product, quotient, power, and zero-exponent rules to simplify expressions.",
    prereqIds: ["ma-04"],
  },
  {
    id: "ma-07", tier: 1, difficulty: 1,
    topic: "Simplifying algebraic expressions",
    concept_slug: "simplifying-algebraic-expressions",
    domain: "advanced_math",
    description: "Combine like terms, distribute, and factor out common terms from polynomial expressions.",
    prereqIds: ["ma-06"],
  },
  {
    id: "ma-08", tier: 1, difficulty: 2,
    topic: "Evaluating & interpreting functions",
    concept_slug: "evaluating-and-interpreting-functions",
    domain: "advanced_math",
    description: "Evaluate f(x) at given values and interpret function notation in applied problems.",
    prereqIds: ["ma-02", "ma-07"],
  },
  {
    id: "ma-10", tier: 1, difficulty: 2,
    topic: "Introduction to polynomials",
    concept_slug: "introduction-to-polynomials",
    domain: "advanced_math",
    description: "Classify polynomials by degree, identify leading coefficients, and understand end behavior.",
    prereqIds: ["ma-07"],
  },
  {
    id: "ma-11", tier: 1, difficulty: 2,
    topic: "Area, perimeter & volume",
    concept_slug: "area-perimeter-and-volume",
    domain: "geometry",
    description: "Calculate area and perimeter of standard shapes and volume of 3D figures including cylinders and cones.",
    prereqIds: ["ma-04"],
  },
  {
    id: "ma-12", tier: 1, difficulty: 2,
    topic: "Angle relationships",
    concept_slug: "angle-relationships",
    domain: "geometry",
    description: "Apply properties of supplementary, complementary, vertical, and corresponding angles.",
    prereqIds: ["ma-11"],
  },
  {
    id: "ma-13", tier: 1, difficulty: 2,
    topic: "Coordinate plane geometry",
    concept_slug: "coordinate-plane-geometry",
    domain: "geometry",
    description: "Find midpoints, distances, and slopes; interpret lines on the coordinate plane.",
    prereqIds: ["ma-12"],
  },

  // ── Tier 2 · Core — Right lobe (nodes 15–34) ──
  {
    id: "ma-15", tier: 2, difficulty: 2,
    topic: "Systems of linear equations",
    concept_slug: "systems-of-linear-equations",
    domain: "algebra",
    description: "Solve systems by substitution and elimination; interpret solutions as intersection points.",
    prereqIds: ["ma-01", "ma-02"],
  },
  {
    id: "ma-16", tier: 2, difficulty: 2,
    topic: "Systems of linear inequalities",
    concept_slug: "systems-of-linear-inequalities",
    domain: "algebra",
    description: "Graph and interpret solution regions for systems of inequalities, including optimization contexts.",
    prereqIds: ["ma-15"],
  },
  {
    id: "ma-17", tier: 2, difficulty: 2,
    topic: "Quadratic equations — factoring",
    concept_slug: "quadratic-equations-factoring",
    domain: "advanced_math",
    description: "Factor trinomials and use the zero-product property to solve quadratic equations.",
    prereqIds: ["ma-15"],
  },
  {
    id: "ma-18", tier: 2, difficulty: 2,
    topic: "Quadratic equations — quadratic formula",
    concept_slug: "quadratic-equations-quadratic-formula",
    domain: "advanced_math",
    description: "Apply the quadratic formula and discriminant to solve and analyze quadratic equations.",
    prereqIds: ["ma-17"],
  },
  {
    id: "ma-19", tier: 2, difficulty: 2,
    topic: "Quadratic functions — vertex form",
    concept_slug: "quadratic-functions-vertex-form",
    domain: "advanced_math",
    description: "Convert between standard and vertex form; identify vertex, axis of symmetry, and direction of opening.",
    prereqIds: ["ma-18"],
  },
  {
    id: "ma-20", tier: 2, difficulty: 2,
    topic: "Polynomial operations",
    concept_slug: "polynomial-operations",
    domain: "advanced_math",
    description: "Add, subtract, multiply, and divide polynomials; understand the relationship between roots and factors.",
    prereqIds: ["ma-10", "ma-17"],
  },
  {
    id: "ma-21", tier: 2, difficulty: 2,
    topic: "Rational expressions",
    concept_slug: "rational-expressions",
    domain: "advanced_math",
    description: "Simplify, add, subtract, and multiply rational expressions; identify excluded values.",
    prereqIds: ["ma-20"],
  },
  {
    id: "ma-22", tier: 2, difficulty: 2,
    topic: "Radical expressions",
    concept_slug: "radical-expressions",
    domain: "advanced_math",
    description: "Simplify radicals, rationalize denominators, and solve equations involving square roots.",
    prereqIds: ["ma-07"],
  },
  {
    id: "ma-23", tier: 2, difficulty: 2,
    topic: "Exponential growth & decay",
    concept_slug: "exponential-growth-and-decay",
    domain: "advanced_math",
    description: "Model and interpret exponential functions in real-world contexts including compound interest.",
    prereqIds: ["ma-06"],
  },
  {
    id: "ma-25", tier: 2, difficulty: 2,
    topic: "Absolute value equations",
    concept_slug: "absolute-value-equations",
    domain: "algebra",
    description: "Solve absolute value equations and inequalities; interpret solutions on a number line.",
    prereqIds: ["ma-15"],
  },
  {
    id: "ma-26", tier: 2, difficulty: 2,
    topic: "Function transformations",
    concept_slug: "function-transformations",
    domain: "advanced_math",
    description: "Apply horizontal/vertical shifts, reflections, and stretches to graphs of any function.",
    prereqIds: ["ma-08", "ma-19"],
  },
  {
    id: "ma-27", tier: 2, difficulty: 2,
    topic: "Linear vs. exponential models",
    concept_slug: "linear-vs-exponential-models",
    domain: "advanced_math",
    description: "Determine whether a data set is best modeled by a linear or exponential function and write the equation.",
    prereqIds: ["ma-23"],
  },
  {
    id: "ma-28", tier: 2, difficulty: 2,
    topic: "Scatterplots & lines of best fit",
    concept_slug: "scatterplots-and-lines-of-best-fit",
    domain: "data_analysis",
    description: "Interpret scatterplot trends, estimate lines of best fit, and use them to make predictions.",
    prereqIds: ["ma-13"],
  },
  {
    id: "ma-29", tier: 2, difficulty: 2,
    topic: "Statistical measures",
    concept_slug: "statistical-measures",
    domain: "data_analysis",
    description: "Calculate and interpret mean, median, mode, range, and standard deviation; compare distributions.",
    prereqIds: ["ma-04"],
  },
  {
    id: "ma-30", tier: 2, difficulty: 2,
    topic: "Probability basics",
    concept_slug: "probability-basics",
    domain: "data_analysis",
    description: "Calculate simple and compound probabilities; apply counting principles and conditional probability.",
    prereqIds: ["ma-29"],
  },
  {
    id: "ma-31", tier: 2, difficulty: 2,
    topic: "Two-way tables",
    concept_slug: "two-way-tables",
    domain: "data_analysis",
    description: "Interpret frequency and relative frequency in two-way tables; calculate conditional probabilities.",
    prereqIds: ["ma-30"],
  },
  {
    id: "ma-32", tier: 2, difficulty: 2,
    topic: "Triangle congruence & similarity",
    concept_slug: "triangle-congruence-and-similarity",
    domain: "geometry",
    description: "Apply SSS, SAS, ASA congruence and AA, SAS similarity to solve for unknown sides and angles.",
    prereqIds: ["ma-12"],
  },
  {
    id: "ma-33", tier: 2, difficulty: 2,
    topic: "Pythagorean theorem & distance formula",
    concept_slug: "pythagorean-theorem-and-distance-formula",
    domain: "geometry",
    description: "Apply the Pythagorean theorem and distance formula in 2D and 3D contexts.",
    prereqIds: ["ma-32", "ma-13"],
  },
  {
    id: "ma-34", tier: 2, difficulty: 3,
    topic: "Trigonometric ratios",
    concept_slug: "trigonometric-ratios",
    domain: "geometry",
    description: "Define and apply sine, cosine, and tangent (SOH-CAH-TOA) to solve right triangle problems.",
    prereqIds: ["ma-33", "ma-12"],
  },

  // ── Tier 3 · Advanced — Center bridge (nodes 35–43) ──
  {
    id: "ma-35", tier: 3, difficulty: 3,
    topic: "Nonlinear systems of equations",
    concept_slug: "nonlinear-systems-of-equations",
    domain: "advanced_math",
    description: "Solve systems involving one linear and one quadratic (or other nonlinear) equation algebraically and graphically.",
    prereqIds: ["ma-19"],
  },
  {
    id: "ma-41", tier: 3, difficulty: 3,
    topic: "Circle equations in standard form",
    concept_slug: "circle-equations-in-standard-form",
    domain: "geometry",
    description: "Write and interpret the standard form (x – h)² + (y – k)² = r² and complete the square to convert.",
    prereqIds: ["ma-33"],
  },
  {
    id: "ma-42", tier: 3, difficulty: 3,
    topic: "Arc length & sector area",
    concept_slug: "arc-length-and-sector-area",
    domain: "geometry",
    description: "Calculate arc length and sector area using radian measures; convert between radians and degrees.",
    prereqIds: ["ma-41"],
  },
  {
    id: "ma-43", tier: 3, difficulty: 3,
    topic: "Statistical inference & margin of error",
    concept_slug: "statistical-inference-and-margin-of-error",
    domain: "data_analysis",
    description: "Interpret confidence intervals, margin of error, and make valid inferences from sample data.",
    prereqIds: ["ma-30", "ma-31"],
  },

  // ── Tier 3 · Advanced — Stem (nodes 46–49) ──
  {
    id: "ma-46", tier: 3, difficulty: 3,
    topic: "Algebraic manipulation of complex expressions",
    concept_slug: "algebraic-manipulation-of-complex-expressions",
    domain: "advanced_math",
    description: "Rewrite expressions in equivalent forms to reveal properties and solve multi-step problems.",
    prereqIds: ["ma-21"],
  },
  {
    id: "ma-47", tier: 3, difficulty: 3,
    topic: "Interpreting complex data",
    concept_slug: "interpreting-complex-data",
    domain: "data_analysis",
    description: "Analyze histograms, dot plots, box plots, and combinations of data displays to draw conclusions.",
    prereqIds: ["ma-43"],
  },
  {
    id: "ma-48", tier: 3, difficulty: 3,
    topic: "Multi-step problem solving",
    concept_slug: "multi-step-problem-solving",
    domain: "advanced_math",
    description: "Translate complex word problems into equations, systems, or models and solve efficiently.",
    prereqIds: ["ma-46", "ma-47"],
  },
  {
    id: "ma-49", tier: 3, difficulty: 3,
    topic: "Full-section strategy",
    concept_slug: "full-section-strategy",
    domain: "advanced_math",
    description: "Apply time management, calculator strategy, answer estimation, and back-solving to maximize your Math score.",
    prereqIds: ["ma-48"],
  },
];

// ── Per-node content overrides ───────────────────────────────
// Non-technical editors can add entries here to supply textbook
// content and Desmos strategies. Any node not listed gets a
// short auto-generated placeholder.

const NODE_CONTENT: Partial<Record<string, {
  textbook_content?: string;
  desmos_strategy?: string;
  topic_cluster?: string;
  video_url?: string | null;
  estimated_video_length_seconds?: number;
}>> = {
  "rw-00": {
    topic_cluster: "Information and Ideas",
    textbook_content: `Every SAT passage has one **main idea** — the single sentence a good summary would begin with. Your job is to strip away examples, quotes, and qualifying clauses until you're left with that one sentence.

Most passages follow a predictable shape:

1. Open with a situation, claim, or observation.
2. Expand with 2–3 supporting details.
3. Close with a restatement or mild counterargument.

**Watch for:**
- Topic sentences that open or close paragraphs.
- Transition words like *however*, *therefore*, and *in contrast* — they often signal a shift back to the main idea.
- Repeated nouns and phrases — repetition is a clue to what the passage cares about.

When an answer choice restates a narrow detail, it is almost never the main idea. The correct main-idea answer is broad enough to cover every paragraph.`,
    estimated_video_length_seconds: 360,
  },
  "rw-20": {
    topic_cluster: "Expression of Ideas",
    textbook_content: `Transitions tell the reader *how* two ideas relate. The SAT tests your ability to pick the transition that matches the logical relationship — not just one that "sounds right."

Four families to recognize:

- **Addition** (*also, furthermore, in addition*) — second idea extends the first.
- **Contrast** (*however, but, by contrast, on the other hand*) — second idea pushes against the first.
- **Cause & effect** (*therefore, as a result, consequently*) — second idea is caused by the first.
- **Example** (*for instance, specifically, in particular*) — second idea illustrates the first.

Before picking a transition, cover the choices and restate the relationship in your own words. Only then pick the choice that matches.`,
    estimated_video_length_seconds: 420,
  },
  "ma-00": {
    topic_cluster: "Algebra — Linear Equations",
    textbook_content: `A linear equation in one variable has the form
$$ax + b = c$$

To solve, isolate $x$ by undoing each operation in reverse order.

**Worked example.** Solve $3x + 7 = 22$.

1. Subtract 7 from both sides: $3x = 15$.
2. Divide both sides by 3: $x = 5$.

**Common traps:**
- Distributing incorrectly when parentheses are involved. $-2(x - 4) = -2x + 8$, not $-2x - 8$.
- Dropping a negative sign when moving a term across the equals sign.
- Forgetting to apply an operation to *both* sides.

On the SAT, check your answer by plugging it back into the original equation — a 5-second sanity check that catches most sign errors.`,
    desmos_strategy: `**Desmos shortcut for single-variable linear equations.** Type the whole equation into a single Desmos line — for example, \`3x + 7 = 22\`. Desmos will plot a vertical line at the solution; read off the x-value. Faster than solving by hand when you only need the numeric answer.`,
    estimated_video_length_seconds: 300,
  },
  "ma-17": {
    topic_cluster: "Advanced Math — Quadratics",
    textbook_content: `A quadratic equation has the form
$$ax^2 + bx + c = 0$$

**Factoring** looks for two numbers that multiply to $ac$ and add to $b$. When those numbers exist, the quadratic factors as
$$(x + p)(x + q) = 0$$

which gives roots $x = -p$ and $x = -q$ by the zero-product property.

**Worked example.** Factor $x^2 + 5x + 6 = 0$.
Two numbers multiplying to 6 and summing to 5 are 2 and 3. So
$$(x + 2)(x + 3) = 0 \\implies x = -2 \\text{ or } x = -3$$

**When factoring fails,** use the quadratic formula (covered in the next node).`,
    desmos_strategy: `**Desmos shortcut for quadratic roots.** Enter the full quadratic into Desmos as an equation with $y$, e.g. \`y = x^2 + 5x + 6\`. Click the x-intercepts on the graph — Desmos shows the exact roots in the sidebar. Use this to verify factoring on any SAT quadratic in under 10 seconds.`,
    estimated_video_length_seconds: 480,
  },
  "ma-34": {
    topic_cluster: "Geometry — Trigonometry",
    textbook_content: `In any right triangle, for angle $\\theta$:

$$\\sin(\\theta) = \\frac{\\text{opposite}}{\\text{hypotenuse}}$$

$$\\cos(\\theta) = \\frac{\\text{adjacent}}{\\text{hypotenuse}}$$

$$\\tan(\\theta) = \\frac{\\text{opposite}}{\\text{adjacent}}$$

Mnemonic: **SOH-CAH-TOA**.

**Worked example.** In a right triangle, the leg adjacent to a 30° angle is 6. Find the hypotenuse.

Use $\\cos(30°) = \\frac{6}{h}$, so $h = \\frac{6}{\\cos 30°} = \\frac{6}{\\sqrt{3}/2} = 4\\sqrt{3}$.`,
    desmos_strategy: `**Desmos shortcut for right-triangle trig.** Desmos is in radians by default — switch to degree mode from the wrench icon. Then just type \`sin(30)\` or \`cos(60)\` directly; Desmos evaluates and shows the decimal, which you can compare to the SAT answer choices.`,
    estimated_video_length_seconds: 540,
  },
};

// ── Assemble final node arrays ───────────────────────────────

function applyContent(raw: Omit<RawNode, "subject">, subject: Subject, pos: [number, number]): CurriculumNode {
  const override = NODE_CONTENT[raw.id] ?? {};
  return {
    ...raw,
    subject,
    x: pos[0],
    y: pos[1],
    topic_cluster: override.topic_cluster ?? raw.topic_cluster ?? defaultCluster(raw.tier, subject),
    textbook_content:
      override.textbook_content ??
      `A full lesson for **${raw.topic}** is coming soon.\n\n${raw.description}\n\nThis section will include worked examples, formulas, and common SAT traps once the content team fills it in via the /admin/curriculum tool.`,
    desmos_strategy: subject === "math" ? (override.desmos_strategy ?? undefined) : undefined,
    video_url: override.video_url ?? null,
    estimated_video_length_seconds: override.estimated_video_length_seconds ?? 360,
  };
}

export const RW_NODES: CurriculumNode[] = rwRaw.map((raw, i) =>
  applyContent(raw, "reading", rwPos[i])
);

export const MATH_NODES: CurriculumNode[] = maRaw.map((raw, i) =>
  applyContent(raw, "math", mathPos[i])
);

// ── Helper functions ─────────────────────────────────────────

export function getNodes(subject: Subject): CurriculumNode[] {
  return subject === "reading" ? RW_NODES : MATH_NODES;
}

export function getNode(subject: Subject, nodeId: string): CurriculumNode | undefined {
  return getNodes(subject).find((n) => n.id === nodeId);
}

/** All prerequisite edges as (from, to) pairs — used to draw constellation lines */
export function getEdges(subject: Subject): { from: string; to: string }[] {
  return getNodes(subject).flatMap((n) =>
    n.prereqIds.map((fromId) => ({ from: fromId, to: n.id }))
  );
}

/** Nodes unlocked by completing the given node */
export function getUnlockedBy(subject: Subject, nodeId: string): CurriculumNode[] {
  return getNodes(subject).filter((n) => n.prereqIds.includes(nodeId));
}

/** First node to unlock when starting a subject for the first time */
export function getStartNode(subject: Subject): CurriculumNode {
  return getNodes(subject)[0]; // rw-00 or ma-00
}

export const TIER_LABELS: Record<Tier, string> = {
  1: "Foundations",
  2: "Core",
  3: "Advanced",
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  reading: "Reading & Writing",
  math: "Math",
};

export const SUBJECT_COLORS: Record<Subject, { hex: string; glow: string; dim: string }> = {
  reading: { hex: "#EC4899", glow: "#ec489980", dim: "#ec489930" },  // magenta-pink
  math:    { hex: "#38BDF8", glow: "#38bdf880", dim: "#38bdf830" },  // sky cyan
};

// ── Atmospheric tier naming ──────────────────────────────────
// The student-facing UI (and cinematic) uses these names instead of
// the developer-facing "Tier 1/2/3". Troposphere is where a new student
// begins; the Kármán Line is the final ascent when Tier 3 is mastered.

export type AtmosphereTier = "Troposphere" | "Mesosphere" | "Stratosphere" | "Kármán Line";

/** Atmosphere a student is currently climbing *through* given completed-tier count. */
export function currentAtmosphere(masteredTiers: number): AtmosphereTier {
  if (masteredTiers >= 3) return "Kármán Line";
  if (masteredTiers === 2) return "Stratosphere";
  if (masteredTiers === 1) return "Mesosphere";
  return "Troposphere";
}

/** The atmosphere a student ascends *to* after completing `tier`. */
export function ascendsTo(tier: Tier): AtmosphereTier {
  if (tier === 1) return "Mesosphere";
  if (tier === 2) return "Stratosphere";
  return "Kármán Line";
}

/** The atmosphere a node belongs to (based on its curriculum tier). */
export function nodeAtmosphere(tier: Tier): AtmosphereTier {
  if (tier === 1) return "Troposphere";
  if (tier === 2) return "Mesosphere";
  return "Stratosphere";
}

export const ATMOSPHERE_CONTEXT: Record<AtmosphereTier, string> = {
  "Troposphere":   "The ground level. Build your foundation here.",
  "Mesosphere":    "The foundations are behind you. The real challenge begins here.",
  "Stratosphere":  "You are among the top students. Push further.",
  "Kármán Line":   "You have reached the edge of the atmosphere. Mastery awaits.",
};

export const ATMOSPHERE_COLORS: Record<AtmosphereTier, { hex: string; glow: string }> = {
  "Troposphere":  { hex: "#38bdf8", glow: "#38bdf860" },  // sky
  "Mesosphere":   { hex: "#a78bfa", glow: "#a78bfa60" },  // violet
  "Stratosphere": { hex: "#fbbf24", glow: "#fbbf2460" },  // gold
  "Kármán Line":  { hex: "#f472b6", glow: "#f472b660" },  // pink
};

// ── Navigation helpers ───────────────────────────────────────

/**
 * Recommend the next node a student should tackle after finishing `nodeId`.
 * Priority:
 *   1. Next available/in-progress/partially-complete node in the same topic_cluster.
 *   2. First available node in the same tier.
 *   3. First available node in the subject overall.
 */
export function recommendedNextNode(
  subject: Subject,
  nodeId: string,
  statusMap: Map<string, NodeStatus>
): CurriculumNode | null {
  const nodes = getNodes(subject);
  const current = nodes.find((n) => n.id === nodeId);
  if (!current) return null;

  const isOpen = (n: CurriculumNode) => {
    const s = statusMap.get(n.id);
    return s === "available" || s === "in_progress" || s === "partially_complete";
  };

  // Same topic cluster
  const sameCluster = nodes.find(
    (n) => n.id !== nodeId && n.topic_cluster === current.topic_cluster && isOpen(n)
  );
  if (sameCluster) return sameCluster;

  // Same tier
  const sameTier = nodes.find((n) => n.id !== nodeId && n.tier === current.tier && isOpen(n));
  if (sameTier) return sameTier;

  // Any open
  const anyOpen = nodes.find((n) => n.id !== nodeId && isOpen(n));
  return anyOpen ?? null;
}

/** Group nodes for the admin browser: subject → tier → topic_cluster → nodes */
export function groupNodesForAdmin(): Record<Subject, Record<Tier, Record<string, CurriculumNode[]>>> {
  const result: Record<Subject, Record<Tier, Record<string, CurriculumNode[]>>> = {
    reading: { 1: {}, 2: {}, 3: {} },
    math:    { 1: {}, 2: {}, 3: {} },
  };
  for (const n of [...RW_NODES, ...MATH_NODES]) {
    const cluster = n.topic_cluster;
    const tier = n.tier as Tier;
    const subj = n.subject;
    if (!result[subj][tier][cluster]) result[subj][tier][cluster] = [];
    result[subj][tier][cluster].push(n);
  }
  return result;
}
