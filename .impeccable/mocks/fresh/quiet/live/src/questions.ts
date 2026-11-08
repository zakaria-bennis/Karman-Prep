// Maps Karman-original diagnostic questions (src/data/diagnostic-questions.ts, the only
// Karman originals in the repo; every live bank row traces to an exam PDF) into the row shape
// the quiz engine reads (QuizQuestionWithChoices). Nothing is rewritten: stems, passages,
// choices, keys and explanations are the authored text. Only shape changes:
//   - "A) ..." prefixes are stripped from choices, exactly as the diagnostic's own
//     AnswerChoiceButton does (option.replace(/^[A-D]\)\s*/, "")); the engine draws the letter.
//   - craft-4's passage, authored as "Text 1\n...\n\nText 2\n...", is split into passage_a and
//     passage_b, the engine's own cross-text fields; the engine draws the "Text 1"/"Text 2" labels.
//   - topic_cluster comes from CLUSTER_BY_DOMAIN (what the importer writes for that domain).
//   - node_id is the curriculum node whose concept_slug equals the question's conceptId.
import { DIAGNOSTIC_QUESTIONS, type DiagnosticQuestion } from "@/data/diagnostic-questions";
import { MATH_NODES, RW_NODES, type CurriculumNode } from "@/data/curriculum";
import { CLUSTER_BY_DOMAIN } from "@/lib/question-bank/taxonomy";
import { DOMAIN_SECTION } from "@/types";
import { levelToLegacyDifficulty, type QuizDifficultyLevel, type QuizQuestionWithChoices } from "@/types/quiz";
import type { MappedNode } from "@/components/learn/ConstellationMap";

/** The eight originals chosen for the site, plus one format variant (see README). */
export const CHOSEN: { id: string; note: string }[] = [
  { id: "info-2", note: "Reading and Writing, Information and Ideas: literary passage with an intro line (Wharton)." },
  { id: "craft-4", note: "Reading and Writing, Craft and Structure: cross-text pair (Text 1 / Text 2)." },
  { id: "expr-2", note: "Reading and Writing, Expression of Ideas: student notes with bullets (rhetorical synthesis)." },
  { id: "conv-2", note: "Reading and Writing, Standard English Conventions: fill-in-the-blank (its / their)." },
  { id: "alg-1", note: "Math, Algebra: one-variable linear equation, the simplest stem." },
  { id: "adv-3", note: "Math, Advanced Math: exponential growth word problem." },
  { id: "data-4", note: "Math, Problem-Solving and Data Analysis: probability with KaTeX fractions in the choices." },
  { id: "geo-5", note: "Math, Geometry and Trigonometry: sine to cosine with fractions." },
];

/** alg-1 shown through the engine's numeric-entry input. The published original is multiple
 *  choice; the stem and the answer (7) are unchanged. Kept apart from the eight. */
export const NUMERIC_VARIANT_ID = "alg-1-numeric";

const ALL_NODES: CurriculumNode[] = [...RW_NODES, ...MATH_NODES];

export function nodeFor(q: DiagnosticQuestion): MappedNode {
  const node = ALL_NODES.find((n) => n.concept_slug === q.conceptId);
  if (!node) throw new Error(`No curriculum node for conceptId ${q.conceptId}`);
  return { ...node, status: "in_progress" };
}

function subjectOf(q: DiagnosticQuestion): "reading" | "math" {
  return DOMAIN_SECTION[q.domain] === "rw" ? "reading" : "math";
}

function stripLetter(option: string): string {
  return option.replace(/^[A-D]\)\s*/, "");
}

const CROSS_TEXT = /^Text 1\n([\s\S]*?)\n\nText 2\n([\s\S]*)$/;

export function toRow(
  q: DiagnosticQuestion,
  displayOrder: number,
  variant: "multiple_choice" | "numeric_entry" = "multiple_choice"
): QuizQuestionWithChoices {
  const subject = subjectOf(q);
  const level = q.difficulty as QuizDifficultyLevel;
  const node = nodeFor(q);
  const cross = q.passage ? CROSS_TEXT.exec(q.passage) : null;
  const id = variant === "numeric_entry" ? NUMERIC_VARIANT_ID : q.id;
  const numericAnswer =
    variant === "numeric_entry"
      ? stripLetter(q.options.find((o) => o.startsWith(q.correct))!).replace(/\$/g, "")
      : null;
  return {
    id,
    node_id: node.id,
    question_text: q.text,
    question_type: subject === "math" ? "math_computation" : "evidence_based",
    difficulty: levelToLegacyDifficulty(level),
    difficulty_level: level,
    answer_format: variant,
    correct_answer: variant === "numeric_entry" ? numericAnswer! : q.correct,
    numeric_tolerance: null,
    explanation_text: q.explanation,
    explanation_per_choice: null,
    hint: null,
    image_url: null,
    image_storage_path: null,
    image_alt: null,
    subject,
    topic_cluster: CLUSTER_BY_DOMAIN[q.domain],
    desmos_strategy: null,
    display_order: displayOrder,
    created_at: "",
    updated_at: "",
    is_flagged: false,
    flag_count: 0,
    passage_intro: q.passageIntro ?? null,
    passage: cross ? null : (q.passage ?? null),
    passage_a: cross ? cross[1] : null,
    passage_b: cross ? cross[2] : null,
    domain: q.domain,
    concept_slug: q.conceptId,
    answer_source: null,
    source_pdf: null,
    source_page: null,
    question_bbox: null,
    question_bbox_confidence: null,
    question_bbox_source_asset_id: null,
    source_assets_processed_at: null,
    source_assets_processed_status: null,
    content_hash: null,
    import_status: null,
    import_flag_type: null,
    import_flag_reason: null,
    grader_votes: null,
    is_live: true,
    figure_kind: null,
    figure_table_data: null,
    figure_chart_data: null,
    figure_geometry_data: null,
    answer_choices:
      variant === "numeric_entry"
        ? []
        : q.options.map((option) => ({
            id: `${q.id}-${option.charAt(0)}`,
            question_id: q.id,
            letter: option.charAt(0) as "A" | "B" | "C" | "D",
            choice_text: stripLetter(option),
            choice_table_data: null,
            is_correct: option.charAt(0) === q.correct,
          })),
  };
}

export function findOriginal(id: string): DiagnosticQuestion {
  const base = id === NUMERIC_VARIANT_ID ? "alg-1" : id;
  const q = DIAGNOSTIC_QUESTIONS.find((d) => d.id === base);
  if (!q) throw new Error(`Unknown diagnostic question ${id}`);
  return q;
}

/** The set the engine loads for one requested question: the requested original first, then the
 *  other originals of the same subject at the same or a harder level, in authored order. The
 *  adaptive picker (src/lib/quiz-session.ts) starts at the easiest level present, so keeping the
 *  pool at or above the requested level puts the requested question first without touching any
 *  question's own data. */
export function poolFor(id: string): { node: MappedNode; questions: QuizQuestionWithChoices[] } {
  const requested = findOriginal(id);
  const subject = subjectOf(requested);
  const variant = id === NUMERIC_VARIANT_ID ? "numeric_entry" : "multiple_choice";
  // The marketing embed shows one question on its own.
  const others: DiagnosticQuestion[] = [];
  void subject;
  return {
    node: nodeFor(requested),
    questions: [toRow(requested, 0, variant), ...others.map((q, i) => toRow(q, i + 1))],
  };
}
