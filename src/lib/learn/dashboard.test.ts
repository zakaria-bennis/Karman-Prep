import { describe, expect, it } from "vitest";
import { buildLearnDashboard } from "./dashboard";
import type { LegacyLearningRecord } from "@/lib/supabase/queries/skill-catalog";
import type { QuizAttempt } from "@/types/quiz";

const lesson = (node_id: string, status: string): LegacyLearningRecord => ({
  node_id,
  status,
  score: null,
  attempts: null,
  watch_percentage: null,
});

const quiz = (changes: Partial<QuizAttempt>): QuizAttempt => ({
  id: "attempt-1",
  student_id: "student-1",
  node_id: "ma-00",
  attempt_number: 1,
  score: null,
  questions_answered: 0,
  questions_correct: 0,
  confidence_band: null,
  started_at: "2026-10-07T12:00:00Z",
  completed_at: null,
  adaptive_path: [],
  ...changes,
});

describe("learn dashboard from saved history", () => {
  it("offers a subject choice with no invented progress for a new student", () => {
    const result = buildLearnDashboard([], []);
    expect(result.next).toBeNull();
    expect(result.review).toBeNull();
    expect(result.subjects).toMatchObject([
      { subject: "reading", skillCount: 20, savedLessons: 0, markedMastered: 0 },
      { subject: "math", skillCount: 19, savedLessons: 0, markedMastered: 0 },
    ]);
  });

  it("resumes a real unfinished quiz before choosing an available lesson", () => {
    const result = buildLearnDashboard(
      [lesson("rw-00", "available"), lesson("rw-01", "locked")],
      [quiz({ node_id: "ma-00", questions_answered: 2 })]
    );
    expect(result.next).toMatchObject({
      href: "/learn/math/ma-00",
      label: "Continue practice",
    });
    expect(result.review).toBeNull();
    expect(result.subjects[0].savedLessons).toBe(0);
  });

  it("links a completed mistake review and counts only saved earlier lesson statuses", () => {
    const result = buildLearnDashboard(
      [
        lesson("rw-00", "mastered"),
        lesson("rw-01", "partially_complete"),
        lesson("old-id", "mastered"),
      ],
      [
        quiz({
          id: "finished",
          completed_at: "2026-10-07T12:10:00Z",
          questions_answered: 5,
          questions_correct: 3,
          score: 60,
        }),
      ]
    );
    expect(result.review).toMatchObject({
      href: "/dashboard/student/quizzes/finished",
      incorrect: 2,
    });
    expect(result.subjects[0]).toMatchObject({
      savedLessons: 2,
      markedMastered: 1,
      underway: 1,
    });
    expect(result.next).toMatchObject({ href: "/learn/reading/rw-01", label: "Continue lesson" });
  });
});
