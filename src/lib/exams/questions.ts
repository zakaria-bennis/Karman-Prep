/*
 * Server only. An exam's questions, read by id when a module opens or is graded (no frozen copies: the
 * database has a 500 MB cap). Each one goes through the same sealed delivery check as practice
 * (buildCatalogDeliverySnapshot); a question whose seal is out of date because its explanation was being
 * rewritten tonight is still served from the row itself, because its question, choices and key are what
 * the exam needs. The answer key never leaves the server: students get `toCatalogStudentQuestion` only.
 */
import {
  buildCatalogDeliverySnapshot,
  type CatalogDeliverySnapshot,
} from "@/lib/catalog-practice/delivery-contract";
import { loadCatalogQuestionEvidence } from "@/lib/catalog-practice/supabase-store";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import { readCatalogQuestionScope } from "@/lib/question-bank/catalog-question-scope";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import { createAdminClient } from "@/lib/supabase/server";
import type { EngineItem } from "@/lib/sat-engine/params";
import type { QuizQuestionWithChoices } from "@/types/quiz";

export type ExamQuestion = {
  snapshot: CatalogDeliverySnapshot;
  /** What the scoring engine needs: skill, domain, 1-7 rating, format, learned statistics. */
  engine: EngineItem;
};

type Row = QuizQuestionWithChoices & {
  skill_id?: string | null;
  calib_difficulty?: number | null;
  calib_discrimination?: number | null;
  calib_guessing?: number | null;
  calib_answer_count?: number | null;
};

function engineItem(row: Row, snapshot: CatalogDeliverySnapshot): EngineItem {
  const calibrated =
    row.calib_difficulty != null &&
    row.calib_discrimination != null &&
    (row.calib_answer_count ?? 0) > 0
      ? {
          params: {
            a: row.calib_discrimination,
            b: row.calib_difficulty,
            c: row.calib_guessing ?? (row.answer_format === "numeric_entry" ? 0 : 0.2),
          },
          responses: row.calib_answer_count ?? 0,
        }
      : undefined;
  return {
    id: row.id,
    section: row.subject === "math" ? "math" : "reading",
    domainId: row.domain ?? "",
    skillId: snapshot.binding.catalogSkillId || row.skill_id || "",
    difficulty: row.difficulty_level ?? 4,
    format: row.answer_format === "numeric_entry" ? "student-produced" : "multiple-choice",
    family: row.id,
    ...(calibrated ? { calibrated } : {}),
  };
}

/** The same snapshot practice would build, from the row alone, when the seal is out of date. */
function snapshotFromRow(row: Row, evidence: unknown): CatalogDeliverySnapshot {
  let catalogSkillId = row.skill_id ?? "";
  try {
    catalogSkillId = readCatalogQuestionScope(evidence).skill.id;
  } catch {
    // Keep the row's own skill id.
  }
  return {
    binding: {
      questionId: row.id,
      stableQuestionId: row.id,
      catalogSkillId,
      payloadSha256: "0".repeat(64),
    },
    student: toStudentQuizQuestion(row),
    answer: {
      correctAnswer: row.correct_answer,
      numericTolerance: row.numeric_tolerance,
      reviewedNumericAnswers: row.reviewed_numeric_answers ?? null,
      answerFormat: row.answer_format,
    },
    review: {
      explanation_text: row.explanation_text,
      explanation_per_choice: row.explanation_per_choice,
      desmos_strategy: row.desmos_strategy,
    },
    evidence: {
      sourceVersion: null,
      contentSha256: "",
      studentContentSha256: "",
      pilotRowSha256: null,
      tagBindingManifestSha256: "",
    },
  };
}

/** Questions by id (any order in, a map out). Missing or archived rows are simply absent. */
export async function loadExamQuestions(
  ids: readonly string[]
): Promise<Map<string, ExamQuestion>> {
  const out = new Map<string, ExamQuestion>();
  if (!ids.length) return out;
  const db = createAdminClient();
  const rows: Row[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await db
      .from("quiz_questions")
      .select("*, answer_choices(*)")
      .in("id", ids.slice(offset, offset + 100));
    if (error) throw new Error("Exam questions could not be loaded");
    rows.push(...((data ?? []) as unknown as Row[]));
  }
  const evidence = await loadCatalogQuestionEvidence(rows.map((row) => row.id));
  for (const raw of rows) {
    const proof = evidence.get(raw.id);
    const row: Row = {
      ...raw,
      reviewed_numeric_answers:
        raw.answer_format === "numeric_entry"
          ? reviewedNumericAnswers(raw, numericAnswerSetFromEvidence(proof))
          : undefined,
    };
    let snapshot: CatalogDeliverySnapshot;
    try {
      snapshot = buildCatalogDeliverySnapshot(row, proof);
    } catch {
      console.warn(`[exams] question ${row.id} served from its row: delivery seal out of date`);
      snapshot = snapshotFromRow(row, proof);
    }
    out.set(row.id, { snapshot, engine: engineItem(row, snapshot) });
  }
  return out;
}
