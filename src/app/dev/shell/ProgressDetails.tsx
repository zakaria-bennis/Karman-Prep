"use client";

// What stands behind each number, for the span chosen on its page (founder, 2026-11-16: "execute on
// all those ideas"). One or two panes of glass per number:
//   time        where the time went, by section and by domain (never by skill, never by kind of
//               work), the days of the week it went on, and the average day.
//   questions   by domain and by kind of work, each with right against missed; the hardest level met.
//   skills      the Library's rings for both sides; the skills gained in the span and any that
//               slipped. Each opens in the Library.
//   exams       every exam as a row, with its sections and the change from the one before; the exams
//               left in the plan; a button to start the next.
//   pace        right against missed answers, and the skills answered slowest.
//   accuracy    by domain and by difficulty level; the skills missed most, each with Start skill set.
//   days        the whole year as a grid of small squares; streaks; the strongest day of the week.
// Bands and bars are the Library's one green. Every figure is a stand-in (progressBreakdowns.ts).
import { type CSSProperties, type ReactNode } from "react";
import { ringOf, tally } from "./Library";
import lib from "./library.module.css";
import { GoButton } from "./practice";
import {
  LEVEL_COUNT,
  PACE_PARTS,
  accuracyByDomain,
  accuracyByLevel,
  byDomain,
  byMode,
  byWeekday,
  examRows,
  examsInPlan,
  gained,
  hardestLevel,
  longestStreak,
  mostMissed,
  paceOf,
  skillsOf,
  slipped,
  slowest,
  type DomainPart,
  type Found,
  type PacePart,
} from "./progressBreakdowns";
import { dateOf, short, streak, type DayLog, type Student } from "./progressData";
import styles from "./progressDetails.module.css";
import type { Span } from "./ProgressGraph";
import { clock, minSec, type StatKey } from "./progressStats";
import { SECTIONS } from "./skills72";

function Pane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${lib.glass} ${styles.pane}`} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** A name, a band filled as far as its share, and its value. `right` cuts the band in two: the part
 *  answered right in the dark green, the part missed in the light. */
function Row({
  name,
  share,
  right,
  value,
}: {
  name: string;
  share: number;
  right?: number;
  value: string;
}) {
  return (
    <li className={styles.row}>
      <span>{name}</span>
      <span className={styles.band} aria-hidden="true">
        <i style={{ width: `${share * 100}%` }} data-cut={right !== undefined || undefined}>
          {right !== undefined && <b style={{ width: `${right * 100}%` }} />}
        </i>
      </span>
      <b>{value}</b>
    </li>
  );
}

/** The eight domains under their two sections, each section with its own total. */
function Domains({
  parts,
  show,
  right,
  average,
}: {
  parts: DomainPart[];
  show: (value: number) => string;
  /** The section's own figure is the average of its domains, not their sum (accuracy). */
  average?: boolean;
  right?: (part: DomainPart, i: number) => number;
}) {
  const most = Math.max(...parts.map((p) => p.value), 1);
  return (
    <>
      {SECTIONS.map((section) => {
        const mine = parts.filter((p) => p.section === section);
        return (
          <div key={section} className={styles.group}>
            <h3>
              {section}
              <b>
                {show(
                  Math.round(mine.reduce((n, p) => n + p.value, 0) / (average ? mine.length : 1))
                )}
              </b>
            </h3>
            <ul>
              {mine.map((p) => (
                <Row
                  key={p.name}
                  name={p.name}
                  share={p.value / most}
                  right={right?.(p, parts.indexOf(p))}
                  value={show(p.value)}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/** Upright bars to compare a few things: the tallest in the dark green. */
function Bars({ bars }: { bars: { name: string; value: number; said: string }[] }) {
  const most = Math.max(...bars.map((b) => b.value), 1);
  return (
    <ol className={styles.bars} style={{ "--n": bars.length } as CSSProperties}>
      {bars.map((bar) => (
        <li key={bar.name} data-top={bar.value === most || undefined}>
          <b>{bar.said}</b>
          <i style={{ height: `${Math.max(4, (bar.value / most) * 100)}%` }} />
          <span>{bar.name}</span>
        </li>
      ))}
    </ol>
  );
}

/** A big figure over what it counts. */
function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.fact}>
      <b>{value}</b>
      {label}
    </div>
  );
}

/** A skill that opens in the Library, with a figure about it. */
function SkillRow({
  found,
  value,
  onSkill,
}: {
  found: Found;
  value: string;
  onSkill: (found: Found) => void;
}) {
  return (
    <li>
      <button type="button" className={styles.skill} onClick={() => onSkill(found)}>
        <span>
          {found.skill.name}
          <small>{found.domain}</small>
        </span>
        <b>{value}</b>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
        </svg>
      </button>
    </li>
  );
}

export default function Details({
  stat,
  student,
  logs,
  book,
  from,
  span,
  part,
  goal,
  onSkill,
}: {
  stat: StatKey;
  student: Student;
  logs: DayLog[];
  book: Record<StatKey, number[]>;
  from: number;
  span: Span;
  part: PacePart;
  goal: number | null;
  onSkill: (found: Found) => void;
}) {
  const to = student.days;
  const inSpan = (key: StatKey) => book[key][to] - (from > 0 ? book[key][from] : 0);
  const accuracy = book.accuracy[to];
  const weekdays = byWeekday(student, logs, from, (day) => dateOf(student, day).getDay());

  if (stat === "time") {
    const minutes = inSpan("time");
    const practiced = Math.max(1, inSpan("days"));
    return (
      <>
        <Pane title="Where the time went">
          <Domains parts={byDomain(minutes)} show={clock} />
        </Pane>
        <Pane title="The days it went on">
          <Bars
            bars={weekdays.map((d) => ({
              name: d.name.slice(0, 3),
              value: d.minutes,
              said: d.minutes >= 60 ? `${Math.round(d.minutes / 60)}h` : `${d.minutes}m`,
            }))}
          />
          <Fact
            value={clock(Math.round(minutes / practiced))}
            label="on an average day of practice"
          />
        </Pane>
      </>
    );
  }

  if (stat === "questions") {
    const asked = inSpan("questions");
    const lean = accuracyByDomain(accuracy);
    const kinds = byMode(asked, inSpan("exams"), accuracy);
    const most = Math.max(...kinds.map((k) => k.asked), 1);
    return (
      <>
        <Pane title="Right and missed, by domain">
          <Domains
            parts={byDomain(asked)}
            show={(n) => n.toLocaleString("en-US")}
            right={(_, i) => lean[i].value / 100}
          />
        </Pane>
        <Pane title="Where they came from">
          <ul className={styles.rows}>
            {kinds.map((kind) => (
              <Row
                key={kind.name}
                name={kind.name}
                share={kind.asked / most}
                right={kind.right / kind.asked}
                value={kind.asked.toLocaleString("en-US")}
              />
            ))}
          </ul>
          <Fact
            value={`Level ${hardestLevel(student)}`}
            label={`of ${LEVEL_COUNT}, the hardest you have met`}
          />
        </Pane>
      </>
    );
  }

  if (stat === "skills") {
    const fresh = gained(inSpan("skills"));
    const back = slipped(Math.min(span.days, to));
    return (
      <>
        <Pane title="Both sides">
          <div className={styles.rings}>
            {SECTIONS.map((section) => {
              const skills = skillsOf(section);
              const counts = tally(skills);
              return (
                <div key={section}>
                  <div
                    className={lib.ring}
                    role="img"
                    aria-label={`${counts[3]} of ${skills.length}`}
                  >
                    <i style={{ background: ringOf(counts) }} />
                    <p>
                      <b>{counts[3]}</b>
                      of {skills.length}
                    </p>
                  </div>
                  <h3>{section}</h3>
                </div>
              );
            })}
          </div>
        </Pane>
        <Pane
          title={span.days === Infinity ? "Latest to reach Proficient" : `Gained, ${span.said}`}
        >
          {fresh.length ? (
            <ul className={styles.rows}>
              {fresh.map((f) => (
                <SkillRow key={f.skill.name} found={f} value="Proficient" onSkill={onSkill} />
              ))}
            </ul>
          ) : (
            <p className={styles.quiet}>None in this span.</p>
          )}
          {back.length > 0 && (
            <>
              <h3 className={styles.sub}>Slipped back</h3>
              <ul className={styles.rows}>
                {back.map((f) => (
                  <SkillRow key={f.skill.name} found={f} value="Understanding" onSkill={onSkill} />
                ))}
              </ul>
            </>
          )}
        </Pane>
      </>
    );
  }

  if (stat === "exams") {
    const rows = examRows(student);
    const plan = examsInPlan(student);
    return (
      <Pane title="Your exams">
        <ol className={styles.exams}>
          {rows.map((row) => (
            <li key={row.number}>
              <span>Full-length exam {row.number}</span>
              <span className={styles.parts}>
                {short(dateOf(student, row.day))}
                <span>
                  Reading and Writing <b>{row.rw}</b>
                </span>
                <span>
                  Math <b>{row.math}</b>
                </span>
              </span>
              <b className={styles.examTotal}>{row.total}</b>
              {/* its place is kept on the first exam, which has nothing before it to compare with */}
              <b
                className={styles.moved}
                data-way={
                  row.moved === null || row.moved === 0 ? "flat" : row.moved > 0 ? "up" : "down"
                }
              >
                {row.moved === null
                  ? ""
                  : `${row.moved > 0 ? "+" : row.moved < 0 ? "−" : ""}${Math.abs(row.moved)}`}
              </b>
            </li>
          ))}
        </ol>
        <div className={styles.left}>
          <p>
            <b>{plan - rows.length}</b> of {plan} left in your plan
          </p>
          <span
            className={styles.slots}
            style={{ "--n": plan } as CSSProperties}
            aria-hidden="true"
          >
            {Array.from({ length: plan }, (_, i) => (
              <i key={i} data-on={i < rows.length || undefined} />
            ))}
          </span>
        </div>
        {rows.length < plan && <GoButton wide>Start full-length exam {rows.length + 1}</GoButton>}
      </Pane>
    );
  }

  if (stat === "pace") {
    const pace = paceOf(book.pace, part)[to];
    const slow = slowest(
      pace,
      part === "all" ? undefined : part === "rw" ? SECTIONS[0] : SECTIONS[1]
    );
    return (
      <>
        <Pane
          title={
            part === "all" ? "Right against missed" : `Right against missed, ${PACE_PARTS[part]}`
          }
        >
          <div className={styles.facts}>
            <Fact value={minSec(pace - 6)} label="on answers you got right" />
            <Fact value={minSec(pace + 19)} label="on answers you missed" />
          </div>
          <p className={styles.quiet}>Your goal is {minSec(goal ?? 0)} a question.</p>
        </Pane>
        <Pane title="Where you are slowest">
          <ul className={styles.rows}>
            {slow.map((f) => (
              <SkillRow key={f.skill.name} found={f} value={minSec(f.pace)} onSkill={onSkill} />
            ))}
          </ul>
        </Pane>
      </>
    );
  }

  if (stat === "accuracy") {
    const levels = accuracyByLevel(accuracy);
    return (
      <>
        <Pane title="By domain">
          <Domains parts={accuracyByDomain(accuracy)} show={(n) => `${n}%`} average />
        </Pane>
        <Pane title="By difficulty">
          <Bars
            bars={levels.map((value, i) => ({ name: String(i + 1), value, said: `${value}%` }))}
          />
        </Pane>
        <Pane title="Missed most">
          <ul className={styles.rows}>
            {mostMissed().map((f) => (
              <SkillRow key={f.skill.name} found={f} value={`${f.accuracy}%`} onSkill={onSkill} />
            ))}
          </ul>
        </Pane>
      </>
    );
  }

  // days practiced: the last year, a column a week, today at the foot of the last column
  const lastColumn = dateOf(student, to).getDay();
  const cells = Array.from({ length: 52 * 7 + lastColumn + 1 }, (_, i) => {
    const day = to - (52 * 7 + lastColumn - i);
    const done = day < 0 ? -1 : logs[day].questions;
    return done < 0 ? -1 : done === 0 ? 0 : done <= 18 ? 1 : done <= 36 ? 2 : 3;
  });
  const best = [...weekdays].sort((a, b) => b.practiced - a.practiced)[0];
  return (
    <>
      <Pane title="The last year">
        <div className={styles.year} role="img" aria-label={`${book.days[to]} days practiced`}>
          {cells.map((level, i) => (
            <i
              key={i}
              data-level={level < 0 ? undefined : level}
              data-out={level < 0 || undefined}
            />
          ))}
        </div>
      </Pane>
      <Pane title="Streaks">
        <div className={styles.facts}>
          <Fact value={String(streak(logs))} label="days in a row now" />
          <Fact value={String(longestStreak(logs))} label="days, your longest run" />
        </div>
        <Fact value={`${best.name}s`} label="the day you practice most" />
      </Pane>
    </>
  );
}
