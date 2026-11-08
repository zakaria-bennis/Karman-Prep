// ============================================================
// /dashboard/parent/[studentId]/sessions — booked sessions (each
// with a Join button for its Zoom meeting at session time), past
// sessions with their recordings, and the family calendar feed.
// ============================================================

import type { Metadata } from "next";
import { Card, Panel, Row, SectionHeader } from "@/components/portal";
import { CalendarSubscribe } from "@/components/dashboard/CalendarSubscribe";
import { ParentShell } from "@/components/parent/ParentShell";
import { sessionWhen } from "@/components/parent/parts";
import { JoinButton } from "@/components/portal-extras/JoinButton";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Sessions" };
export const dynamic = "force-dynamic";

function who(s: { kind: string; with: string | null }) {
  return `${s.kind === "1:1" ? "1:1" : "Cohort class"}${s.with ? ` with ${s.with}` : ""}`;
}

export default async function ParentSessionsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const week = await loadChildWeek(child);
  const recorded = week.past.filter((s) => s.recordingUrl);

  return (
    <ParentShell ctx={ctx} child={child} title="Sessions">
      <Panel
        side={
          !ctx.isAdmin ? (
            <Card>
              <CalendarSubscribe audience="parent" />
            </Card>
          ) : undefined
        }
      >
        <Card>
          <SectionHeader title="Coming up" />
          {week.upcoming.length ? (
            week.upcoming.map((s) => (
              <Row
                key={s.id}
                title={who(s)}
                right={
                  <>
                    {sessionWhen(s.startsAt)}
                    {s.joinUrl && (
                      <JoinButton joinUrl={s.joinUrl} startsAt={s.startsAt} endsAt={s.endsAt} />
                    )}
                  </>
                }
              />
            ))
          ) : (
            <p className="kp-meta">Nothing booked right now.</p>
          )}
        </Card>
        <Card>
          <SectionHeader title="Recordings" />
          {recorded.length ? (
            recorded.map((s) => (
              <p key={s.id} className="kp-row">
                <span>
                  <b>{who(s)}</b>
                  <small>{sessionWhen(s.startsAt)}</small>
                </span>
                <a
                  className="kp-link"
                  href={s.recordingUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch
                </a>
              </p>
            ))
          ) : (
            <p className="kp-meta">Recordings appear here after each session that was recorded.</p>
          )}
        </Card>
        <Card>
          <SectionHeader title="Past sessions" />
          {week.past.length ? (
            week.past
              .slice(0, 8)
              .map((s) => (
                <Row
                  key={s.id}
                  title={who(s)}
                  right={
                    s.status === "completed"
                      ? "Attended"
                      : s.status === "no_show"
                        ? "Missed"
                        : "Held"
                  }
                  sub={sessionWhen(s.startsAt)}
                />
              ))
          ) : (
            <p className="kp-meta">No sessions yet.</p>
          )}
        </Card>
      </Panel>
    </ParentShell>
  );
}
