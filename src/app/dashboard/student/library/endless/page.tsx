/*
 * Endless mode: untimed, adaptive practice that keeps going, with the mistake log inside
 * (founder, 2026-11-07). Each round is a 10-question practice set on the skill the rule in
 * `src/lib/student/endless.ts` picks; each mistake-log row opens a new adaptive set on that skill.
 */
import type { Metadata } from "next";
import { Card, Cta, MoreLink, Num, Panel, Row, SectionHeader } from "@/components/portal";
import { subSkillQuestionCount } from "@/lib/subskills/map";
import { subSkillTitle } from "@/lib/subskills/taxonomy";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { buildCourse } from "@/lib/student/course";
import { loadStudentContext } from "@/lib/student/context";
import { mistakeLog, nextEndlessSkill } from "@/lib/student/endless";
import { practiceSet } from "@/lib/student/quiz-routes";
import {
  loadRunAnswers,
  loadSkillAnswers,
  loadStoredLevels,
  levelsBySubSkill,
  withStored,
} from "@/lib/student/skill-levels-server";

export const metadata: Metadata = { title: "Endless mode" };
export const dynamic = "force-dynamic";

const when = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });

export default async function EndlessPage() {
  const ctx = await loadStudentContext();
  const [answers, runAnswers, stored] = await Promise.all([
    loadSkillAnswers(ctx.clerkId),
    loadRunAnswers(ctx.clerkId),
    loadStoredLevels(ctx.clerkId),
  ]);
  const everyAnswer = [...answers, ...runAnswers];
  const levels = withStored(levelsBySubSkill(everyAnswer), stored);
  const courses = [
    buildCourse("math", levels, subSkillQuestionCount),
    buildCourse("reading", levels, subSkillQuestionCount),
  ];
  // Misses from catalog practice and from the quiz flows' sets, Daily 10s and Domain quizzes,
  // by sub-skill (each sub-skill has its own practice set).
  const log = mistakeLog(everyAnswer.map((a) => ({ ...a, skillId: a.subSkillId })));
  const next = nextEndlessSkill(log, levels, courses, Date.now());
  const nextLabel = next ? subSkillTitle(next) : undefined;

  return (
    <StudentPortal ctx={ctx} title="Endless mode">
      <Panel
        side={
          <Card label="Mistake log">
            <SectionHeader
              title="Mistake log"
              note={log.length ? `${log.length} skills` : undefined}
            />
            {log.length === 0 ? (
              <p className="kp-meta">
                Questions you miss land here, so you can look at them again.
              </p>
            ) : (
              log.slice(0, 12).map((e) => (
                <Row
                  key={e.skillId}
                  title={e.label}
                  sub={
                    <>
                      <Num>{e.misses}</Num> {e.misses === 1 ? "miss" : "misses"}, last on{" "}
                      {when(e.lastMissMs)}
                    </>
                  }
                  href={practiceSet(e.skillId).path}
                  right="Practice"
                />
              ))
            )}
          </Card>
        }
      >
        <section aria-labelledby="endless-next">
          <h2 className="kp-title" id="endless-next">
            {nextLabel ?? "Pick a skill to begin"}
          </h2>
          <p className="kp-meta">
            Untimed. Each round is <Num>10</Num> questions, and the next round adapts to how it
            went.
          </p>
          {next ? (
            <Cta href={practiceSet(next).path}>Keep going</Cta>
          ) : (
            <MoreLink href="/dashboard/student/library">Choose a skill in the Library</MoreLink>
          )}
        </section>
        <Card label="How it picks">
          <SectionHeader title="How it picks" />
          <p className="kp-meta">
            Skills you missed in the last two weeks come back first. After that, it picks the skill
            that should lift your score the most.
          </p>
          <MoreLink href="/dashboard/student/library">Back to the Library</MoreLink>
        </Card>
      </Panel>
    </StudentPortal>
  );
}
