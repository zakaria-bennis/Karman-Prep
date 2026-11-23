/*
 * How a generated question is stored, as ordinary bank rows, so every student lane admits it
 * the same way as a real question (fetchCatalogQuestionPool, the assembler, Daily 10):
 *
 * - quiz_questions: origin = 'generated', generator = { kind, template, seed, batch, checks },
 *   is_live, publish_status 'publish_ready', pool 'practice' (never an exam pool; a database
 *   check refuses a generated row in any other pool), skill_id = its catalog skill.
 * - answer_choices: four rows for multiple choice, none for a typed answer.
 * - answer_key_entries: one evidence row the pool gate reads (readCatalogQuestionScope): the
 *   catalog tag, hashes of the content, the generator's skill record, publication allowed, and
 *   question_payload_sha256, the seal of exactly what students are shown and graded on. It is
 *   computed from the rows as read back from the database (catalogQuestionPayloadHash).
 * - question_skills72: the 72-skill binding, decided_by 'generator', confidence 1.
 *
 * Pure functions: the loader (scripts/generator/load.ts) does the writing.
 */
import { createHash } from "node:crypto";
import type { FigureSpec } from "@/lib/figures/engine/spec";
import { catalogQuestionPayloadHash } from "@/lib/question-bank/catalog-question-scope";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { canonicalJson, sha256Hex } from "../../../scripts/pdf-pipeline/reviewed-input-hash";
import type { MathItem } from "./math/core/types";
import { placementFor, type Placement } from "./placement";

export const GENERATED_SCHEMA = "KARMAN_GENERATED_V1";

export type GeneratorKind = "math-template" | "rw-helper";

/** One generated question in the form the loader stores, Math or Reading and Writing. */
export interface StorableQuestion {
  /** gen:<template>:<seed> for Math; rw:<batch>:<n> for Reading and Writing. Unique forever. */
  stableId: string;
  kind: GeneratorKind;
  skill72: string;
  template: string;
  seed: number | string;
  format: "mc" | "spr";
  /** The full question text as students see it (passage and question, as the bank stores them). */
  questionText: string;
  figure: FigureSpec | null;
  choices: { letter: "A" | "B" | "C" | "D"; text: string; correct: boolean }[];
  /** mc: the right letter; spr: the numeric key. */
  key: string;
  explanation: string;
  hint: string;
  difficulty: number;
  /** What it passed: names of checks, or a record of the helpers' verdicts. */
  checks: unknown;
}

export function stableMathId(templateId: string, seed: number): string {
  return `gen:${templateId}:${seed}`;
}

export function fromMathItem(item: MathItem): StorableQuestion {
  return {
    stableId: stableMathId(item.templateId, item.seed),
    kind: "math-template",
    skill72: item.skill,
    template: item.templateId,
    seed: item.seed,
    format: item.format,
    questionText: item.stem,
    figure: item.figure,
    choices: item.choices,
    key: item.key,
    explanation: item.explanation,
    hint: item.hint,
    difficulty: item.difficulty,
    checks: item.checks,
  };
}

const LEVELS = [
  "foundational",
  "foundational",
  "intermediate",
  "intermediate",
  "advanced",
  "advanced",
  "mastery",
] as const;

/** quiz_questions.difficulty from the 1 to 7 level, as the bank pairs them. */
export function difficultyBand(level: number): (typeof LEVELS)[number] {
  return LEVELS[Math.min(7, Math.max(1, level)) - 1];
}

const sha = (value: unknown) => sha256Hex(canonicalJson(JSON.parse(JSON.stringify(value))));

/** Hash of a batch's bindings, stored with every question of it as the tag manifest. */
export function batchManifestSha(batch: string, questions: readonly StorableQuestion[]): string {
  const rows = questions
    .map((q) => [q.stableId, placementFor(q.skill72).catalogSkillId, q.skill72])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return sha({ batch, schema: GENERATED_SCHEMA, rows });
}

export interface Rows {
  question: Record<string, unknown>;
  choices: Record<string, unknown>[];
  binding: Record<string, unknown>;
}

/** The quiz_questions, answer_choices and question_skills72 rows for one question. */
export function rowsFor(
  q: StorableQuestion,
  batch: string,
  ids: { question: string; choices: string[] }
): Rows {
  const place = placementFor(q.skill72);
  const isMath = place.subject === "math";
  const question: Record<string, unknown> = {
    id: ids.question,
    question_text: q.questionText,
    raw_question_text: q.questionText,
    question_type: isMath ? "math_computation" : "evidence_based",
    difficulty: difficultyBand(q.difficulty),
    difficulty_level: q.difficulty,
    difficulty_source: "editorial_rubric",
    difficulty_editorial: q.difficulty,
    difficulty_rubric_version: `generator/${q.kind}/1`,
    answer_format: q.format === "mc" ? "multiple_choice" : "numeric_entry",
    correct_answer: q.key,
    numeric_tolerance: null,
    explanation_text: q.explanation,
    explanation_per_choice: null,
    hint: q.hint,
    desmos_strategy: null,
    subject: place.subject,
    domain: place.domainId,
    topic_cluster: place.topicCluster,
    skill_id: place.catalogSkillId,
    variant_group_id: q.template,
    figure_spec: q.figure,
    figure_kind: q.figure?.type === "table" ? "table" : null,
    import_status: "ok",
    publish_status: "publish_ready",
    pool: "practice",
    origin: "generated",
    generator: {
      kind: q.kind,
      template: q.template,
      seed: q.seed,
      batch,
      checks: q.checks,
      skill72: q.skill72,
      stable_id: q.stableId,
    },
  };
  const choices = q.choices.map((c, i) => ({
    id: ids.choices[i],
    question_id: ids.question,
    letter: c.letter,
    choice_text: c.text,
    raw_choice_text: c.text,
    is_correct: c.correct,
  }));
  const binding = {
    question_id: ids.question,
    skill_id: q.skill72,
    confidence: 1,
    decided_by: "generator",
    reason: `Made by the ${q.kind} item model ${q.template} for this skill.`,
    run: batch,
  };
  return { question, choices, binding };
}

/** Hashes of the generated package (everything) and of what a student sees. */
export function contentHashes(q: StorableQuestion): { content: string; student: string } {
  return {
    content: sha({ schema: GENERATED_SCHEMA, ...q }),
    student: sha({
      questionText: q.questionText,
      figure: q.figure,
      choices: q.choices.map((c) => ({ letter: c.letter, text: c.text })),
      format: q.format,
    }),
  };
}

/** The seal of a stored question, from its rows as read back from the database. */
export function sealOf(row: QuizQuestionWithChoices): string {
  return catalogQuestionPayloadHash(row);
}

/** The answer_key_entries evidence for one stored question (raw_model_response). */
export function evidenceFor(
  q: StorableQuestion,
  batch: string,
  manifestSha: string,
  seal: string
): Record<string, unknown> {
  const place: Placement = placementFor(q.skill72);
  const hashes = contentHashes(q);
  const record = {
    skill: place.skillLabel,
    domain: place.domainLabel,
    level: q.difficulty,
    reason: `Made by the item model ${q.template} for the skill "${place.skill72Name}".`,
  };
  return {
    schema: GENERATED_SCHEMA,
    origin: "generated",
    stable_question_id: q.stableId,
    approved_tags: {
      schema_version: 1,
      stable_question_id: q.stableId,
      catalog_skill_id: place.catalogSkillId,
      catalog_domain_id: place.domainId,
      domain_label: place.domainLabel,
      skill_label: place.skillLabel,
      tag_binding_manifest_sha256: manifestSha,
      content_sha256: hashes.content,
      student_content_sha256: hashes.student,
      question_payload_sha256: seal,
    },
    B_package_sha256: hashes.content,
    B_student_sha256: hashes.student,
    independent_D_record: record,
    independent_D_review_sha256: sha({ record, checks: q.checks, stable_id: q.stableId }),
    student_publication_allowed: true,
    generator: { kind: q.kind, template: q.template, seed: q.seed, batch, skill72: q.skill72 },
  };
}

/** A short fingerprint of what students see, for finding duplicates across batches. */
export function fingerprint(q: Pick<StorableQuestion, "questionText" | "choices">): string {
  const text = [q.questionText, ...q.choices.map((c) => c.text).sort()]
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}
