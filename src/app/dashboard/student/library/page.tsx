/*
 * The Library (founder, 2026-11-07 and 2026-11-08): where the long study sessions happen.
 * The Challenge question opens full screen first (once a day, until it's done). Then the box is
 * closed and two paintings, Math and Reading and Writing, meet on a diagonal across the screen.
 * Choosing one opens the box out of it, with the small course toggle at its top left. Each course
 * shows what to practice next, then its Domains opening in place. Practice modes and full-length
 * tests sit beside it. Khan's function, Karman's look.
 */
import type { Metadata } from "next";
import { z } from "zod";
import { Card, Legend, MoreLink, Num, Row, SectionHeader } from "@/components/portal";
import { SKILL_LEVELS } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import ChallengeMoment from "@/components/student-portal/library/ChallengeMoment";
import CourseView from "@/components/student-portal/library/CourseView";
import { INTROS } from "@/components/student-portal/library/intros/registry";
import LibraryStage from "@/components/student-portal/library/LibraryStage";
import styles from "@/components/student-portal/library/library.module.css";
import { buildCourse } from "@/lib/student/course";
import { subSkillQuestionCount } from "@/lib/subskills/map";
import { loadStudentContext } from "@/lib/student/context";
import { questionsLeft, upgradeFor } from "@/lib/student/plan-gate";
import { CHALLENGE, ENDLESS, TIME_TRIAL, fullLengthTest } from "@/lib/student/quiz-routes";
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

/** Four full-length forms (the assembler's limit across forms). */
const FORMS = [1, 2, 3, 4];

const query = z.object({
  subject: z.enum(["math", "reading-writing"]).optional(),
  intro: z.coerce.number().int().min(1).max(10).optional(),
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
  /* `?intro=N` plays one of the opening animations, for comparing them. */
  const intro = q.success ? (INTROS.find((d) => d.id === q.data.intro) ?? null) : null;
  const left = questionsLeft(ctx.plan, {
    questionsAnswered: answers.length,
    fullLengthTestsCompleted: 0,
  });
  const testLimit = ctx.plan.entitlements.fullLengthTestLimit;

  const side = (
    <>
      <Card label="Practice">
        <SectionHeader title="Practice" />
        <Row
          title="Challenge question"
          sub={
            challengeAnswered >= 2
              ? "Both answered today. See how everyone did"
              : "Two hard questions today, the same for everyone"
          }
          href={CHALLENGE.path}
          right={challengeAnswered >= 2 ? "Done" : challengeAnswered === 1 ? "1 of 2" : "Start"}
        />
        <Row
          title="Endless mode"
          sub="Untimed, adapts as you go, with your mistake log"
          href={ENDLESS.path}
          right="Start"
        />
        {TIME_TRIAL.ready ? (
          <Row
            title="Time trials"
            sub="Shorter than a full test, at real SAT pace"
            href={TIME_TRIAL.path}
            right="Start"
          />
        ) : (
          <Row
            title="Time trials"
            sub="Shorter than a full test, at real SAT pace"
            right={<span className={styles.soon}>Not open yet</span>}
          />
        )}
        {left !== null && (
          <p className={styles.locked}>
            <Num>{left}</Num> of <Num>{ctx.plan.entitlements.questionLimit}</Num> free questions
            left.{" "}
          </p>
        )}
        {left !== null && (
          <MoreLink href={upgradeFor("question:new").href}>
            Keep practicing with {upgradeFor("question:new").plan}
          </MoreLink>
        )}
      </Card>
      <Card label="Full-length tests">
        <SectionHeader
          title="Full-length tests"
          note={testLimit !== null ? `${testLimit} free` : undefined}
        />
        {FORMS.map((n) => {
          const route = fullLengthTest(n);
          const locked = testLimit !== null && n > testLimit;
          return (
            <Row
              key={n}
              title={`Full-length test ${n}`}
              sub="98 questions, 2 hr 14 min"
              href={route.ready && !locked ? route.path : undefined}
              right={
                locked ? (
                  <span className={styles.soon}>
                    {upgradeFor("full-length-test:new").plan} plan
                  </span>
                ) : route.ready ? (
                  "Start"
                ) : (
                  <span className={styles.soon}>Not open yet</span>
                )
              }
            />
          );
        })}
        {testLimit !== null && (
          <MoreLink href={upgradeFor("full-length-test:new").href}>
            Every test comes with {upgradeFor("full-length-test:new").plan}
          </MoreLink>
        )}
      </Card>
      <Card label="Skill levels">
        <SectionHeader title="Skill levels" />
        <Legend
          items={[...SKILL_LEVELS].reverse().map((l) => ({
            label: l.name,
            color: l.color ?? "color-mix(in srgb, var(--ink) 14%, transparent)",
          }))}
        />
        <p className="kp-meta">
          A run of right answers in a row moves a skill up: <Num>3</Num> to Learning, <Num>4</Num>{" "}
          to Understanding, <Num>5</Num> to Conquered. Answers with a hint don&rsquo;t count toward
          the run.
        </p>
      </Card>
    </>
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
        waitForChallenge={challengeAnswered < 2}
        intro={intro}
      />
      <ChallengeMoment href={CHALLENGE.path} day={challengeDay} answered={challengeAnswered} />
    </StudentPortal>
  );
}
