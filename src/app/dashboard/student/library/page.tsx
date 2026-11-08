/*
 * The Library (founder, 2026-11-07 and 2026-11-08): where the long study sessions happen.
 * The Challenge question banner, then one course at a time behind a Math / Reading and Writing
 * switch: what to practice next, then its Domains opening in place. Practice modes and
 * full-length tests sit beside it. Khan's function, Karman's look.
 */
import type { Metadata } from "next";
import { z } from "zod";
import { Card, Legend, MoreLink, Num, Panel, Row, SectionHeader } from "@/components/portal";
import { SKILL_LEVELS } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import ChallengeBanner from "@/components/student-portal/library/ChallengeBanner";
import CourseView, { CourseSwitch } from "@/components/student-portal/library/CourseView";
import styles from "@/components/student-portal/library/library.module.css";
import { buildCourse } from "@/lib/student/course";
import { loadStudentContext } from "@/lib/student/context";
import { questionsLeft, upgradeFor } from "@/lib/student/plan-gate";
import { CHALLENGE, ENDLESS, TIME_TRIAL, fullLengthTest } from "@/lib/student/quiz-routes";
import {
  loadSkillAnswers,
  loadStoredLevels,
  levelsBySkill,
  withStored,
} from "@/lib/student/skill-levels-server";
import { dayKey } from "@/lib/student/streak";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

/** Four full-length forms (the assembler's limit across forms). */
const FORMS = [1, 2, 3, 4];

const query = z.object({ subject: z.enum(["math", "reading-writing"]).optional() });

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = query.safeParse((await searchParams) ?? {});
  const ctx = await loadStudentContext();
  const [answers, stored] = await Promise.all([
    loadSkillAnswers(ctx.clerkId),
    loadStoredLevels(ctx.clerkId),
  ]);
  const levels = withStored(levelsBySkill(answers), stored);
  const math = buildCourse("math", levels);
  const reading = buildCourse("reading", levels);
  /* Without a pick, open the course that is further behind. */
  const picked = q.success ? q.data.subject : undefined;
  const open = picked
    ? picked === "math"
      ? math
      : reading
    : math.progress <= reading.progress
      ? math
      : reading;
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
      <Panel
        banner={<ChallengeBanner href={CHALLENGE.path} today={dayKey(Date.now())} />}
        side={side}
      >
        <CourseSwitch courses={[math, reading]} open={open.slug} />
        <CourseView course={open} />
      </Panel>
    </StudentPortal>
  );
}
