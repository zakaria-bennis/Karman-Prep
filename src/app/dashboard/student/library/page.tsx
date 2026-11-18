/*
 * The Library (founder, 2026-11-07 and 2026-11-08): where the long study sessions happen.
 * The Challenge question opens full screen first (once a day, until it's done). Then the box is
 * closed and an opening animation (`?intro=N`, intro 1 by default) lets the student choose Math or
 * Reading and Writing. Its ending opens the box over that subject's painted ground, with the
 * small course toggle at its top left. Each course
 * shows what to practice next, then its Domains opening in place. Practice modes and full-length
 * tests sit beside it. Khan's function, Karman's look.
 */
import type { Metadata } from "next";
import { z } from "zod";
import StudentPortal from "@/components/student-portal/StudentPortal";
import ChallengeMoment from "@/components/student-portal/library/ChallengeMoment";
import CourseView from "@/components/student-portal/library/CourseView";
import LibrarySide from "@/components/student-portal/library/LibrarySide";
import LibraryStage from "@/components/student-portal/library/LibraryStage";
import { buildCourse } from "@/lib/student/course";
import { subSkillQuestionCount } from "@/lib/subskills/map";
import { loadStudentContext } from "@/lib/student/context";
import { questionsLeft } from "@/lib/student/plan-gate";
import { CHALLENGE } from "@/lib/student/quiz-routes";
import {
  loadRunAnswers,
  loadSkillAnswers,
  loadStoredLevels,
  levelsBySubSkill,
  withStored,
} from "@/lib/student/skill-levels-server";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import { challengeAnsweredCount } from "@/lib/daily-ten/challenge";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

const query = z.object({
  subject: z.enum(["math", "reading-writing"]).optional(),
  /* The opening animation to play (founder, 2026-11-08: ten to compare). */
  intro: z.coerce.number().int().min(1).max(99).optional(),
});

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = query.safeParse((await searchParams) ?? {});
  const ctx = await loadStudentContext();
  const challengeDay = utcDayKey(new Date());
  const [answers, runAnswers, stored, challengeAnswered] = await Promise.all([
    loadSkillAnswers(ctx.clerkId),
    loadRunAnswers(ctx.clerkId),
    loadStoredLevels(ctx.clerkId),
    challengeAnsweredCount(ctx.clerkId, challengeDay),
  ]);
  const levels = withStored(levelsBySubSkill([...answers, ...runAnswers]), stored);
  const math = buildCourse("math", levels, subSkillQuestionCount);
  const reading = buildCourse("reading", levels, subSkillQuestionCount);
  /* A link may open the course; otherwise the student chooses from the paintings. */
  const picked = q.success ? (q.data.subject ?? null) : null;
  const left = questionsLeft(ctx.plan, {
    questionsAnswered: answers.length,
    fullLengthTestsCompleted: 0,
  });
  const testLimit = ctx.plan.entitlements.fullLengthTestLimit;

  const side = (
    <LibrarySide
      challengeAnswered={challengeAnswered}
      left={left}
      questionLimit={ctx.plan.entitlements.questionLimit}
      testLimit={testLimit}
    />
  );

  return (
    <StudentPortal ctx={ctx} title="Library">
      <LibraryStage
        courses={[math, reading].map((c) => ({
          slug: c.slug,
          name: c.name,
          progress: c.progress,
        }))}
        views={{
          math: <CourseView course={math} />,
          "reading-writing": <CourseView course={reading} />,
        }}
        side={side}
        initial={picked}
        intro={q.success ? (q.data.intro ?? null) : null}
        waitForChallenge={challengeAnswered < 2}
      />
      <ChallengeMoment href={CHALLENGE.path} day={challengeDay} answered={challengeAnswered} />
    </StudentPortal>
  );
}
