/*
 * Where the student portal sends a student to answer questions. One contract between the
 * portal (Today, Homework, Library) and the quiz-flows session, which builds the Daily 10,
 * practice sets, Domain quizzes, time trials and full-length tests on the shared quiz screen.
 *
 * Every path here is stable: the portal links to it, and the quiz flows own the page. A flow
 * whose page doesn't exist yet is marked `ready: false`, and the portal shows it as an honest
 * "not open yet" line with no link, so no button leads to a missing page. When a flow lands,
 * flip its `ready` to true (and keep the path).
 *
 * The quiz-flows session (branch claude/overnight-quiz-7856ae, merging into claude/overnight-ship)
 * built the Daily 10, practice sets, Domain quizzes and full-length tests at the paths below.
 * Time trials are not built yet.
 */

export interface QuizRoute {
  path: string;
  ready: boolean;
}

/** The Challenge question: two hard questions a day, one Math and one Reading and Writing. */
export const CHALLENGE: QuizRoute = { path: "/learn/daily", ready: true };

/** The Daily 10: Today's main button until it's done for the day (founder, 2026-11-08). */
export const DAILY_10: QuizRoute = { path: "/learn/daily-ten", ready: true };

/** A 10-question practice set, adaptive within the set, that moves the skill's level. */
export const practiceSet = (skillId: string): QuizRoute => ({
  path: `/learn/set/${encodeURIComponent(skillId)}`,
  ready: true,
});

/** A Domain quiz: about 12 questions that can raise several skills at once. */
export const domainQuiz = (domainId: string): QuizRoute => ({
  path: `/learn/domain/${encodeURIComponent(domainId)}`,
  ready: true,
});

/** Time trials: shorter than a full test, at real SAT pace. */
export const TIME_TRIAL: QuizRoute = { path: "/learn/time-trial", ready: false };

/** Full-length tests (the assembler builds four forms). */
export const fullLengthTest = (form: number): QuizRoute => ({
  path: `/learn/test/${form}`,
  ready: true,
});

/** Endless mode lives in the Library: untimed, adaptive, with the mistake log inside. */
export const ENDLESS = { path: "/dashboard/student/library/endless", ready: true } as const;
