// The challenge ending's per-question results (founder, 2026-11-24): the server's answers and
// everyone's, put in the letters this student saw (answers are shuffled per student) so "B" on
// the ending is the "B" they picked.
import { CROWD_MIN_PLAYERS } from "@/lib/daily-challenge/crowd";
import { shuffleQuestion, toDisplay } from "@/lib/quiz/shuffle";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import type { ChallengeResult } from "@/app/learn/play-actions";
import type { ChallengeResultView } from "./end-view";

/** At most this many typed answers are listed. */
const TYPED_SHOWN = 4;

export function challengeResultViews(
  results: ChallengeResult[],
  questions: StudentQuizQuestion[],
  reviews: Record<string, StudentQuizReview>,
  seed: string
): ChallengeResultView[] {
  return results.map((r) => {
    const q = questions.find((x) => x.id === r.questionId);
    const correct = reviews[r.questionId]?.correct_answer ?? null;
    const subject = r.subject === "math" ? "Math" : "Reading and Writing";
    const view: ChallengeResultView = { subject, ok: r.ok, seconds: r.seconds, crowd: null };
    if (!r.crowd || r.crowd.players < CROWD_MIN_PLAYERS) return view;
    const share = new Map(r.crowd.picks.map((p) => [p.answer, p.percent]));
    const picks =
      q?.answer_format === "multiple_choice"
        ? (() => {
            const map = shuffleQuestion(q, seed).map;
            return q.answer_choices
              .map((c) => ({
                label: toDisplay(map, c.letter),
                percent: share.get(c.letter) ?? 0,
                right: c.letter === correct,
                mine: c.letter === r.answer,
              }))
              .sort((a, b) => a.label.localeCompare(b.label));
          })()
        : r.crowd.picks.slice(0, TYPED_SHOWN).map((p) => ({
            label: p.answer,
            percent: p.percent,
            right: p.right,
            mine: p.answer === r.answer,
          }));
    return {
      ...view,
      crowd: {
        rightPercent: r.crowd.rightPercent,
        averageSeconds: r.crowd.averageSeconds,
        picks,
      },
    };
  });
}
