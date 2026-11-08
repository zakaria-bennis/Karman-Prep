/*
 * Where the student portal sends a student to answer questions. One contract between the
 * portal (Today, Homework, Library) and the quiz-flows session, which builds the Daily 10,
 * practice sets, Domain quizzes, time trials and full-length tests on the shared quiz screen.
 *
 * Every path here is stable: the portal links to it, and the quiz flows own the page. A flow
 * whose page doesn't exist yet is marked `ready: false`, and the portal shows it as an honest
 * "not open yet" line with no link, so no button leads to a missing page. When a flow lands,
 * flip its `ready` to true (and keep the path).
 */

export interface QuizRoute {
  path: string;
  ready: boolean;
}

/** The Challenge question: two hard questions a day, one Math and one Reading and Writing. */
export const CHALLENGE: QuizRoute = { path: "/learn/daily", ready: true };

/** The Daily 10. Until it lands, Today's main action opens the daily practice above. */
export const DAILY_10: QuizRoute = { path: "/learn/daily-10", ready: false };

/** A 10-question skill practice set (catalog practice; live). */
export const practiceSet = (skillId: string): QuizRoute => ({
  path: `/learn/practice/${encodeURIComponent(skillId)}`,
  ready: true,
});

/** A Domain quiz: about 12 questions that can raise several skills at once. */
export const domainQuiz = (domainId: string): QuizRoute => ({
  path: `/learn/domain/${encodeURIComponent(domainId)}`,
  ready: false,
});

/** Time trials: shorter than a full test, at real SAT pace. */
export const TIME_TRIAL: QuizRoute = { path: "/learn/time-trial", ready: false };

/** Full-length tests (the assembler builds four forms). */
export const fullLengthTest = (form: number): QuizRoute => ({
  path: `/learn/test/${form}`,
  ready: false,
});

/** Endless mode lives in the Library: untimed, adaptive, with the mistake log inside. */
export const ENDLESS = { path: "/dashboard/student/library/endless", ready: true } as const;
