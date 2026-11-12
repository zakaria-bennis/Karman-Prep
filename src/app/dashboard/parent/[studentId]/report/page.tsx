// ============================================================
// /dashboard/parent/[studentId]/report — the daily report: one
// day of work (minutes, questions, accuracy, skills and level-ups,
// homework), the predicted score and the tutor's note for the day.
// For the Cohort, Private and Pro plans (founder, 2026-11-11).
// Counts and skill names only, never questions.
// ============================================================

import type { Metadata } from "next";
import {
  Card,
  Cta,
  levelName,
  MoreLink,
  Num,
  Panel,
  Ring,
  Row,
  SectionHeader,
  TutorNote,
} from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { DayNav, NoDailyReport } from "@/components/parent/daily-parts";
import { sessionWhen } from "@/components/parent/parts";
import {
  childHasDailyReport,
  dayLabel,
  loadDailyReport,
  type ReportHomeworkItem,
} from "@/lib/parent/daily-report";
import { requireChild, requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Daily report" };
export const dynamic = "force-dynamic";

const due = (h: ReportHomeworkItem) => sessionWhen(`${h.dueOn}T12:00:00Z`, { date: true });

export default async function ParentReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const base = `/dashboard/parent/${child.id}`;
  const title = `${child.firstName}'s day`;

  if (!(await childHasDailyReport(child))) {
    return (
      <ParentShell ctx={ctx} child={child} title={title}>
        <Panel>
          <NoDailyReport childName={child.firstName} base={base} />
        </Panel>
      </ParentShell>
    );
  }

  const { day: requested } = await searchParams;
  const { report: r, today } = await loadDailyReport(ctx, child, requested);
  const name = child.firstName;
  const hw = r.homework;
  const anyHomework =
    hw.completed.length + hw.dueToday.length + hw.dueTomorrow.length + hw.pastDue.length > 0;
  const emailHref = `${base}/report/email${r.isToday ? "" : `?day=${r.day}`}`;

  const side = (
    <>
      <Card>
        <SectionHeader title="Predicted score" />
        {r.score.current !== null ? (
          <>
            <Num big>{r.score.current}</Num>
            <p className="kp-meta">
              {r.score.measuredThatDay
                ? r.score.previous !== null
                  ? `New measure this day, from ${r.score.previous}.`
                  : "From a new measure this day."
                : `From ${name}’s latest full measure.`}
            </p>
          </>
        ) : (
          <p className="kp-meta">Shows after {name}&rsquo;s first full practice test.</p>
        )}
        <MoreLink href={`${base}/progress`}>Progress and skills</MoreLink>
      </Card>
      <Card>
        <SectionHeader title="From the tutor" />
        {r.tutorNote ? (
          <TutorNote from={r.tutorNote.from ?? "Your tutor"}>{r.tutorNote.body}</TutorNote>
        ) : (
          <p className="kp-meta">No note from the tutor on this day.</p>
        )}
      </Card>
    </>
  );

  return (
    <ParentShell ctx={ctx} child={child} title={title}>
      <Panel side={side}>
        <section aria-labelledby="report-main">
          <h2 className="kp-title" id="report-main">
            {r.isToday ? `Today, ${dayLabel(r.day).split(", ")[1]}` : dayLabel(r.day)}
          </h2>
          {r.answered ? (
            <p className="kp-meta">
              <Num>{r.minutes}</Num> {r.minutes === 1 ? "minute" : "minutes"} of practice,{" "}
              <Num>{r.answered}</Num> {r.answered === 1 ? "question" : "questions"}.
            </p>
          ) : (
            <p className="kp-meta">
              {r.quiet
                ? r.isToday
                  ? `Nothing logged yet today. ${name}’s work shows here as it happens.`
                  : `A quiet day for ${name}. Rest days are part of it too.`
                : r.isToday
                  ? "No practice questions yet today."
                  : `${name} didn’t practice questions on this day.`}
            </p>
          )}
          <Cta href={emailHref}>
            {r.isToday ? "Preview today’s email" : "Preview this day’s email"}
          </Cta>
          <DayNav base={`${base}/report`} day={r.day} today={today} />
        </section>

        {r.answered > 0 && (
          <Card>
            <SectionHeader title="Practice" note={<Num>{r.answered}</Num>} />
            <div className="kp-ring-row">
              <Ring
                value={r.correct / r.answered}
                label={`Accuracy: ${r.correct} of ${r.answered} right`}
              >
                <Num>{r.accuracy}%</Num>
              </Ring>
              <span className="kp-meta">
                <Num>{r.correct}</Num> of <Num>{r.answered}</Num> right in <Num>{r.minutes}</Num>{" "}
                {r.minutes === 1 ? "minute" : "minutes"}
              </span>
            </div>
          </Card>
        )}

        {r.skills.length > 0 && (
          <Card>
            <SectionHeader title="Skills practiced" note={<Num>{r.skills.length}</Num>} />
            {r.skills.map((s) => (
              <Row
                key={s.id}
                title={s.label}
                sub={
                  s.levelUp
                    ? `Up to ${levelName(s.levelUp.to)}`
                    : s.firstTry
                      ? "First try"
                      : undefined
                }
                right={
                  <>
                    <Num>{s.correct}</Num>/<Num>{s.answered}</Num> right
                  </>
                }
              />
            ))}
          </Card>
        )}

        {anyHomework && (
          <Card tone={hw.pastDue.length ? "late" : undefined}>
            <SectionHeader title="Homework" />
            {hw.completed.map((h) => (
              <Row key={`done-${h.title}-${h.dueOn}`} title={h.title} right="Finished" />
            ))}
            {hw.dueToday.map((h) => (
              <Row
                key={`today-${h.title}`}
                title={h.title}
                right={r.isToday ? "Due today" : "Due this day"}
              />
            ))}
            {hw.dueTomorrow.map((h) => (
              <Row
                key={`next-${h.title}`}
                title={h.title}
                right={r.isToday ? "Due tomorrow" : "Due the next day"}
              />
            ))}
            {hw.pastDue.slice(0, 4).map((h) => (
              <Row
                key={`late-${h.title}-${h.dueOn}`}
                title={h.title}
                right={`Past due, ${due(h)}`}
                rightTone="late"
              />
            ))}
            {hw.pastDue.length > 4 && (
              <p className="kp-meta">
                And <Num>{hw.pastDue.length - 4}</Num> more past due.
              </p>
            )}
          </Card>
        )}
      </Panel>
    </ParentShell>
  );
}
