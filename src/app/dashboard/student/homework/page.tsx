/*
 * Homework (founder decisions 2026-11-07, prototype prototypes/today-directions, 2026-11-08):
 * work a tutor or cohort assigns, in Canvas-style lists (Past due, Tonight, Tomorrow, This week,
 * Later), with time estimates from active time. Finished work shows its result, opens the
 * review, and carries a one-line note signed David. Late work gets one gentle nudge.
 */
import type { Metadata } from "next";
import { Cta, Panel } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import {
  CaughtUpCard,
  DoneCard,
  HomeworkGroupCard,
  WeekCard,
} from "@/components/student-portal/homework/HomeworkCards";
import { loadStudentContext } from "@/lib/student/context";
import {
  dueText,
  groupHomework,
  loadStudentHomework,
  mostUrgent,
  sizeText,
  weekSummary,
} from "@/lib/student/homework";

export const metadata: Metadata = { title: "Homework" };
export const dynamic = "force-dynamic";

/** Done items shown in the side card. */
const DONE_SHOWN = 6;

export default async function StudentHomeworkPage() {
  const ctx = await loadStudentContext();
  const nowMs = Date.now();
  const { items, paceSeconds } = await loadStudentHomework(
    { userId: ctx.userId, clerkId: ctx.clerkId },
    { nowMs }
  );
  const { groups, done } = groupHomework(items, nowMs);
  const next = mostUrgent(items, nowMs);
  const week = weekSummary(items, paceSeconds, nowMs);

  const side =
    items.length > 0 ? (
      <>
        <WeekCard {...week} />
        {done.length > 0 && (
          <DoneCard
            items={done.slice(0, DONE_SHOWN)}
            total={done.length}
            paceSeconds={paceSeconds}
          />
        )}
      </>
    ) : undefined;

  let nextMeta: string | null = null;
  if (next) {
    const due = dueText(next, nowMs);
    const when = due.late
      ? due.text
      : `Due ${due.text.replace(/^(Tonight|Today|Tomorrow)/, (w) => w.toLowerCase())}`;
    nextMeta = [sizeText(next.size, paceSeconds), when].filter(Boolean).join(" · ");
  }

  return (
    <StudentPortal ctx={ctx} title="Homework">
      <Panel side={side} label="Homework">
        {next?.href && (
          <section aria-labelledby="homework-next">
            <h2 className="kp-title" id="homework-next">
              {next.title}
            </h2>
            {nextMeta && <p className="kp-meta">{nextMeta}</p>}
            <Cta href={next.href}>Start this homework</Cta>
          </section>
        )}
        {groups.map((g) => (
          <HomeworkGroupCard
            key={g.group}
            group={g.group}
            items={g.items}
            paceSeconds={paceSeconds}
            nowMs={nowMs}
          />
        ))}
        {groups.length === 0 && <CaughtUpCard anyHomework={items.length > 0} />}
      </Panel>
    </StudentPortal>
  );
}
