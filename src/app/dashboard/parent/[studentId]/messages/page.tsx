// ============================================================
// /dashboard/parent/[studentId]/messages — the parent's inbox
// (founder, 2026-11-12): the tutor's notes, newest first, each
// with that week's practice so one session's note can be compared
// with the last, and one conversation with the Karman Prep team for
// questions and requests (miss a class, move a session, book a 1:1).
// Messages land in the team's inbox in admin; no email or text.
// ============================================================

import type { Metadata } from "next";
import { Card, Cta, Num, Panel, SectionHeader } from "@/components/portal";
import { Thread, when } from "@/components/messages/Thread";
import { ParentShell } from "@/components/parent/ParentShell";
import { sessionWhen } from "@/components/parent/parts";
import { ActionMessage } from "@/components/school/SchoolShell";
import { loadFamilyThread, loadNoteTimeline, markStaffRead } from "@/lib/parent/messages";
import {
  changeLabel,
  KIND_HINT,
  KIND_LABEL,
  MESSAGE_KINDS,
  NEEDS_SESSION,
  type MessageKind,
  type WeekStats,
} from "@/lib/parent/messages-model";
import { requireChild, requireParentContext, sessionsFor } from "@/lib/parent/server";
import { untypedAdmin } from "@/lib/school/db";
import { sendFamilyMessageAction } from "../../actions";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

function Stats({ week, before }: { week: WeekStats; before?: WeekStats | null }) {
  const diff = (a: number | null, b: number | null | undefined, unit: string) => {
    if (a === null || b === null || b === undefined) return null;
    const n = a - b;
    return (
      <small data-dir={n > 0 ? "up" : n < 0 ? "down" : undefined}>
        {changeLabel(n, unit).trim()}
      </small>
    );
  };
  return (
    <dl className="kp-weekstats">
      <div>
        <dt>Questions</dt>
        <dd>
          <Num>{week.answered}</Num>
          {before && diff(week.answered, before.answered, "")}
        </dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>
          {week.accuracy === null ? "—" : <Num>{`${week.accuracy}%`}</Num>}
          {before && diff(week.accuracy, before.accuracy, "pts")}
        </dd>
      </div>
      <div>
        <dt>Skills</dt>
        <dd>
          <Num>{week.skills}</Num>
        </dd>
      </div>
      <div>
        <dt>Days active</dt>
        <dd>
          <Num>{week.activeDays}</Num>
          <small>of 7</small>
        </dd>
      </div>
    </dl>
  );
}

export default async function ParentMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ done?: string; error?: string; kind?: string; session?: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const { done, error, kind: kindParam, session: sessionParam } = await searchParams;
  const now = new Date();
  const [thread, timeline, sessions] = await Promise.all([
    loadFamilyThread(ctx.viewer.userId, child.id),
    loadNoteTimeline(child, now),
    sessionsFor(untypedAdmin(), child, now),
  ]);
  if (thread.some((m) => m.from === "staff" && !m.readAt)) {
    await markStaffRead(ctx.viewer.userId, child.id).catch(() => undefined);
  }
  const kind: MessageKind = (MESSAGE_KINDS as readonly string[]).includes(kindParam ?? "")
    ? (kindParam as MessageKind)
    : "message";
  const upcoming = sessions.upcoming.slice(0, 12);
  const pickedSession = upcoming.some((s) => s.id === sessionParam) ? sessionParam : undefined;
  const base = `/dashboard/parent/${child.id}`;
  const { notes, thisWeek, lastWeek } = timeline;
  const canWrite = !ctx.isAdmin || ctx.children.some((c) => c.id === child.id);

  const side = (
    <>
      <Card label="This week">
        <SectionHeader title="This week" note="last 7 days" />
        <Stats week={thisWeek} before={lastWeek} />
        <p className="kp-meta">Compared with the 7 days before.</p>
      </Card>
      <Card label="Quick requests">
        <SectionHeader title="Need something?" />
        {(["miss_class", "move_session", "book_session"] as const).map((k) => (
          <p key={k} style={{ margin: "6px 0" }}>
            <a className="kp-link" href={`${base}/messages?kind=${k}#write`}>
              {KIND_LABEL[k]}
            </a>
          </p>
        ))}
      </Card>
    </>
  );

  return (
    <ParentShell ctx={ctx} child={child} title="Messages">
      <Panel side={side}>
        <ActionMessage done={done} error={error} />
        <Card label="Notes from the tutor">
          <SectionHeader
            title="Notes from the tutor"
            note={notes.length ? <Num>{notes.length}</Num> : undefined}
          />
          {notes.length ? (
            <ol className="kp-notes">
              {notes.map((n, i) => (
                <li key={n.id}>
                  <div className="kp-note-head">
                    <b>{n.from ?? "Your tutor"}</b>
                    <time dateTime={n.at}>{when(n.at)}</time>
                  </div>
                  <p className="kp-note-body">{n.body}</p>
                  <Stats week={n.week} before={notes[i + 1]?.week ?? null} />
                  <p className="kp-meta" style={{ margin: 0 }}>
                    {child.firstName}&rsquo;s practice in the 7 days before this note
                    {notes[i + 1] ? ", next to the note before it." : "."}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="kp-meta">
              After each session, {child.firstName}&rsquo;s tutor leaves a note here, with a look at
              that week&rsquo;s practice.
            </p>
          )}
        </Card>

        <Card label="Conversation with Karman Prep" id="write">
          <SectionHeader title="Karman Prep team" />
          {thread.length ? (
            <Thread messages={thread} mine="parent" />
          ) : (
            <p className="kp-meta">
              Questions about {child.firstName}&rsquo;s prep, a class to miss, a session to move:
              write to us here and we&rsquo;ll answer here.
            </p>
          )}
          {canWrite ? (
            <form action={sendFamilyMessageAction} className="kp-form" style={{ marginTop: 16 }}>
              <input type="hidden" name="studentId" value={child.id} />
              <label className="kp-field">
                <span>What is it about?</span>
                <select name="kind" className="kp-select" defaultValue={kind}>
                  {MESSAGE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <small>{KIND_HINT[kind]}</small>
              </label>
              {upcoming.length > 0 && (
                <label className="kp-field">
                  <span>Which session?</span>
                  <small>
                    {NEEDS_SESSION.has(kind)
                      ? "Pick the one your student will miss or wants to move."
                      : "Only for missing or moving a session."}
                  </small>
                  <select name="sessionId" className="kp-select" defaultValue={pickedSession ?? ""}>
                    <option value="">Pick a session</option>
                    {upcoming.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.kind}
                        {s.with ? ` with ${s.with}` : ""}, {sessionWhen(s.startsAt)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="kp-field">
                <span>Message</span>
                <textarea
                  name="body"
                  className="kp-input kp-textarea"
                  maxLength={4000}
                  required
                  placeholder={
                    kind === "book_session"
                      ? "Weekday evenings after 6 work best for us."
                      : kind === "message"
                        ? `Hi, a question about ${child.firstName}'s plan…`
                        : "A few words on why, and what would work instead."
                  }
                />
              </label>
              <div className="kp-actions-row">
                <Cta type="submit">Send to Karman Prep</Cta>
                <span className="kp-meta">We usually answer within a day.</span>
              </div>
            </form>
          ) : (
            <p className="kp-meta">You&rsquo;re viewing as an admin. Answer from the team inbox.</p>
          )}
        </Card>
      </Panel>
    </ParentShell>
  );
}
