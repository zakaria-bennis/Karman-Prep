/*
 * The Homework page's cards (founder decisions 2026-11-07, prototype 2026-11-08): open work in
 * Canvas-style lists, the week at a glance as a ring, and finished work with its result and a
 * one-line note signed David. Server-safe: no hooks.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, MoreLink, Num, Ring, SectionHeader } from "@/components/portal";
import {
  GROUP_TITLES,
  dueText,
  formatMinutes,
  lateNudge,
  resultText,
  sizeText,
  type HomeworkGroup,
  type StudentHomeworkItem,
} from "@/lib/student/homework-model";
import { NOTE_AUTHOR, homeworkNote } from "@/lib/student/homework-notes";
import styles from "./homework.module.css";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });

/** One line in a list, with an optional note under it. A link when it can open. */
function HomeworkRow({
  title,
  sub,
  note,
  right,
  late,
  href,
}: {
  title: string;
  sub?: string | null;
  note?: { text: string; from: string } | null;
  right: ReactNode;
  late?: boolean;
  href?: string | null;
}) {
  const body = (
    <>
      <span>
        <b>{title}</b>
        {sub && <small>{sub}</small>}
        {note && (
          <em className={styles.note}>
            {note.text} <span>{note.from}</span>
          </em>
        )}
      </span>
      <span className={styles.right} data-tone={late ? "late" : undefined}>
        {right}
      </span>
    </>
  );
  return href ? (
    <Link className={`kp-row ${styles.row}`} href={href}>
      {body}
    </Link>
  ) : (
    <div className={`kp-row ${styles.row}`}>{body}</div>
  );
}

/** One list of unfinished work: Past due, Tonight, Tomorrow, This week or Later. */
export function HomeworkGroupCard({
  group,
  items,
  paceSeconds,
  nowMs,
}: {
  group: HomeworkGroup;
  items: StudentHomeworkItem[];
  paceSeconds: number;
  nowMs: number;
}) {
  const nudge = group === "past" ? lateNudge(items.length) : null;
  return (
    <Card tone={group === "past" ? "late" : undefined} label={GROUP_TITLES[group]}>
      <SectionHeader title={GROUP_TITLES[group]} note={<Num>{items.length}</Num>} />
      {items.map((item) => {
        const due = dueText(item, nowMs);
        return (
          <HomeworkRow
            key={item.key}
            title={item.title}
            sub={sizeText(item.size, paceSeconds)}
            note={item.note ? { text: item.note, from: item.from ?? "Your tutor" } : null}
            right={due.text}
            late={due.late}
            href={item.href}
          />
        );
      })}
      {nudge && <p className={styles.nudge}>{nudge}</p>}
    </Card>
  );
}

/** Done work: the result, a note signed David, and the review when one exists. */
export function DoneCard({
  items,
  total,
  paceSeconds,
}: {
  items: StudentHomeworkItem[];
  total: number;
  paceSeconds: number;
}) {
  return (
    <Card label="Done">
      <SectionHeader title="Done" note={<Num>{total}</Num>} />
      {items.map((item) => (
        <HomeworkRow
          key={item.key}
          title={item.title}
          sub={item.result ? resultText(item.result) : "Done"}
          note={{
            text: homeworkNote({
              key: item.key,
              correct: item.result?.correct,
              total: item.result?.total,
              seconds: item.result?.seconds,
              paceSeconds,
              timed: !!item.size?.timedMinutes,
            }),
            from: NOTE_AUTHOR,
          }}
          right={item.completedAt ? shortDate(item.completedAt) : ""}
          href={item.result?.reviewHref}
        />
      ))}
    </Card>
  );
}

/** The week at a glance: assigned, done, time left, and a ring for done of assigned. */
export function WeekCard({
  assigned,
  done,
  minutesLeft,
}: {
  assigned: number;
  done: number;
  minutesLeft: number;
}) {
  return (
    <Card label="Your week">
      <SectionHeader title="Your week" />
      <div className={styles.week}>
        <div className={styles.stat}>
          <b>{assigned}</b>
          <span>assigned</span>
        </div>
        <div className={styles.stat}>
          <b>{done}</b>
          <span>done</span>
        </div>
        <div className={styles.stat}>
          <b>{minutesLeft > 0 ? `about ${formatMinutes(minutesLeft)}` : "nothing"}</b>
          <span>left to do</span>
        </div>
        <Ring
          value={assigned ? done / assigned : 0}
          label={assigned ? `${done} of ${assigned} done this week` : "Nothing is due this week"}
          size={52}
        >
          <Num>
            {done}/{assigned}
          </Num>
        </Ring>
      </div>
    </Card>
  );
}

/** Nothing open: a calm line and the way to the Library. */
export function CaughtUpCard({ anyHomework }: { anyHomework: boolean }) {
  return (
    <Card label={anyHomework ? "All caught up" : "Nothing assigned"}>
      <SectionHeader title={anyHomework ? "All caught up" : "Nothing assigned yet"} />
      <p className={styles.calm}>
        {anyHomework
          ? "Nothing is open right now. New work from your tutor shows up here with its due date."
          : "When your tutor assigns work, it shows up here with its due date."}
      </p>
      <MoreLink href="/dashboard/student/library">Practice in the Library</MoreLink>
    </Card>
  );
}
