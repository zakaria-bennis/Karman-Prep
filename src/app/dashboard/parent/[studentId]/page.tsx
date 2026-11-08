// ============================================================
// /dashboard/parent/[studentId] — the child's week at a glance:
// homework done and late, time practiced, the next sessions, the
// predicted score and the guarantee. Counts only, never questions.
// ============================================================

import type { Metadata } from "next";
import { Card, Cta, MoreLink, Num, Panel, Ring, Row, SectionHeader, TutorNote } from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { GuaranteeCard, sessionWhen } from "@/components/parent/parts";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Week" };
export const dynamic = "force-dynamic";

export default async function ParentWeekPage({ params }: { params: Promise<{ studentId: string }> }) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const week = await loadChildWeek(child);
  const base = `/dashboard/parent/${child.id}`;
  const hw = week.homework;
  const total = hw.done + hw.open.length;

  const side = (
    <>
      {week.guarantee && <GuaranteeCard status={week.guarantee} childName={child.firstName} />}
      <Card>
        <SectionHeader title="Predicted score" />
        {week.score.current !== null ? (
          <>
            <Num big>{week.score.current}</Num>
            <p className="kp-meta">From {child.firstName}&rsquo;s latest full measure.</p>
          </>
        ) : (
          <p className="kp-meta">Shows after {child.firstName}&rsquo;s first full practice test.</p>
        )}
        <MoreLink href={`${base}/progress`}>Progress and skills</MoreLink>
      </Card>
      {week.tutorNote && (
        <Card>
          <SectionHeader title="From the tutor" />
          <TutorNote from={week.tutorNote.from ?? "Your tutor"}>{week.tutorNote.body}</TutorNote>
        </Card>
      )}
    </>
  );

  return (
    <ParentShell ctx={ctx} child={child} title={`${child.firstName}'s week`}>
      <Panel side={side}>
        <section aria-labelledby="week-main">
          <h2 className="kp-title" id="week-main">
            {hw.late
              ? `${hw.late} ${hw.late === 1 ? "piece" : "pieces"} of homework past due`
              : total
                ? `${hw.done} of ${total} homework done`
                : "No homework set yet"}
          </h2>
          <p className="kp-meta">
            <Num>{week.minutesThisWeek}</Num> minutes of practice in the last 7 days.
          </p>
          <Cta href={`${base}/recap`}>Preview this week&rsquo;s email</Cta>
        </section>
        <Card tone={hw.late ? "late" : undefined}>
          <SectionHeader title="Homework" note={total ? <Num>{total}</Num> : undefined} />
          <div className="kp-ring-row">
            <Ring value={total ? hw.done / total : 0} label={`Homework: ${hw.done} of ${total} done`}>
              <Num>{hw.done}</Num>
            </Ring>
            <span className="kp-meta">
              <Num>{hw.done}</Num> done, <Num>{hw.late}</Num> late, <Num>{hw.dueThisWeek}</Num> due this week
            </span>
          </div>
          {hw.open.slice(0, 4).map((h) => (
            <Row
              key={`${h.title}-${h.dueOn}`}
              title={h.title}
              right={h.late ? "Past due" : `Due ${sessionWhen(`${h.dueOn}T12:00:00Z`, { date: true })}`}
              rightTone={h.late ? "late" : undefined}
            />
          ))}
        </Card>
        <Card>
          <SectionHeader title="Next sessions" />
          {week.upcoming.length ? (
            week.upcoming
              .slice(0, 3)
              .map((s) => (
                <Row
                  key={s.id}
                  title={s.kind === "1:1" ? `1:1${s.with ? ` with ${s.with}` : ""}` : `Cohort class${s.with ? ` with ${s.with}` : ""}`}
                  right={sessionWhen(s.startsAt)}
                />
              ))
          ) : (
            <p className="kp-meta">No sessions booked.</p>
          )}
          <MoreLink href={`${base}/sessions`}>Sessions and recordings</MoreLink>
        </Card>
      </Panel>
    </ParentShell>
  );
}
