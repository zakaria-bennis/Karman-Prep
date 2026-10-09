import { describe, expect, it } from "vitest";
import { buildLearnDashboard } from "./dashboard";
import type { LegacyLearningRecord } from "@/lib/supabase/queries/skill-catalog";
import type { QuizAttempt } from "@/types/quiz";
import type { CatalogPracticeHistoryEntry } from "@/lib/catalog-practice/history";

const lesson = (node_id: string, status: string): LegacyLearningRecord => ({
  node_id,
  status,
  score: null,
  attempts: null,
  watch_percentage: null,
});

const quiz = (changes: Partial<QuizAttempt>): QuizAttempt => ({
  id: "00000000-0000-4000-8000-000000000010",
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
  const savedSkill: CatalogPracticeHistoryEntry = {
    id: "00000000-0000-4000-8000-000000000020",
    skillId: "rw-skill-central-ideas-and-details",
    title: "Central Ideas and Details",
    startedAt: "2026-10-09T08:00:00Z",
    completedAt: null,
    score: null,
    href: "/learn/practice/rw-skill-central-ideas-and-details?session=00000000-0000-4000-8000-000000000020",
  };
  it("finds a current skill session even when earlier lesson history is empty", () => {
    const result = buildLearnDashboard([], [], { status: "ready", sessions: [savedSkill] });
    expect(result.next).toMatchObject({
      href: savedSkill.href,
      kind: "skill",
      label: "Continue practice",
    });
    expect(result.subjects.every((s) => s.savedLessons === 0)).toBe(true);
  });
  it("keeps the more recent unfinished session across both practice lanes", () => {
    const current = { status: "ready" as const, sessions: [savedSkill] };
    expect(buildLearnDashboard([], [quiz({})], current).next?.href).toBe(savedSkill.href);
    expect(
      buildLearnDashboard([], [quiz({ started_at: "2026-10-10T08:00:00Z" })], current).next?.href
    ).toContain("/learn/earlier/math?resume=");
  });
  it("links completed skill review without inventing a wrong-answer count", () => {
    const result = buildLearnDashboard([], [], {
      status: "ready",
      sessions: [{ ...savedSkill, completedAt: "2026-10-09T08:10:00Z", score: 70 }],
    });
    expect(result.next).toBeNull();
    expect(result.review).toEqual({
      title: savedSkill.title,
      href: savedSkill.href,
      incorrect: null,
      kind: "skill",
    });
  });
  it("preserves earlier work when current skill history is unavailable", () => {
    const result = buildLearnDashboard([], [quiz({})], { status: "unavailable", sessions: [] });
    expect(result.next?.href).toContain("/learn/earlier/math?resume=");
    expect(result.skillHistoryStatus).toBe("unavailable");
  });
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
      href: "/learn/earlier/math?resume=00000000-0000-4000-8000-000000000010",
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
    expect(result.next).toMatchObject({
      href: "/learn/earlier/reading?lesson=rw-01",
      label: "Continue lesson",
    });
  });

  it("opens an available lesson in the working earlier practice experience", () => {
    const result = buildLearnDashboard([lesson("ma-00", "available")], []);
    expect(result.next).toMatchObject({
      href: "/learn/earlier/math?lesson=ma-00",
      label: "Open lesson",
    });
  });
});
