import { z } from "zod";
import { catalogPoolInputSchema } from "@/lib/question-bank/catalog-question-scope";
import { evaluateQuizAnswer } from "@/lib/quiz-session";
import type { QuizQuestionWithChoices, StudentQuizReview } from "@/types/quiz";
import {
  buildCatalogDeliverySnapshot,
  requireMatchingBinding,
  toCatalogStudentQuestion,
  type CatalogDeliverySnapshot,
  type CatalogQuestionBinding,
} from "./delivery-contract";
import { pickPracticeQuestions, type AnsweredQuestion } from "./picker";

const uuid = z.string().uuid();
export const startCatalogPracticeSchema = catalogPoolInputSchema.extend({
  assignmentId: uuid.optional(),
});
export type StartCatalogPracticeInput = z.input<typeof startCatalogPracticeSchema>;

export type CatalogResponse = {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  responseTimeSeconds: number;
};
export type CatalogSession = {
  id: string;
  studentId: string;
  skillId: string;
  assignmentId: string | null;
  snapshots: CatalogDeliverySnapshot[];
  responses: CatalogResponse[];
  completedAt: string | null;
  score: number | null;
};
export interface CatalogSessionStore {
  start(
    input: Omit<CatalogSession, "id" | "responses" | "completedAt" | "score">
  ): Promise<CatalogSession>;
  getOwned(sessionId: string, studentId: string): Promise<CatalogSession | null>;
  recordOnce(input: {
    sessionId: string;
    studentId: string;
    response: CatalogResponse;
  }): Promise<CatalogResponse>;
  complete(sessionId: string, studentId: string): Promise<CatalogSession>;
  /** Closes an open session without a score so a fresh one can start. No-op once closed. */
  abandon(sessionId: string, studentId: string): Promise<void>;
  /** Every saved answer this student has given in this skill, across all sessions. */
  answeredQuestions(studentId: string, skillId: string): Promise<AnsweredQuestion[]>;
}
export type CatalogPracticeDependencies = {
  fetchPool: (input: {
    skillId: string;
    minimumDifficulty: number;
    maximumDifficulty: number;
  }) => Promise<QuizQuestionWithChoices[]>;
  loadEvidence: (questionIds: string[]) => Promise<Map<string, unknown>>;
  loadOwnedAssignment?: (
    assignmentId: string,
    studentId: string
  ) => Promise<{ skillId: string; items: CatalogQuestionBinding[] }>;
  store: CatalogSessionStore;
  now?: () => Date;
  /** Awards points for a graded answer (instant modes); returns the points awarded now. */
  award?: (input: {
    key: string;
    clerkId: string;
    correct: boolean;
    difficulty: number;
    skillId: string | null;
  }) => Promise<0 | 10 | 15>;
};

/** A saved question was re-sealed or left the pool. The session can be closed and replaced. */
class StaleSessionError extends Error {}

/** One bad row is dropped from the pool with a log line; it never breaks the whole skill. */
function skipQuestion(questionId: string, reason: string) {
  console.error(`[catalog practice] skipped question ${questionId}: ${reason}`);
}

function grade(answer: string, snapshot: CatalogDeliverySnapshot): boolean {
  return evaluateQuizAnswer(answer, {
    ...snapshot.student,
    correct_answer: snapshot.answer.correctAnswer,
    numeric_tolerance: snapshot.answer.numericTolerance,
    reviewed_numeric_answers: snapshot.answer.reviewedNumericAnswers ?? undefined,
  } as QuizQuestionWithChoices);
}

function review(snapshot: CatalogDeliverySnapshot, response: CatalogResponse): StudentQuizReview {
  return {
    ...snapshot.review,
    correct_answer: snapshot.answer.correctAnswer,
    numeric_tolerance: snapshot.answer.numericTolerance,
    isCorrect: response.isCorrect,
    studentAnswer: response.studentAnswer,
  };
}

function present(session: CatalogSession) {
  const answered = session.responses.length;
  const current = session.completedAt ? null : (session.snapshots[answered] ?? null);
  return {
    id: session.id,
    skillId: session.skillId,
    assignmentId: session.assignmentId,
    completedAt: session.completedAt,
    score: session.score,
    answered,
    total: session.snapshots.length,
    question: current ? toCatalogStudentQuestion(current) : null,
    reviews: session.responses.map((response, index) => ({
      questionId: response.questionId,
      ...review(session.snapshots[index], response),
    })),
  };
}

/**
 * The eligibility check every student-facing lane shares: each question's private evidence
 * and delivered payload must agree, sit in the requested skill, and be unique by question
 * and canonical id. A row that fails is dropped with a log line; the rest of the skill stays.
 */
export function admitCatalogPool(
  skillId: string,
  pool: readonly QuizQuestionWithChoices[],
  evidence: ReadonlyMap<string, unknown>
): CatalogDeliverySnapshot[] {
  const snapshots: CatalogDeliverySnapshot[] = [];
  const questionIds = new Set<string>();
  const stableIds = new Set<string>();
  for (const question of pool) {
    let item: CatalogDeliverySnapshot;
    try {
      item = buildCatalogDeliverySnapshot(question, evidence.get(question.id));
    } catch (error) {
      skipQuestion(question.id, error instanceof Error ? error.message : String(error));
      continue;
    }
    if (item.binding.catalogSkillId !== skillId) {
      skipQuestion(question.id, "reviewed question is outside requested skill");
    } else if (questionIds.has(item.binding.questionId)) {
      skipQuestion(question.id, "duplicate question in approved pool");
    } else if (stableIds.has(item.binding.stableQuestionId)) {
      skipQuestion(question.id, "duplicate canonical question exposure");
    } else {
      questionIds.add(item.binding.questionId);
      stableIds.add(item.binding.stableQuestionId);
      snapshots.push(item);
    }
  }
  return snapshots;
}

export function createCatalogPracticeService(deps: CatalogPracticeDependencies) {
  async function admittedSnapshots(
    skillId: string,
    minimumDifficulty: number,
    maximumDifficulty: number
  ) {
    const pool = await deps.fetchPool({ skillId, minimumDifficulty, maximumDifficulty });
    return admitCatalogPool(skillId, pool, await deps.loadEvidence(pool.map((q) => q.id)));
  }

  async function verifyCurrent(session: CatalogSession) {
    if (session.assignmentId) {
      const assignment = await deps.loadOwnedAssignment?.(session.assignmentId, session.studentId);
      if (
        !assignment ||
        assignment.skillId !== session.skillId ||
        assignment.items.length !== session.snapshots.length
      )
        throw new Error("Assignment is unavailable");
      assignment.items.forEach((binding, index) =>
        requireMatchingBinding(session.snapshots[index], binding)
      );
    }
    const current = await admittedSnapshots(session.skillId, 1, 7);
    const byId = new Map(current.map((item) => [item.binding.questionId, item]));
    for (const saved of session.snapshots) {
      const item = byId.get(saved.binding.questionId);
      if (!item) throw new StaleSessionError("Saved question is no longer available");
      try {
        requireMatchingBinding(item, saved.binding);
      } catch (error) {
        throw new StaleSessionError(error instanceof Error ? error.message : String(error));
      }
    }
    if (!session.snapshots.length || session.responses.length > session.snapshots.length) {
      throw new Error("Saved practice session is invalid");
    }
    return session;
  }

  /**
   * A saved question was re-sealed or left the pool. Close the session so the student is
   * never stuck: a fully answered one is scored (each answer was graded against its sealed
   * snapshot when saved); a partial one is closed without a score.
   */
  async function closeStale(session: CatalogSession, studentId: string, reason: string) {
    console.error(`[catalog practice] closing stale session ${session.id}: ${reason}`);
    if (session.responses.length === session.snapshots.length) {
      return deps.store.complete(session.id, studentId);
    }
    await deps.store.abandon(session.id, studentId);
    return null;
  }

  async function start(raw: StartCatalogPracticeInput, studentId: string) {
    const input = startCatalogPracticeSchema.parse(raw);
    const assignment = input.assignmentId
      ? await deps.loadOwnedAssignment?.(input.assignmentId, studentId)
      : null;
    if (input.assignmentId && (!assignment || assignment.skillId !== input.skillId)) {
      throw new Error("Assignment is unavailable");
    }
    const available = await admittedSnapshots(
      input.skillId,
      input.minimumDifficulty,
      input.maximumDifficulty
    );
    const byId = new Map(available.map((item) => [item.binding.questionId, item]));
    let selected: CatalogDeliverySnapshot[];
    if (assignment) {
      selected = assignment.items.map((binding) => {
        const item = byId.get(binding.questionId);
        if (!item) throw new Error("Assigned question is unavailable");
        requireMatchingBinding(item, binding);
        return item;
      });
    } else {
      const picked = pickPracticeQuestions(
        available.map((item) => ({
          questionId: item.binding.questionId,
          difficulty: item.student.difficulty_level,
        })),
        await deps.store.answeredQuestions(studentId, input.skillId),
        { studentId, day: (deps.now?.() ?? new Date()).toISOString().slice(0, 10) }
      );
      selected = picked.map((id) => byId.get(id)!);
    }
    if (
      !selected.length ||
      new Set(selected.map((item) => item.binding.stableQuestionId)).size !== selected.length
    ) {
      throw new Error("No distinct approved questions are available");
    }
    const allocate = () =>
      deps.store.start({
        studentId,
        skillId: input.skillId,
        assignmentId: input.assignmentId ?? null,
        snapshots: selected,
      });
    // The database returns the student's existing open session when there is one.
    let session = await allocate();
    try {
      await verifyCurrent(session);
    } catch (error) {
      if (!(error instanceof StaleSessionError)) throw error;
      await closeStale(session, studentId, error.message);
      session = await verifyCurrent(await allocate());
    }
    if (
      assignment &&
      (session.assignmentId !== input.assignmentId ||
        session.snapshots.length !== selected.length ||
        session.snapshots.some((saved, index) => {
          try {
            requireMatchingBinding(saved, selected[index].binding);
            return false;
          } catch {
            return true;
          }
        }))
    )
      throw new Error("Assigned practice session differs from current assignment");
    return present(session);
  }

  /** A finished session is shown from its frozen snapshot, without re-checking today's pool. */
  function presentFinished(session: CatalogSession) {
    if (!session.snapshots.length || session.responses.length > session.snapshots.length) {
      throw new Error("Saved practice session is invalid");
    }
    return present(session);
  }

  return {
    start,
    async resume(sessionId: string, studentId: string) {
      const session = await deps.store.getOwned(uuid.parse(sessionId), studentId);
      if (!session) throw new Error("Practice session is unavailable");
      if (session.completedAt) return presentFinished(session);
      try {
        return present(await verifyCurrent(session));
      } catch (error) {
        if (!(error instanceof StaleSessionError)) throw error;
        const finished = await closeStale(session, studentId, error.message);
        if (finished) return presentFinished(finished);
      }
      // The stale session is closed; open a fresh one for the same skill and assignment.
      return start(
        { skillId: session.skillId, assignmentId: session.assignmentId ?? undefined },
        studentId
      );
    },
    async submit(
      raw: { sessionId: string; questionId: string; answer: string; responseTimeSeconds: number },
      studentId: string
    ) {
      const input = z
        .object({
          sessionId: uuid,
          questionId: uuid,
          answer: z.string().trim().min(1).max(120),
          responseTimeSeconds: z.number().int().min(0).max(86400),
        })
        .strict()
        .parse(raw);
      const session = await deps.store.getOwned(input.sessionId, studentId);
      if (!session) throw new Error("Practice session is unavailable");
      await verifyCurrent(session);
      const existing = session.responses.find(
        (response) => response.questionId === input.questionId
      );
      const next = session.snapshots[session.responses.length];
      if (!existing && (session.completedAt || next?.binding.questionId !== input.questionId)) {
        throw new Error("Question is not next in this session");
      }
      const snapshot = session.snapshots.find(
        (item) => item.binding.questionId === input.questionId
      )!;
      const response = await deps.store.recordOnce({
        sessionId: session.id,
        studentId,
        response: {
          questionId: input.questionId,
          studentAnswer: input.answer,
          isCorrect: grade(input.answer, snapshot),
          responseTimeSeconds: input.responseTimeSeconds,
        },
      });
      const points = deps.award
        ? await deps.award({
            key: `catalog:${session.id}:${response.questionId}`,
            clerkId: studentId,
            correct: response.isCorrect,
            difficulty: snapshot.student.difficulty_level,
            skillId: snapshot.binding.catalogSkillId,
          })
        : 0;
      return { questionId: response.questionId, ...review(snapshot, response), points };
    },
    async complete(sessionId: string, studentId: string) {
      const session = await deps.store.getOwned(uuid.parse(sessionId), studentId);
      if (!session) throw new Error("Practice session is unavailable");
      if (session.completedAt) return presentFinished(session);
      if (session.responses.length !== session.snapshots.length)
        throw new Error("Practice session is incomplete");
      try {
        await verifyCurrent(session);
      } catch (error) {
        // Scoring only tallies answers already graded against their sealed snapshots.
        if (!(error instanceof StaleSessionError)) throw error;
      }
      return present(await deps.store.complete(session.id, studentId));
    },
  };
}
