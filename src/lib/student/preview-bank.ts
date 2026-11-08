import "server-only";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import { toStudentQuizQuestion, toStudentQuizReview } from "@/lib/student-quiz-payload";
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import type { QuizQuestionWithChoices, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import type { PoolItem } from "./assemble";
import type { TrialSection } from "./time-trial";

/** Founder preview only. Reads published questions through the bank's publication gate
 *  (`fetchCatalogQuestionPool`) and never writes. Held questions cannot reach this lane. */
export function previewAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

type Cached = { at: number; questions: QuizQuestionWithChoices[] };
const TTL = 10 * 60_000;
const store = globalThis as unknown as { __karmanPreviewPools?: Map<string, Cached> };
const pools = (store.__karmanPreviewPools ??= new Map());

export async function skillQuestions(skillId: string): Promise<QuizQuestionWithChoices[]> {
  if (!previewAllowed()) throw new Error("Not available");
  const hit = pools.get(skillId);
  if (hit && Date.now() - hit.at < TTL) return hit.questions;
  let questions: QuizQuestionWithChoices[] = [];
  try {
    questions = await fetchCatalogQuestionPool({
      skillId,
      minimumDifficulty: 1,
      maximumDifficulty: 7,
    });
  } catch {
    // A skill whose evidence fails a check simply offers no questions in the preview.
    questions = [];
  }
  pools.set(skillId, { at: Date.now(), questions });
  return questions;
}

export async function sectionPool(section: TrialSection): Promise<PoolItem[]> {
  const skills = CATALOG_SKILLS.filter((s) => (section === "math") === (s.subject === "math"));
  const all = await Promise.all(skills.map(async (s) => ({ s, qs: await skillQuestions(s.id) })));
  return all.flatMap(({ s, qs }) =>
    qs.map((q) => ({ id: q.id, skillId: s.id, difficulty: q.difficulty_level }))
  );
}

export type DeliveredQuestion = {
  question: StudentQuizQuestion;
  skillId: string;
  difficulty: number;
};

export async function deliver(items: readonly PoolItem[]): Promise<DeliveredQuestion[]> {
  const out: DeliveredQuestion[] = [];
  for (const item of items) {
    const q = (await skillQuestions(item.skillId)).find((x) => x.id === item.id);
    if (q)
      out.push({
        question: toStudentQuizQuestion(q),
        skillId: item.skillId,
        difficulty: item.difficulty,
      });
  }
  return out;
}

export async function grade(
  skillId: string,
  questionId: string,
  answer: string
): Promise<StudentQuizReview | null> {
  const q = (await skillQuestions(skillId)).find((x) => x.id === questionId);
  if (!q) return null;
  return toStudentQuizReview(q, evaluateQuizAnswer(answer, q), answer);
}
