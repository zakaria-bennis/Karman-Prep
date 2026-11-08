/*
 * A Library course page in Khan's side-list layout, redrawn as Karman (founder, 2026-11-08):
 * Domains on the left, the open Domain on the right. The course leads with its percent in a
 * ring and Up next (the biggest score gain, no reason line). Each skill is a square with its
 * level and a practice link; the Domain quiz can raise several skills at once.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  Card,
  Cta,
  MoreLink,
  Num,
  Panel,
  Ring,
  SectionHeader,
  SkillSquares,
  levelName,
} from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { courseHref } from "@/components/student-portal/library/CourseView";
import styles from "@/components/student-portal/library/library.module.css";
import { buildCourse, subjectFromSlug } from "@/lib/student/course";
import { loadStudentContext } from "@/lib/student/context";
import { canUse, upgradeFor } from "@/lib/student/plan-gate";
import { domainQuiz, practiceSet } from "@/lib/student/quiz-routes";
import { loadSkillLevels } from "@/lib/student/skill-levels-server";

export const dynamic = "force-dynamic";

const params = z.object({ course: z.enum(["math", "reading-writing"]) });
const query = z.object({ domain: z.string().max(40).optional() });

export async function generateMetadata({
  params: p,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course } = await p;
  return { title: course === "math" ? "SAT Math" : "SAT Reading and Writing" };
}

export default async function CoursePage({
  params: p,
  searchParams,
}: {
  params: Promise<{ course: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = params.safeParse(await p);
  if (!parsed.success) notFound();
  const subject = subjectFromSlug(parsed.data.course);
  if (!subject) notFound();
  const q = query.safeParse((await searchParams) ?? {});

  const ctx = await loadStudentContext();
  const course = buildCourse(subject, await loadSkillLevels(ctx.clerkId));
  const wanted = q.success ? q.data.domain : undefined;
  const open =
    course.domains.find((d) => d.id === wanted) ??
    course.domains.find((d) => d.id === course.upNext?.domainId) ??
    course.domains[0];
  const pct = Math.round(course.progress * 100);
  const quiz = domainQuiz(open.id);
  const mastery = canUse(ctx.plan, "pool:mastery");

  return (
    <StudentPortal ctx={ctx} title={course.name}>
      <Panel label={course.name}>
        <section aria-labelledby="course-head">
          <div className={styles.head}>
            <Ring value={course.progress} size={72} width={7} label={`${course.name}: ${pct}%`}>
              <Num>{pct}%</Num>
            </Ring>
            <span className={styles.headText}>
              <b id="course-head">
                <Num>{course.strong}</Num> of <Num>{course.total}</Num> skills at Understanding or
                above
              </b>
              {course.upNext && <small>Up next: {course.upNext.label}</small>}
            </span>
          </div>
          {course.upNext && (
            <Cta href={practiceSet(course.upNext.id).path}>Practice {course.upNext.label}</Cta>
          )}
        </section>
        <div className={styles.split}>
          <nav className={styles.side} aria-label={`${course.name} Domains`}>
            {course.domains.map((d) => (
              <Link
                key={d.id}
                className={styles.sideLink}
                href={courseHref(course, d.id)}
                aria-current={d.id === open.id ? "page" : undefined}
                scroll={false}
              >
                <span>{d.label}</span>
                <small>
                  <Num>{d.strong}</Num>/<Num>{d.skills.length}</Num>
                </small>
              </Link>
            ))}
          </nav>
          <Card label={open.label}>
            <SectionHeader
              title={open.label}
              note={
                <>
                  <Num>{Math.round(open.progress * 100)}%</Num>
                </>
              }
            />
            {open.skills.map((s) => (
              <div key={s.id} className={styles.skill}>
                <SkillSquares
                  skills={[{ level: s.level, name: s.label }]}
                  label={`${s.label}: ${levelName(s.level)}`}
                />
                <span>
                  <b>{s.label}</b>
                  <small>{levelName(s.level)}</small>
                </span>
                <Link className="kp-link" href={practiceSet(s.id).path}>
                  {s.level === 0 ? "Start" : "Practice"}
                </Link>
              </div>
            ))}
            {quiz.ready ? (
              <MoreLink href={quiz.path}>Domain quiz: {open.label}</MoreLink>
            ) : (
              <p className={styles.locked}>
                The Domain quiz for {open.label} isn&rsquo;t open yet. Practice sets raise one skill
                at a time.
              </p>
            )}
            {!mastery && (
              <>
                <p className={styles.locked}>
                  The hardest questions in each skill (the mastery pool) are in{" "}
                  {upgradeFor("pool:mastery").plan}.
                </p>
                <MoreLink href={upgradeFor("pool:mastery").href}>
                  See what {upgradeFor("pool:mastery").plan} adds
                </MoreLink>
              </>
            )}
          </Card>
        </div>
        <MoreLink href="/dashboard/student/library">Back to the Library</MoreLink>
      </Panel>
    </StudentPortal>
  );
}
