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
};

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

export function createCatalogPracticeService(deps: CatalogPracticeDependencies) {
  async function admittedSnapshots(
    skillId: string,
    minimumDifficulty: number,
    maximumDifficulty: number
  ) {
    const pool = await deps.fetchPool({ skillId, minimumDifficulty, maximumDifficulty });
    const evidence = await deps.loadEvidence(pool.map((question) => question.id));
    const snapshots = pool.map((question) =>
      buildCatalogDeliverySnapshot(question, evidence.get(question.id))
    );
    if (snapshots.some((item) => item.binding.catalogSkillId !== skillId)) {
      throw new Error("Reviewed question is outside requested skill");
    }
    if (new Set(snapshots.map((item) => item.binding.questionId)).size !== snapshots.length) {
      throw new Error("Duplicate question in approved pool");
    }
    if (new Set(snapshots.map((item) => item.binding.stableQuestionId)).size !== snapshots.length) {
      throw new Error("Duplicate canonical question exposure");
    }
    return snapshots;
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
      if (!item) throw new Error("Saved question is no longer available");
      requireMatchingBinding(item, saved.binding);
    }
    if (!session.snapshots.length || session.responses.length > session.snapshots.length) {
      throw new Error("Saved practice session is invalid");
    }
    return session;
  }

  return {
    async start(raw: StartCatalogPracticeInput, studentId: string) {
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
      const selected = assignment
        ? assignment.items.map((binding) => {
            const item = byId.get(binding.questionId);
            if (!item) throw new Error("Assigned question is unavailable");
            requireMatchingBinding(item, binding);
            return item;
          })
        : available.slice(0, 10);
      if (
        !selected.length ||
        new Set(selected.map((item) => item.binding.stableQuestionId)).size !== selected.length
      ) {
        throw new Error("No distinct approved questions are available");
      }
      const session = await deps.store.start({
        studentId,
        skillId: input.skillId,
        assignmentId: input.assignmentId ?? null,
        snapshots: selected,
      });
      await verifyCurrent(session);
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
    },
    async resume(sessionId: string, studentId: string) {
      const session = await deps.store.getOwned(uuid.parse(sessionId), studentId);
      if (!session) throw new Error("Practice session is unavailable");
      await verifyCurrent(session);
      return present(session);
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
      return { questionId: response.questionId, ...review(snapshot, response) };
    },
    async complete(sessionId: string, studentId: string) {
      const session = await deps.store.getOwned(uuid.parse(sessionId), studentId);
      if (!session) throw new Error("Practice session is unavailable");
      await verifyCurrent(session);
      if (session.responses.length !== session.snapshots.length)
        throw new Error("Practice session is incomplete");
      return present(await deps.store.complete(session.id, studentId));
    },
  };
}
