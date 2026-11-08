/*
 * Pure helpers for runs: grading against the sealed snapshot, the student-safe view, the
 * adaptive next question of a practice set, and the result summary.
 */
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import { stableHash } from "@/lib/catalog-practice/picker";
import {
  toCatalogStudentQuestion,
  type CatalogDeliverySnapshot,
} from "@/lib/catalog-practice/delivery-contract";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import type { QuizQuestionWithChoices, StudentQuizQuestion } from "@/types/quiz";
import type { RunRecord, RunResponse, RunResult, RunReview, RunView, SkillMove } from "./run-types";

const skillLabel = new Map(CATALOG_SKILLS.map((s) => [s.id, s.label]));
export const labelForSkill = (skillId: string) => skillLabel.get(skillId) ?? "Skill";

export function gradeAgainst(answer: string, snapshot: CatalogDeliverySnapshot): boolean {
  if (!answer.trim()) return false;
  return evaluateQuizAnswer(answer, {
    ...snapshot.student,
    correct_answer: snapshot.answer.correctAnswer,
    numeric_tolerance: snapshot.answer.numericTolerance,
    reviewed_numeric_answers: snapshot.answer.reviewedNumericAnswers ?? undefined,
  } as QuizQuestionWithChoices);
}

export function reviewOf(
  snapshot: CatalogDeliverySnapshot,
  response: Pick<RunResponse, "isCorrect" | "studentAnswer" | "questionId">,
  points?: 0 | 10 | 15
): RunReview {
  return {
    questionId: response.questionId,
    ...snapshot.review,
    correct_answer: snapshot.answer.correctAnswer,
    numeric_tolerance: snapshot.answer.numericTolerance,
    isCorrect: response.isCorrect,
    studentAnswer: response.studentAnswer,
    ...(points !== undefined ? { points } : {}),
  };
}

export function snapshotMap(run: RunRecord): Map<string, CatalogDeliverySnapshot> {
  return new Map(run.snapshots.map((s) => [s.binding.questionId, s]));
}

/** The questions a section holds right now (routed or served so far). */
export function sectionQuestionIds(run: RunRecord, sectionIndex: number): string[] {
  const section = run.form.sections[sectionIndex];
  if (run.form.adaptive) return run.sequence;
  if (section.variants?.route) return section.variants[section.variants.route];
  return section.questionIds;
}

function sectionTotal(run: RunRecord, sectionIndex: number): number {
  if (run.form.adaptive) return run.form.adaptive.size;
  const s = run.form.sections[sectionIndex];
  return s.variants ? s.variants.easier.length || s.variants.harder.length : s.questionIds.length;
}

export function isSectionDone(
  run: RunRecord,
  sectionIndex: number,
  answered: ReadonlySet<string>
): boolean {
  const ids = sectionQuestionIds(run, sectionIndex);
  const total = sectionTotal(run, sectionIndex);
  return ids.length >= total && ids.every((id) => answered.has(id));
}

export function buildView(run: RunRecord, responses: readonly RunResponse[]): RunView {
  const snapshots = snapshotMap(run);
  const answered = new Set(responses.map((r) => r.questionId));
  let current: number | null = null;
  const sections = run.form.sections.map((section, index) => {
    const done = isSectionDone(run, index, answered);
    if (!done && current === null && !run.completedAt) current = index;
    const open = current === index;
    let ids = sectionQuestionIds(run, index);
    // Instant lanes reveal questions one at a time: the answered ones and the next.
    if (run.form.grading === "instant" && open) {
      const next = ids.findIndex((id) => !answered.has(id));
      ids = next === -1 ? ids : ids.slice(0, next + 1);
    }
    const visible = done || open || !!run.completedAt;
    const questions: StudentQuizQuestion[] = visible
      ? ids.flatMap((id) => {
          const snap = snapshots.get(id);
          return snap ? [toCatalogStudentQuestion(snap)] : [];
        })
      : [];
    const topics: Record<string, string> = {};
    for (const id of visible ? ids : []) {
      const snap = snapshots.get(id);
      if (snap) topics[id] = labelForSkill(snap.binding.catalogSkillId);
    }
    return {
      key: section.key,
      title: section.title,
      subject: section.subject,
      seconds: section.seconds,
      total: sectionTotal(run, index),
      breakBefore: !!section.breakBefore,
      done,
      topics,
      questions,
    };
  });
  const reviews: Record<string, RunReview> = {};
  // Timed tests keep every key and explanation back until the whole test is submitted.
  const showReviews = run.form.grading === "instant" || !!run.completedAt;
  for (const response of showReviews ? responses : []) {
    const snap = snapshots.get(response.questionId);
    if (snap) reviews[response.questionId] = reviewOf(snap, response);
  }
  return {
    id: run.id,
    kind: run.kind,
    title: run.form.title,
    scope: run.scope,
    grading: run.form.grading,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    sections,
    current: run.completedAt ? null : current,
    reviews,
    answered: responses.length,
    total: sections.reduce((n, s) => n + s.total, 0),
    result: run.result,
  };
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/**
 * The practice set's next question: up one difficulty after a right answer, down one after a
 * miss, starting from the level's difficulty. Unseen questions first; families never repeat.
 */
export function nextAdaptive(
  run: RunRecord,
  responses: readonly RunResponse[],
  history: ReadonlyMap<string, string>,
  families: ReadonlyMap<string, string>
): string | null {
  const adaptive = run.form.adaptive;
  if (!adaptive || run.sequence.length >= adaptive.size) return null;
  let target = adaptive.startDifficulty;
  for (const r of responses) target += r.isCorrect ? 1 : -1;
  target = Math.max(1, Math.min(adaptive.maxDifficulty, target));
  const served = new Set(run.sequence);
  const usedFamilies = new Set(run.sequence.map((id) => families.get(id)));
  let best: { id: string; key: number[] } | null = null;
  for (const snap of run.snapshots) {
    const id = snap.binding.questionId;
    if (served.has(id) || usedFamilies.has(families.get(id))) continue;
    const seenAt = history.get(id);
    const key = [
      Math.abs(snap.student.difficulty_level - target),
      seenAt ? 1 : 0,
      seenAt ? Date.parse(seenAt) : 0,
      stableHash(`${run.id}:${id}`),
    ];
    if (!best || lexLess(key, best.key)) best = { id, key };
  }
  return best?.id ?? null;
}

/** Right of total per section, the skills touched (most moved first), and the tokens. */
export function summarise(
  run: RunRecord,
  responses: readonly RunResponse[],
  tokens: number
): RunResult {
  const sections = run.form.sections.map((section, index) => {
    const ids = new Set(sectionQuestionIds(run, index));
    const rows = responses.filter((r) => ids.has(r.questionId));
    return {
      key: section.key,
      title: section.title,
      subject: section.subject,
      right: rows.filter((r) => r.isCorrect).length,
      total: rows.length,
    };
  });
  const bySkill = new Map<string, RunResponse[]>();
  for (const r of responses) bySkill.set(r.skillId, [...(bySkill.get(r.skillId) ?? []), r]);
  const skills: SkillMove[] = [...bySkill].map(([skillId, rows]) => {
    const first = rows.find((r) => r.levelBefore !== null);
    const last = [...rows].reverse().find((r) => r.levelAfter !== null);
    return {
      skillId,
      label: labelForSkill(skillId),
      from: first?.levelBefore ?? 0,
      to: last?.levelAfter ?? first?.levelBefore ?? 0,
      right: rows.filter((r) => r.isCorrect).length,
      total: rows.length,
    };
  });
  skills.sort((a, b) => b.to - b.from - (a.to - a.from) || b.to - a.to);
  return {
    right: responses.filter((r) => r.isCorrect).length,
    total: responses.length,
    sections,
    skills,
    tokens,
  };
}
